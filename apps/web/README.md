# apps/web

React + TS + Vite. All HTTP goes through `src/services/api-client.ts` using `route(key, params)`; feature services call `api.call('<registry key>', ...)` only. Responses are validated with zod (`src/schemas`). Cookie auth (`credentials: 'include'`); CSRF is fetched via `auth.csrf` and sent as `X-CSRF-Token` on non-GET calls. No tokens in localStorage.

Run: `pnpm --filter @app/web dev`. Mock mode: `VITE_USE_MOCK=true` (handlers in `src/services/mock`, keyed by registry key). Default is the real API.

## Registry keys called so far
| Key | Sends | Expects (`data`) |
|---|---|---|
| auth.csrf | none | `{ csrfToken }` |
| auth.login | `{ email, password }` | `{ user: SessionUserDto or null, mfaRequired }` |
| auth.mfaVerify | `{ code }` | `{ user: SessionUserDto }` |
| auth.me | none | `SessionUserDto` |
| auth.logout | none | any |
| outsource.cases | query: page, pageSize, sort, phone, status, agentId, dateFrom, dateTo | `CaseDto[]` plus `meta` |
| outsource.summary | none | `{ total, accepted, rejected, pending, remaining, processingRate, acceptanceRate, rejectionRate }` |
| cases.accept | param id; `{ confirm: "CONFIRM" }` | `CaseDto` (assumed) |
| cases.reject | param id; `{ confirm: "CONFIRM", reason }` | `CaseDto` (assumed) |

## ASSUMPTIONS
- accept/reject return the updated `CaseDto`; the UI refetches list and summary regardless.
- Dev server proxies `/api` to `localhost:3000`.
- The contract has no MFA enrollment or password-change endpoint, so no such screens exist.

## Not yet built
Agent, Team Leader, Admin, CEO, Finance and Reports screens, password reset, column visibility, export polling, charts, tests. Each follows the same pattern: a service file plus zod schemas for its DTOs.
