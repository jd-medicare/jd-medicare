#!/usr/bin/env node
/**
 * PROVISIONAL check-contract.mjs
 * ------------------------------------------------------------------
 * The task said "paste the script from Part E exactly", but Part E was not
 * supplied to Account 5. This is a stand-in written from Part A only.
 * REPLACE THIS FILE with the Part E script at merge. See CHANGE_REQUESTS.md.
 *
 * Checks:
 *  1. api-registry.json matches the pinned canonical hash (trailing newlines ignored).
 *  2. Registry is well formed (unique keys, unique method+path, :param style).
 *  3. Backend controllers (apps/api/src/**\/*.controller.ts) expose no method+path
 *     that is absent from the registry. With --full, every registry entry must exist.
 *  4. Frontend/tests contain no hard-coded "/api/v1" URL strings and every
 *     route('key') literal exists in the registry.
 * Usage: node scripts/check-contract.mjs [--full]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const full = process.argv.includes('--full');
const errors = [];
const warns = [];
const CANONICAL_SHA256 = 'b872d75c745a2b576eab48979f77504c2abfdff22c70b6147fc6cecfc10be32b';

const regFile = path.join(root, 'packages/shared-types/api-registry.json');
if (!fs.existsSync(regFile)) {
  console.error('FAIL: packages/shared-types/api-registry.json missing');
  process.exit(1);
}
const raw = fs.readFileSync(regFile, 'utf8').replace(/\s+$/, '');
const sha = crypto.createHash('sha256').update(raw).digest('hex');
// canonical hash was computed over the file WITH one trailing newline; recompute the same way
const shaWithNl = crypto.createHash('sha256').update(raw + '\n').digest('hex');
if (shaWithNl !== CANONICAL_SHA256) errors.push(`registry hash mismatch (got ${shaWithNl}, expected ${CANONICAL_SHA256})`);

let registry = [];
try { registry = JSON.parse(raw); } catch (e) { errors.push('registry is not valid JSON: ' + e.message); }

const keys = new Set();
const pairs = new Set();
for (const r of registry) {
  if (keys.has(r.key)) errors.push(`duplicate key ${r.key}`);
  keys.add(r.key);
  const pair = `${r.method} ${r.path}`;
  if (pairs.has(pair)) errors.push(`duplicate method+path ${pair}`);
  pairs.add(pair);
  if (!/^\/[a-z0-9\-\/:A-Za-z]*$/.test(r.path) || r.path.startsWith('/api')) errors.push(`bad path ${r.path}`);
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method)) errors.push(`bad method ${r.method} for ${r.key}`);
}

const norm = (p) => '/' + p.split('/').filter(Boolean).map((s) => (s.startsWith(':') ? ':id' : s)).join('/');
const regSet = new Set(registry.map((r) => `${r.method} ${norm(r.path)}`));

function walk(dir, test, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '_stubs', '.git', 'build'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, test, out);
    else if (test(p)) out.push(p);
  }
  return out;
}

// --- backend controllers
const controllers = walk(path.join(root, 'apps/api/src'), (p) => p.endsWith('.controller.ts'));
const implemented = new Set();
const HEALTH = new Set(['/health', '/ready', '/live']);
for (const f of controllers) {
  const src = fs.readFileSync(f, 'utf8');
  const cm = src.match(/@Controller\(\s*(?:\{[^}]*path:\s*)?(?:['"`]([^'"`]*)['"`])?[^)]*\)/);
  if (!cm) { warns.push(`${path.relative(root, f)}: no @Controller found`); continue; }
  const base = cm[1] ?? '';
  const re = /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const p = norm(`${base}/${m[2] ?? ''}`);
    if (HEALTH.has(p)) continue;
    const id = `${m[1].toUpperCase()} ${p}`;
    implemented.add(id);
    if (!regSet.has(id)) errors.push(`${path.relative(root, f)}: ${id} is not in the registry`);
  }
}
if (full) for (const id of regSet) if (!implemented.has(id)) errors.push(`registry entry not implemented by any controller: ${id}`);
if (controllers.length === 0) warns.push('no controllers found (ok before merge; use --full at merge)');

// --- frontend + tests
const srcFiles = [
  ...walk(path.join(root, 'apps/web/src'), (p) => /\.(ts|tsx)$/.test(p)),
  ...walk(path.join(root, 'tests'), (p) => /\.(ts|tsx)$/.test(p)),
];
for (const f of srcFiles) {
  const rel = path.relative(root, f);
  if (rel.startsWith('tests/security') || rel.startsWith('tests/helpers')) { /* may build raw URLs deliberately */ }
  const src = fs.readFileSync(f, 'utf8');
  if (!rel.includes('tests/security') && /['"`]\/api\/v1[^'"`]*['"`]/.test(src)) errors.push(`${rel}: hard-coded /api/v1 URL string; use route(key, params)`);
  for (const m of src.matchAll(/\broute\(\s*['"`]([^'"`]+)['"`]/g)) if (!keys.has(m[1])) errors.push(`${rel}: unknown registry key '${m[1]}'`);
}

for (const w of warns) console.warn('WARN:', w);
if (errors.length) { for (const e of errors) console.error('FAIL:', e); process.exit(1); }
console.log(`OK: registry (${registry.length} routes), ${controllers.length} controllers, ${srcFiles.length} client files checked`);
