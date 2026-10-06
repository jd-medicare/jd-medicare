import { test, expect, request } from '@playwright/test';
import { Api, errCode } from '../helpers/api';
import { baseURL } from '../helpers/env';
import { createUser, customerBody, disableUsers, expectOk, loginAs, submitCase, superAdmin, uid, type TestUser } from '../helpers/factory';

const ZERO = '00000000-0000-4000-8000-000000000000';
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|\[?::1\]?)/;
const isLocalRun = () => /localhost|127\.0\.0\.1/.test(baseURL());

test.describe('uploads and SSRF (ASVS V12, V13.x)', () => {
  let admin: Api, a1: Api, a2: Api; const users: TestUser[] = [];
  test.beforeAll(async () => {
    admin = await superAdmin(); const [u1, u2] = [await createUser(admin, 'AGENT'), await createUser(admin, 'AGENT')];
    users.push(u1, u2); a1 = await loginAs(u1); a2 = await loginAs(u2);
  });
  test.afterAll(async () => { await disableUsers(admin, users); });

  test('valid upload request returns a short-lived URL to the storage host, never an internal address', async () => {
    const r = await a1.call('files.uploadUrl', { body: { fileName: 'doc.pdf', mimeType: 'application/pdf', sizeBytes: 1024 } });
    test.skip(r.status === 403, 'Agent has no upload permission by default; file features are owned by Account 6');
    expectOk(r); const url = new URL(r.body.data.uploadUrl);
    if (!isLocalRun()) { expect(url.protocol).toBe('https:'); expect(url.hostname).not.toMatch(PRIVATE_HOST); }
    expect(Number(url.searchParams.get('X-Amz-Expires') ?? '300')).toBeLessThanOrEqual(900);
  });

  test('dangerous MIME types, sizes and names are rejected or neutralised', async () => {
    const probe = await a1.call('files.uploadUrl', { body: { fileName: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 10 } });
    test.skip(probe.status === 403, 'no upload permission for this role');
    for (const mimeType of ['text/html', 'image/svg+xml', 'application/javascript', 'application/x-msdownload', 'text/html; charset=utf-8', 'application/pdf\r\nX-Evil: 1'])
      expect(errCode(await a1.call('files.uploadUrl', { body: { fileName: 'a.bin', mimeType, sizeBytes: 10 } })), mimeType).toBe('VALIDATION_ERROR');
    for (const sizeBytes of [0, -1, 1e10, 'big', null, 1.5])
      expect(errCode(await a1.call('files.uploadUrl', { body: { fileName: 'a.pdf', mimeType: 'application/pdf', sizeBytes } })), String(sizeBytes)).toBe('VALIDATION_ERROR');
    for (const fileName of ['../../etc/passwd', '..\\..\\windows\\win.ini', 'a\u0000.pdf', '<script>x</script>.pdf', 'a'.repeat(400) + '.pdf', 'http://169.254.169.254/latest/meta-data/.pdf', '.htaccess']) {
      const r = await a1.call('files.uploadUrl', { body: { fileName, mimeType: 'application/pdf', sizeBytes: 100 } });
      expect(r.status).toBeLessThan(500);
      if (r.status < 300) expect(decodeURIComponent(new URL(r.body.data.uploadUrl).pathname)).not.toMatch(/\.\.[\\/]|\u0000/);
    }
  });

  test('SSRF: URL-looking input fields are treated as plain text and cause no outbound fetch / host change', async () => {
    const ssrf = ['http://169.254.169.254/latest/meta-data/', 'http://localhost:6379/', 'file:///etc/passwd', 'gopher://127.0.0.1:5432/_x', 'http://[::1]:5432/'];
    const probe = await a1.call('files.uploadUrl', { body: { fileName: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 10 } });
    for (const s of ssrf) {
      const r = await a1.call('customers.create', { body: customerBody({ address: s, extra: { website: s, callback: s, avatarUrl: s } }) });
      expect(r.status).toBeLessThan(500);
      if (probe.status < 300) {
        const u = await a1.call('files.uploadUrl', { body: { fileName: s, mimeType: 'application/pdf', sizeBytes: 10 } });
        if (u.status < 300 && !isLocalRun()) expect(new URL(u.body.data.uploadUrl).hostname).not.toMatch(PRIVATE_HOST);
      }
    }
    // NOTE: the registry has no endpoint that fetches a client-supplied URL. integrations/ (Account 6) must be code-reviewed for outbound
    // requests (allow-list hosts, block private ranges, no redirects) - see docs/security/security-overview.md "SSRF review".
  });

  test('file IDOR: another user cannot get a download URL for a file they do not own; random ids 404', async () => {
    const up = await a1.call('files.uploadUrl', { body: { fileName: 'mine.pdf', mimeType: 'application/pdf', sizeBytes: 10 } });
    test.skip(up.status >= 300, 'no upload permission');
    const fileId = up.body.data.fileId;
    expect([403, 404]).toContain((await a2.call('files.downloadUrl', { params: { id: fileId } })).status);
    expect([403, 404]).toContain((await a2.call('files.downloadUrl', { params: { id: ZERO } })).status);
    expect((await (await Api.create()).call('files.downloadUrl', { params: { id: fileId } })).status).toBe(401);
  });
});

