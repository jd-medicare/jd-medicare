# PROGRESS: Account 3 (Reports + CEO)
Last run: 65 pass, 1 skipped (Redis-gated), 0 fail (tsx --test); strict tsc clean against typed shims.

## DONE
- M1 prisma/fragments/reports.prisma (+ _local-base.prisma), shared-types modules/reports.ts, api-registry.json, route.ts
- M2 reports engine: outsource / teamLeader / admin, filters, scope/authorization, rates, pagination
- M3 CEO engine: dashboard (all ranges), performance x3, compare, ceo:dashboard
- M4 exports: create/get, job body (re-auth, tenant, field filtering, CSV/XLSX/PDF, injection protection, putPrivate, audit), quotas, BullMQ queue+processor (retry, backoff, dead-letter), config
- M5 tests: rate math, seeded two-tenant data, authorization, tenant isolation, export security, formats (XLSX verified with openpyxl/LibreOffice, PDF with qpdf/pdftotext)
- PDF Unicode: own PDF writer (no pdf-lib), embedded font subset, Arabic joining/ligatures via GSUB, bidi, ActualText + ToUnicode. Verified visually (rendered with pdftoppm) and with qpdf; Urdu + Pashto letters covered by test
- Font plumbing: font compiled into default-font.generated.ts (no build copy needed), PDF_FONT_PATH override kept, coverage validation (Latin + Urdu/Pashto + GSUB) fails loudly, embed-font.mjs with --check license gate, tests for override/validation
- Job logic extracted to export.job-runner.ts; tests for retry, exponential backoff (5s, 10s), permanent failures, revocation between retries, dead-letter payload without PII, dead-letter outage, redelivery
- Approved decisions: DOB/address need customer:view; dashboard finance null without finance:view; Account 1 provides user-reader service (CHANGE_REQUESTS #1)
- Docs: docs/api/reports-ceo.md (real samples), READMEs, CHANGE_REQUESTS.md in reports/ ceo/ jobs/

## IN PROGRESS
- nothing

## REMAINING (needs other accounts / real infra)
1. Prisma CaseDataRepository + UserDataRepository implementations (Account 2 / Account 1 schemas)
2. Rewire apps/api/src/reports/integration.ts to real modules; delete apps/api/src/_stubs/
3. Run against real Postgres + Redis: Nest boot, controllers, PrismaExportStore, BullMQ retry/dead-letter (never executed here)
4. Export retention job (needs StorageService.deletePrivate)
5. Run export.queue.integration.test.ts against real Redis/BullMQ (written, never run)
6. BLOCKED: bundle Noto Naskh Arabic (OFL) - decision approved, files not obtainable offline. Follow exports/fonts/README.md (merge with Noto Serif for Latin, subset, embed-font.mjs ... OFL-1.1, delete FreeSerif, add OFL.txt). Package currently ships FreeSerif (GPL+exception): not production-ready until done
7. Optional: Nastaliq font, GPOS mark positioning for diacritics
8. Open questions in CHANGE_REQUESTS.md (items 2-11)
