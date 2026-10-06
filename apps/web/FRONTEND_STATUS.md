# Frontend status

NOTHING HAS BEEN COMPILED OR RUN. Packages are not installed. Every new file was only syntax-checked with esbuild (all pass), and every registry key used was checked against `packages/shared-types/api-registry.json` (35 keys, 0 missing). Type errors, runtime errors and layout problems are expected to surface on first `tsc -b` / `vite`.

## Built
| Area | Route | Files |
|---|---|---|
| Shell, nav, role landing | `/` redirects by role (`app/nav.ts` `homeFor`) | `app/AppShell.tsx`, `app/nav.ts`, `app/App.tsx` |
| Login + MFA code step | `/login` (existing, plus "Forgot password" link) | `features/auth/LoginPage.tsx` |
| Password reset | `/forgot-password`, `/reset-password?token=` | `features/auth/*PasswordPage.tsx` |
| Agent: customer + case create | `/customers/new` (`customers.create`) | `features/agent/NewCustomerPage.tsx` |
| Agent "My cases" / Team Leader cases list | `/cases` with phone, status, date, sort filters | `features/cases/CasesPage.tsx` |
| Case detail + set call length (hh:mm:ss to durationSeconds) | `/cases/:id` | `features/cases/CaseDetailPage.tsx` |
| Team performance table | inside `/reports` (Team Leader report `byAgent`) | `features/reports/ReportViews.tsx` |
| Admin users: list, create, lock, unlock, permissions | `/admin/users` | `features/admin/UsersPage.tsx`, `UserDialogs.tsx` |
| Audit log | `/admin/audit` | `features/admin/AuditPage.tsx` |
| CEO dashboard (finance may be null) | `/ceo` | `features/ceo/CeoDashboardPage.tsx` |
| Reports summary + export request + status polling (2s, stops on READY/FAILED/error) | `/reports` | `features/reports/*` |
| Finance income / expenses: list, create, void with confirmation | `/finance/income`, `/finance/expenses` | `features/finance/*` |

Gating: each route takes its menu and permission from the `NAV` table, so a route and its nav link cannot disagree. This is UI gating only.
Design-system additions: `TextField`, `Pager`, `StateRows`, `Kpis`, `Loading`, `pageStyle`. `Dialog` now uses `useId` (the fixed `dlg-title` id would have been duplicated with several dialogs mounted).

## Mock-only
Mock handlers (`services/mock/index.ts`) still cover only auth and outsource. None of the new screens has mock handlers, so `VITE_USE_MOCK=true` shows errors on them. They work only against a real API.

## Not built
- **MFA enrolment**: the registry has no enrolment route (only `auth.mfaVerify`), so there is no enrolment screen. `mfaEnabled` is returned in the session but unused.
- **`cases.create`**: not in the registry. `customers.create` is assumed to create the case too, because shared-types defines `CustomerCreateResult { customer, case }`.
- Case history, `cases.update`/`modifyProcessed`, customers list/update, user edit/activate/disable/setRole/setMenus, roles/menus lists, expense head management, finance reports/by-category/monthly/transactions, finance export, CEO performance/compare, files, charts, tests, a mock layer for new keys.
- Changing your own password while signed in (no registry route).

## Unverified assumptions (the registry and shared-types do not specify these)
1. Query parameters for lists: `page`, `pageSize`, `sort`, `phone`, `status`, `dateFrom`, `dateTo` on `cases.list`; `status` on `users.list`; `event`, `entityType`, `dateFrom`, `dateTo` on `audit.list`; `status`, `dateFrom`, `dateTo` on finance lists; `dateFrom`, `dateTo` on reports; `range` (+ `dateFrom`/`dateTo` for CUSTOM) on `ceo.dashboard`. Copied from the outsource convention.
2. List endpoints return `data: T[]` plus `meta` (same as `outsource.cases`).
3. `cases.list` is scoped server-side for agents (the page only relabels it "My cases").
4. Mutations (`users.lock/unlock/setPermissions`, `users.create`, `cases.setCallLength`, finance create/void) return the updated DTO. The UI refetches lists regardless, but the zod parse will fail if the real response differs.
5. `users.lock/unlock` take `{ reason? }` (ReasonRequest). `auth.passwordForgot`/`passwordReset` response bodies are not parsed (`z.unknown()`).
6. Finance void is gated in the UI by `income:update` / `expense:update`; no void permission exists in the permission list. The CONFIRM text in the void dialog is client-side only because `VoidRequest` is `{ reason }`.
7. Reports offered by role (`BY_ROLE` in `ReportsPage.tsx`): OUTSOURCE -> outsource, TEAM_LEADER -> team, ADMIN -> admin, CEO/super admin -> all three. The server must still enforce access. `rows` in report responses are not parsed.
8. Password reset has no client-side strength rule; the server's `VALIDATION_ERROR` is shown as a generic message.
9. Phone is checked with a loose pattern (`+`, digits, spaces, brackets, dashes, 7 to 20 chars); the server is the authority.
10. Export download links are only rendered when the URL starts with `http(s)://` or `/`.
11. `@shared/enums` and `@shared/modules/cases` are imported through the existing `@shared` alias (tsconfig and vite both define it). `formatDuration` rounds fractional averages first because the shared helper throws on non-integers.
12. `ceo.dashboard` is assumed to be callable with permission `ceo:dashboard` (as in `DEFAULT_ROLE_PERMISSIONS`); menu-to-route mapping comes from `DEFAULT_ROLE_MENUS`.
13. Not manually tested: keyboard and screen-reader behaviour, `<dialog>` focus handling, small-screen layout of the wide tables.
