# @app/shared-types (Account 1)
Enums (roles, permissions, menus, statuses, error codes + HTTP map, audit events, default role permissions/menus, role ranks), DTOs (A7), request/response types (A8-A9), `route(key, params)` (A4). `api-registry.json` is the contract copy: never edit. Each account overwrites only its own `src/modules/<module>.ts`.
ASSUMPTIONS: extra DTOs `RoleDto`, `PermissionDto`, `MenuDto`, `OrganizationDto`; build output is `dist/src/index.js`.
CHANGE_REQUESTS: none.