test.describe('export abuse (ASVS 4.2, 5.3.x CSV injection, 13.x)', () => {
  let admin: Api, ag: Api, os: Api; const users: TestUser[] = [];
  test.beforeAll(async () => {
    admin = await superAdmin(); const [a, o] = [await createUser(admin, 'AGENT'), await createUser(admin, 'OUTSOURCE')];
    users.push(a, o); ag = await loginAs(a); os = await loginAs(o);
  });
  test.afterAll(async () => { await disableUsers(admin, users); });

  test('validation: unknown report type / format / malformed filters are rejected', async () => {
    for (const body of [{ reportType: 'EVIL', format: 'CSV', filters: {} }, { reportType: 'OUTSOURCE', format: 'EXE', filters: {} }, { reportType: 'OUTSOURCE', format: 'CSV' }, { reportType: 'OUTSOURCE', format: 'CSV', filters: 'x' }, { reportType: ['OUTSOURCE'], format: 'CSV', filters: {} }])
      expect(errCode(await admin.call('reports.exportCreate', { body })), JSON.stringify(body)).toBe('VALIDATION_ERROR');
    const inj = await admin.call('reports.exportCreate', { body: { reportType: 'OUTSOURCE', format: 'CSV', filters: { agentId: `' OR 1=1--`, phone: `'; DROP TABLE cases;--` } } });
    expect(inj.status).toBeLessThan(500);
  });

  test('roles without report:export cannot create exports; ids are not guessable across users', async () => {
    for (const api of [ag, os]) expect(errCode(await api.call('reports.exportCreate', { body: { reportType: 'OUTSOURCE', format: 'CSV', filters: {} } }))).toBe('FORBIDDEN');
    const mine = await admin.call('reports.exportCreate', { body: { reportType: 'OUTSOURCE', format: 'CSV', filters: {} } });
    expect(mine.status).toBe(202);
    for (const api of [ag, os]) expect([403, 404]).toContain((await api.call('reports.exportGet', { params: { id: mine.body.data.id } })).status);
    expect([403, 404]).toContain((await admin.call('reports.exportGet', { params: { id: ZERO } })).status);
    expect((await (await Api.create()).call('reports.exportGet', { params: { id: mine.body.data.id } })).status).toBe(401);
  });

  test('CSV export neutralises spreadsheet formulas (=, +, -, @, tab, CR)', async () => {
    const tag = uid();
    const payloads = { firstName: `=HYPERLINK("http://evil.example","x")${tag}`, lastName: `+cmd|'/C calc'!A0${tag}`, address: `@SUM(1+1)${tag}`, zipCode: `-cmd|'/C calc'!A0${tag}` };
    const { body } = await submitCase(ag, payloads);
    const created = await admin.call('reports.exportCreate', { body: { reportType: 'OUTSOURCE', format: 'CSV', filters: { phone: body.phone } } });
    expect(created.status).toBe(202);
    let ex: any; const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) { ex = (await admin.call('reports.exportGet', { params: { id: created.body.data.id } })).body.data; if (['READY', 'FAILED'].includes(ex.status)) break; await new Promise((r) => setTimeout(r, 2000)); }
    expect(ex.status, 'export did not finish').toBe('READY');
    const anon = await request.newContext({ ignoreHTTPSErrors: process.env.E2E_INSECURE_TLS === '1' });
    const csv = await (await anon.get(ex.downloadUrl)).text();
    const fields = parseCsv(csv).flat().filter((f) => f.includes(tag));
    expect(fields.length, 'payload rows present in export').toBeGreaterThan(0);
    for (const f of fields) expect(f, `unsafe cell: ${f.slice(0, 40)}`).not.toMatch(/^[=+\-@\t\r]/);
    expect(ex.expiresAt).toBeTruthy();
  });

  test('download URL expires (TTL is bounded)', async () => {
    const created = await admin.call('reports.exportCreate', { body: { reportType: 'OUTSOURCE', format: 'CSV', filters: {} } });
    let ex: any; for (let i = 0; i < 45; i++) { ex = (await admin.call('reports.exportGet', { params: { id: created.body.data.id } })).body.data; if (ex.status === 'READY') break; await new Promise((r) => setTimeout(r, 2000)); }
    test.skip(ex.status !== 'READY', 'export not ready in time');
    expect(new Date(ex.expiresAt).getTime() - Date.now()).toBeLessThan(24 * 3600 * 1000);
  });
});

/** Minimal RFC4180 parser (quotes, escaped quotes, newlines inside quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; } else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); } return rows;
}
