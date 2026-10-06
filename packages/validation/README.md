# @app/validation (Account 1)
zod schemas: common (uuid, list query), auth, users/audit. Other accounts add files only under `src/<their-module>/` (placeholders exist and are already exported from `src/index.ts`).
ASSUMPTIONS: password policy 12-128 chars with 3 of 4 classes; bodies are `.strict()` so unknown fields (e.g. `organizationId`) are rejected.
CHANGE_REQUESTS: none.
