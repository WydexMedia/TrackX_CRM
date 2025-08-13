import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: (process.env.PSQL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL) as string,
  },
  strict: true,
} satisfies Config;


