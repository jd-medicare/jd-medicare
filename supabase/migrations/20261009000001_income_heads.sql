-- Migration: Add income_heads table and fromDate/toDate to incomes
CREATE TABLE IF NOT EXISTS "income_heads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" VARCHAR(100) NOT NULL,
  "nameKey" VARCHAR(100) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "nameKey")
);

CREATE INDEX IF NOT EXISTS "income_heads_org_active" ON "income_heads" ("organizationId", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'fromDate') THEN
    ALTER TABLE "incomes" ADD COLUMN "fromDate" DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'toDate') THEN
    ALTER TABLE "incomes" ADD COLUMN "toDate" DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'incomeHeadId') THEN
    ALTER TABLE "incomes" ADD COLUMN "incomeHeadId" UUID REFERENCES "income_heads"("id") ON DELETE SET NULL;
  END IF;
END $$;
