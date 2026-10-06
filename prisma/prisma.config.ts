// Prisma 7 configuration (datasource URL lives here, not in the schema).
// Usage: prisma <cmd> --config prisma/prisma.config.ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'schema.prisma',
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
