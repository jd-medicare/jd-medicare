#!/usr/bin/env node
/** Creates infrastructure/env/.env.<name> from the example, filling generated secrets.
 *  usage: node scripts/init-env.mjs <development|staging|production> [--force]
 *  - GENERATE_ME            -> 48 hex chars (unique each)
 *  - GENERATE_ME_B64_32     -> base64 of 32 random bytes
 *  - __X_PASSWORD__ / __MINIO_ROOT_USER__ -> one consistent generated value per token (so DATABASE_URL matches POSTGRES_PASSWORD)
 *  SET_ME values are left for the operator and listed at the end. File mode 0600. */
import fs from 'node:fs';
import crypto from 'node:crypto';
const name = process.argv[2];
if (!['development', 'staging', 'production'].includes(name)) { console.error('usage: init-env.mjs <development|staging|production> [--force]'); process.exit(2); }
const src = `infrastructure/env/.env.${name}.example`, dst = `infrastructure/env/.env.${name}`;
if (fs.existsSync(dst) && !process.argv.includes('--force')) { console.error(`${dst} exists (use --force to overwrite)`); process.exit(1); }
const hex = (n = 24) => crypto.randomBytes(n).toString('hex');
const tokens = new Map();
let s = fs.readFileSync(src, 'utf8')
  .replace(/GENERATE_ME_B64_32/g, () => crypto.randomBytes(32).toString('base64'))
  .replace(/GENERATE_ME/g, () => hex())
  .replace(/__[A-Z_]+__/g, (t) => { if (!tokens.has(t)) tokens.set(t, t.includes('USER') ? `minio-${hex(4)}` : hex()); return tokens.get(t); });
fs.writeFileSync(dst, s, { mode: 0o600 });
const todo = s.split('\n').filter((l) => /SET_ME/.test(l) && !l.startsWith('#')).map((l) => l.split('=')[0]);
console.log(`wrote ${dst}`); if (todo.length) console.log('still to set by hand:\n  ' + todo.join('\n  '));
