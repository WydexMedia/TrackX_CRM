import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import fs from "fs";

function normalizePostgresUrl(input?: string): string {
	if (!input) return "";
	let s = input.trim();
	// Handle values like: psql 'postgresql://user:pass@host/db?sslmode=require'
	const match = s.match(/(postgres(?:ql)?:\/\/[\w\-:@.%\/? ,=&+#]+)"?'?/i);
	if (s.startsWith("psql ") || match) {
		if (match && match[1]) return match[1];
		// fallback: strip leading token and quotes
		s = s.replace(/^psql\s+/, "").replace(/^[\'"]|[\'"]$/g, "");
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

// Build a sanitized connection string without ssl-specific params so we can control TLS via Pool options
function sanitizeUrl(input: string): string {
	try {
		const u = new URL(input);
		u.searchParams.delete("sslmode");
		u.searchParams.delete("ssl");
		return u.toString();
	} catch {
		return input;
	}
}

const hostname = (() => {
	try {
		return new URL(url).hostname;
	} catch {
		return "";
	}
})();
const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

// Prefer a CA bundle if provided, else allow self-signed for non-local
const caPath = process.env.RDS_CA_BUNDLE_PATH || process.env.PGSSLROOTCERT;
let ssl: false | { rejectUnauthorized?: boolean; ca?: string } = isLocal ? false : { rejectUnauthorized: false };
if (!isLocal && caPath) {
	try {
		const ca = fs.readFileSync(caPath, "utf8");
		ssl = { ca, rejectUnauthorized: true };
	} catch {
		// fall back to no-verify if CA path invalid
		ssl = { rejectUnauthorized: false };
	}
}

const pool = new Pool({
	connectionString: sanitizeUrl(url),
	ssl,
	// Pool tuning for serverless/Node workers
	max: Number(process.env.PG_MAX_POOL_SIZE || 10),
	idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
	connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5000),
});

export const db = drizzle(pool);


