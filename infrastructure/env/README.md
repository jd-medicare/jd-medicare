# Environment files
| File | Purpose |
|---|---|
| `.env.development.example` | local dev (compose deps + host-run api/web) |
| `.env.staging.example` | staging-like host |
| `.env.production.example` | production |
| `.env.backup.example` | backup/restore scripts (separate credentials) |

Create a real file with `node scripts/init-env.mjs <development|staging|production>`; real `.env.*` files are git-ignored.
Every variable is documented inline. See `docs/environment-setup.md` for rotation and secret-manager guidance.
