/*
  Usage:
    MONGODB_URI="mongodb+srv://..." node scripts/setup-mongo-indexes.js
  or with npm script (see package.json):
    npm run mongo:indexes
*/

const { MongoClient } = require("mongodb");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    console.log("Creating indexes...");
    await Promise.all([
      db.collection("users").createIndex({ tenantSubdomain: 1 }),
      db.collection("users").createIndex({ tenantSubdomain: 1, code: 1 }, { unique: true }),
      db.collection("users").createIndex({ tenantSubdomain: 1, email: 1 }),
      db.collection("users").createIndex({ tenantSubdomain: 1, role: 1 }),
      db.collection("teamAssignments").createIndex({ tenantSubdomain: 1, status: 1 }),
      db.collection("teamAssignments").createIndex({ tenantSubdomain: 1, salespersonId: 1, status: 1 }),
      db.collection("teamAssignments").createIndex({ tenantSubdomain: 1, jlId: 1, status: 1 }),
      db.collection("sales").createIndex({ tenantSubdomain: 1, createdAt: -1 }),
      db.collection("calls").createIndex({ tenantSubdomain: 1, createdAt: -1 }),
      db.collection("daily_reports").createIndex({ tenantSubdomain: 1, date: 1 }),
    ]);
    console.log("Indexes created/ensured successfully.");
  } catch (err) {
    console.error("Failed to create indexes:", err?.message || err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();


