import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

function normalizePostgresUrl(input?: string): string {
  if (!input) return "";
  let s = input.trim();
  // Handle values like: psql 'postgresql://user:pass@host/db?sslmode=require'
  const match = s.match(/(postgres(?:ql)?:\/\/[\w\-:@.%/?,=&+#]+)"?'?/i);
  if (s.startsWith("psql ") || match) {
    if (match && match[1]) return match[1];
    // fallback: strip leading token and quotes
    s = s.replace(/^psql\s+/, "").replace(/^['"]|['"]$/g, "");
  }
  return s;
}

const raw = process.env.PSQL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const url = normalizePostgresUrl(raw);

if (!url || !/^postgres(?:ql)?:\/\//i.test(url)) {
  throw new Error(
    `Invalid Postgres connection string. Set one of PSQL, DATABASE_URL, or NEON_DATABASE_URL to a value like postgresql://user:pass@host/db?sslmode=require. Got: ${raw ?? "<empty>"}`
  );
}

export const sql = neon(url);
export const db = drizzle(sql);


