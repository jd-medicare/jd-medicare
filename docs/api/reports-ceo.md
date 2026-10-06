# Reports and CEO API (Account 3)

Base path `/api/v1`. Envelope: `{ data, meta? }`; errors `{ error: { code, message, requestId } }`. Sample responses below are real output of the engines run against the test fixture (trimmed to 1 row per array for length). Money is a string, rates are 0-100 with at most 2 decimals, dates are UTC.

## `reports.outsource`
`GET /api/v1/reports/outsource`  
Permission: `report:view`  
Query/body: dateFrom,dateTo,agentId,teamLeaderId,outsourceUserId,status,phone,minCallSeconds,maxCallSeconds,page,pageSize,sort (submittedAt|processedAt|callLengthSeconds|status)  
Outsource users see only their cases; team leaders only their team; agents only their own.

```json
{
  "data": {
    "summary": {
      "total": 10,
      "accepted": 4,
      "rejected": 2,
      "pending": 4,
      "remaining": 4,
      "processingRate": 60,
      "acceptanceRate": 66.67,
      "rejectionRate": 33.33,
      "byAgent": [
        {
          "agentId": "00000000-0000-4000-8000-000000000031",
          "agentName": "Agnes One",
          "total": 4,
          "accepted": 2,
          "rejected": 1,
          "pending": 1
        }
      ],
      "byDate": [
        {
          "date": "2025-12-20",
          "total": 1,
          "accepted": 1,
          "rejected": 0,
          "pending": 0
        }
      ]
    },
    "rows": [
      {
        "id": "00000000-0000-4000-8000-000000001005",
        "status": "PENDING",
        "version": 1,
        "submittedAt": "2026-10-05T09:00:00.000Z",
        "processedAt": null,
        "processedBy": null,
        "rejectionReason": null,
        "agent": {
          "id": "00000000-0000-4000-8000-000000000033",
          "fullName": "Aisha Three"
        },
        "teamLeader": {
          "id": "00000000-0000-4000-8000-000000000022",
          "fullName": "Tariq Lead"
        },
        "customer": {
          "id": "00000000-0000-4000-8000-000000002005",
          "firstName": "First5",
          "lastName": "Last5",
          "phone": "+923001110005",
          "dateOfBirth": null,
          "address": null,
          "zipCode": "25000",
          "extra": {},
          "createdAt": "2026-10-05T09:00:00.000Z"
        },
        "callLengthSeconds": 90,
        "callLengthDisplay": "00:01:30"
      }
    ]
  },
  "meta": {
    "page": 1,
    "pageSize": 1,
    "total": 10,
    "totalPages": 10
  }
}
```

## `reports.teamLeader`
`GET /api/v1/reports/team-leader`  
Permission: `report:view`  
Query/body: same as above  
Team leader sees only their own team. Outsource users get FORBIDDEN.

```json
{
  "data": {
    "summary": {
      "totalRecords": 6,
      "reviewedRecords": 2,
      "modifiedRecords": 1,
      "accepted": 2,
      "rejected": 2,
      "pending": 2,
      "callLength": {
        "totalSeconds": 725,
        "averageSeconds": 145,
        "minSeconds": 45,
        "maxSeconds": 300
      },
      "byAgent": [
        {
          "agentId": "00000000-0000-4000-8000-000000000031",
          "agentName": "Agnes One",
          "total": 4,
          "averageCallSeconds": 131.25
        }
      ]
    },
    "rows": [
      {
        "id": "00000000-0000-4000-8000-000000001010",
        "status": "PENDING",
        "version": 1,
        "submittedAt": "2026-10-04T09:00:00.000Z",
        "processedAt": null,
        "processedBy": null,
        "rejectionReason": null,
        "agent": {
          "id": "00000000-0000-4000-8000-000000000031",
          "fullName": "Agnes One"
        },
        "teamLeader": {
          "id": "00000000-0000-4000-8000-000000000021",
          "fullName": "Tina Lead"
        },
        "customer": {
          "id": "00000000-0000-4000-8000-000000002010",
          "firstName": "First10",
          "lastName": "Last10",
          "phone": "+923001110010",
          "dateOfBirth": "1990-05-17",
          "address": "10 Secret Street",
          "zipCode": "25000",
          "extra": {},
          "createdAt": "2026-10-04T09:00:00.000Z"
        },
        "callLengthSeconds": 45,
        "callLengthDisplay": "00:00:45"
      }
    ]
  },
  "meta": {
    "page": 1,
    "pageSize": 1,
    "total": 6,
    "totalPages": 6
  }
}
```

## `reports.admin`
`GET /api/v1/reports/admin`  
Permission: `report:view + user:view`  
Query/body: status (UserStatus),role,search,page,pageSize,sort (createdAt|fullName|lastLoginAt|status)  
ADMIN / PRIMARY_SUPER_ADMIN / CEO roles only. The Primary Super Admin is hidden from everyone but themselves.

```json
{
  "data": {
    "summary": {
      "totalUsers": 11,
      "activeUsers": 10,
      "lockedUsers": 1,
      "usersByRole": [
        {
          "roleKey": "ADMIN",
          "count": 1
        },
        {
          "roleKey": "CEO",
          "count": 1
        },
        {
          "roleKey": "TEAM_LEADER",
          "count": 2
        },
        {
          "roleKey": "AGENT",
          "count": 5
        },
        {
          "roleKey": "OUTSOURCE",
          "count": 2
        }
      ],
      "totalRecords": 10,
      "accepted": 4,
      "rejected": 2,
      "pending": 4
    },
    "rows": [
      {
        "id": "00000000-0000-4000-8000-000000000011",
        "email": "ada.admin@example.test",
        "fullName": "Ada Admin",
        "phone": null,
        "status": "ACTIVE",
        "roleKey": "ADMIN",
        "permissions": [
          "report:view",
          "user:view",
          "user:create"
        ],
        "menus": [],
        "lastLoginAt": null,
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "pageSize": 1,
    "total": 11,
    "totalPages": 11
  }
}
```

