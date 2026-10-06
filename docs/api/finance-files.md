# Finance and Files API (Account 6)

Base path `/api/v1`. Send `X-CSRF-Token` on every non-GET call. Responses: `{ "data": ..., "meta": {...} }` (meta on lists), errors `{ "error": { "code", "message", "requestId" } }`. Money is always a string with 2 decimals. Dates are `YYYY-MM-DD`. Always build URLs with `route(key, params)`.

Permissions: finance:view (all reads/reports), income:create, income:update (also void), expense:create, expense:update (also void), expense_head:create, expense_head:update. By default only CEO and PRIMARY_SUPER_ADMIN hold them.

## Income

### finance.incomeCreate `POST /finance/income`
```json
{ "amount": "1250.50", "date": "2026-10-01", "category": "Client payment", "reference": "INV-1042", "description": "October retainer" }
```
201:
```json
{ "data": { "id": "6f1c...", "amount": "1250.50", "currency": "PKR", "date": "2026-10-01", "category": "Client payment",
  "reference": "INV-1042", "description": "October retainer", "relatedCaseId": null, "status": "ACTIVE",
  "createdBy": { "id": "a2b3...", "fullName": "Ayesha Khan" }, "createdAt": "2026-10-05T09:12:44.000Z" } }
```
Errors: VALIDATION_ERROR (amount not a positive 2-decimal string, bad date, unknown field, currency different from the organization base currency), FORBIDDEN.

### finance.incomeList `GET /finance/income?page=1&pageSize=25&sort=date:desc&dateFrom=2026-10-01&dateTo=2026-10-31&status=ACTIVE&category=Client%20payment&search=INV`
200: `{ "data": [IncomeDto...], "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 } }`. Sort fields: date, amount, createdAt, category.

### finance.incomeGet `GET /finance/income/:id`, finance.incomeUpdate `PATCH /finance/income/:id`
Update body: any subset of the create fields, e.g. `{ "amount": "1300.00" }`. Voided records answer INVALID_STATUS_TRANSITION. Other organization's id answers NOT_FOUND.

### finance.incomeVoid `POST /finance/income/:id/void`
```json
{ "reason": "Duplicate entry" }
```
200: the income with `"status": "VOIDED"`. The record is kept; it leaves all totals. Voiding twice answers 409 INVALID_STATUS_TRANSITION.

## Expenses and heads

### finance.expenseHeadList `GET /finance/expense-heads`
Defaults (Salary, Rent, Utilities, Internet, Transportation, Software, Marketing, Office Supplies, Operations, Other) are created once per organization and are editable.
```json
{ "data": [ { "id": "c1d2...", "name": "Rent", "isActive": true } ], "meta": { "page": 1, "pageSize": 10, "total": 10, "totalPages": 1 } }
```
### finance.expenseHeadCreate `POST` `{ "name": "Legal Fees" }` / finance.expenseHeadUpdate `PATCH /finance/expense-heads/:id` `{ "name": "Office Rent", "isActive": false }`
Names are unique per organization, case-insensitive (VALIDATION_ERROR on duplicates).

### finance.expenseCreate `POST /finance/expenses`
```json
{ "expenseHeadId": "c1d2...", "amount": "99.99", "date": "2026-10-04", "payee": "Landlord", "reference": "RENT-OCT" }
```
201 `ExpenseDto` (`expenseHeadName` included). Inactive or foreign heads answer VALIDATION_ERROR.
finance.expenseList / expenseGet / expenseUpdate / expenseVoid mirror the income endpoints (extra list filter `expenseHeadId`).

## Reports (permission finance:view)
Range defaults to the current month to date. `dateFrom`/`dateTo` inclusive. Only ACTIVE records count.

- finance.reportSummary `GET /finance/reports/summary?dateFrom=2026-08-01&dateTo=2026-10-31`
  `{ "data": { "totalIncome": "1000.30", "totalExpenses": "0.30", "net": "1000.00", "currency": "PKR" } }`
- finance.reportByCategory `GET /finance/reports/by-category`
  `{ "data": { "income": [ { "category": "Sales", "total": "1000.30" } ], "expenses": [ { "expenseHeadId": "c1d2...", "expenseHeadName": "Rent", "total": "0.30" } ] } }`
- finance.reportMonthly `GET /finance/reports/monthly` (empty months included, at most 120 months)
  `{ "data": [ { "month": "2026-08", "income": "0.30", "expenses": "0.30", "net": "0.00" }, { "month": "2026-09", "income": "0.00", "expenses": "0.00", "net": "0.00" } ] }`
- finance.transactions `GET /finance/transactions?page=1&pageSize=25&dateFrom=...&status=VOIDED`
  `{ "data": [ { "id": "6f1c...", "type": "INCOME", "date": "2026-10-01", "amount": "1250.50", "currency": "PKR", "category": "Client payment", "reference": "INV-1042", "status": "ACTIVE" } ], "meta": {...} }` (includes VOIDED rows, flagged by `status`).

## Files

### files.uploadUrl `POST /files/upload-url`
```json
{ "fileName": "receipt.pdf", "mimeType": "application/pdf", "sizeBytes": 48213 }
```
200: `{ "data": { "fileId": "9a8b...", "uploadUrl": "https://<storage>/orgs/<org>/2026/10/9a8b...?X-Amz-Signature=..." } }`
Then the client uploads directly: `PUT <uploadUrl>` with headers `Content-Type: application/pdf` and `Content-Length: 48213` and the file as body (URL valid 5 minutes; storage rejects other type or size).
Allowed types: pdf, png, jpeg, csv, xlsx, docx; max 10 MiB; extension must match the type. Errors: VALIDATION_ERROR, RATE_LIMITED (30/min per user).

### files.downloadUrl `GET /files/:id/download-url`
200: `{ "data": { "url": "https://<storage>/...signed...", "expiresAt": "2026-10-05T09:14:44.000Z" } }`
The URL expires in about 2 minutes and forces a download. Errors: NOT_FOUND (unknown id, other organization, or never uploaded), FORBIDDEN (not your file), VALIDATION_ERROR (uploaded object did not match the declared size/type).
Every issued URL is logged (who, which file, when, request id).
