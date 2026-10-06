#!/usr/bin/env node
/** Runs every node:test unit test under apps/api/src (no DB/Redis needed; *integration* tests are skipped). */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'apps/api');
const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (n === 'node_modules') continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.test\.ts$/.test(n) && !/integration/.test(n)) files.push(p);
  }
})(join(root, 'src'));
const r = spawnSync('npx', ['tsx', '--test', ...files], { cwd: root, stdio: 'inherit' });
process.exit(r.status ?? 1);