## `ceo.dashboard`
`GET /api/v1/ceo/dashboard`  
Permission: `ceo:dashboard`  
Query/body: range (TODAY|THIS_WEEK|THIS_MONTH|PREVIOUS_MONTH|YEAR_TO_DATE|CUSTOM, default THIS_MONTH), dateFrom/dateTo for CUSTOM  
`finance` is null and the monthly trend empty when the caller lacks finance:view.

```json
{
  "data": {
    "range": {
      "dateFrom": "2026-10-01",
      "dateTo": "2026-10-05"
    },
    "operations": {
      "totalRecords": 10,
      "newRecords": 7,
      "pending": 4,
      "accepted": 2,
      "rejected": 1,
      "processingRate": 42.86,
      "acceptanceRate": 66.67,
      "rejectionRate": 33.33
    },
    "people": {
      "activeAgents": 4,
      "activeTeamLeaders": 2,
      "activeOutsourceUsers": 2
    },
    "callLength": {
      "totalSeconds": 1155,
      "averageSeconds": 231,
      "minSeconds": 45,
      "maxSeconds": 600
    },
    "finance": {
      "totalIncome": "1000.00",
      "totalExpenses": "250.50",
      "netPosition": "749.50",
      "currency": "PKR"
    },
    "trends": {
      "recordsByDate": [
        {
          "date": "2026-10-01",
          "total": 2,
          "accepted": 1,
          "rejected": 1,
          "pending": 0
        }
      ],
      "incomeVsExpenseByMonth": [
        {
          "month": "2026-10",
          "income": "1000.00",
          "expenses": "250.50"
        }
      ]
    }
  }
}
```

## `ceo.performanceAgents`
`GET /api/v1/ceo/performance/agents`  
Permission: `ceo:dashboard`  
Query/body: range, dateFrom, dateTo, page, pageSize, sort (fullName|totalRecords|accepted|rejected|pending|averageCallSeconds)  
Same shape for /performance/team-leaders (ceo.performanceTeamLeaders) and /performance/outsource (ceo.performanceOutsource). Active users with zero records are included.

```json
{
  "data": [
    {
      "userId": "00000000-0000-4000-8000-000000000031",
      "fullName": "Agnes One",
      "totalRecords": 3,
      "accepted": 1,
      "rejected": 1,
      "pending": 1,
      "averageCallSeconds": 155
    },
    {
      "userId": "00000000-0000-4000-8000-000000000032",
      "fullName": "Amir Two",
      "totalRecords": 2,
      "accepted": 1,
      "rejected": 0,
      "pending": 1,
      "averageCallSeconds": 600
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 2,
    "total": 4,
    "totalPages": 2
  }
}
```

## `ceo.compare`
`GET /api/v1/ceo/compare`  
Permission: `ceo:dashboard`  
Query/body: periodAFrom, periodATo, periodBFrom, periodBTo (all required, YYYY-MM-DD)  


```json
{
  "data": {
    "periodA": {
      "totalRecords": 3,
      "newRecords": 2,
      "pending": 0,
      "accepted": 1,
      "rejected": 1,
      "processingRate": 100,
      "acceptanceRate": 50,
      "rejectionRate": 50
    },
    "periodB": {
      "totalRecords": 10,
      "newRecords": 7,
      "pending": 4,
      "accepted": 2,
      "rejected": 1,
      "processingRate": 42.86,
      "acceptanceRate": 66.67,
      "rejectionRate": 33.33
    }
  }
}
```

## `reports.exportCreate`
`POST /api/v1/reports/exports (HTTP 202)`  
Permission: `report:export`  
Query/body: body: { reportType: OUTSOURCE|TEAM_LEADER|ADMIN|FINANCE, format: CSV|XLSX|PDF, filters? }. FINANCE requires dateFrom+dateTo.  
RATE_LIMITED when 3 exports are active or 10 were created in the last hour (per user, configurable).

```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000007001",
    "reportType": "OUTSOURCE",
    "format": "CSV",
    "status": "QUEUED",
    "downloadUrl": null,
    "expiresAt": null
  }
}
```

## `reports.exportGet`
`GET /api/v1/reports/exports/:id`  
Permission: `report:export`  
Query/body: -  
Owner only; anyone else (same or other tenant) gets NOT_FOUND. When READY a fresh signed URL (default 300 s, max 900 s) is returned on every call.

```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000007001",
    "reportType": "OUTSOURCE",
    "format": "CSV",
    "status": "READY",
    "downloadUrl": "https://storage.invalid/exports/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000007001.csv?sig=test&ttl=300",
    "expiresAt": "2026-10-05T10:05:00.000Z"
  }
}
```

## Definitions (assumptions, see README)
- `pending` = SUBMITTED + PENDING. `processed` = accepted + rejected. `remaining` = total - processed.
- `processingRate` = processed / total. `acceptanceRate` = accepted / processed. `rejectionRate` = rejected / processed.
- CEO `operations`: `newRecords` and the status counts are for records submitted inside the range; `totalRecords` is all records submitted up to the end of the range.
- `dateFrom`/`dateTo` filter `submittedAt` (UTC, inclusive). Call-length statistics ignore cases without a call length.
- Errors used: VALIDATION_ERROR (400), UNAUTHENTICATED (401), FORBIDDEN (403), NOT_FOUND (404), RATE_LIMITED (429).
