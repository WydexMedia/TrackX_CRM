import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not configured");
}

// Reuse the same client promise across hot reloads and serverless invocations
let clientPromise;
const globalKey = Symbol.for("mongo.clientPromise");

if (global[globalKey]) {
  clientPromise = global[globalKey];
}

export async function getMongoClient() {
  if (!clientPromise) {
    const client = new MongoClient(uri, {
      // Tune for serverless: small pool, fast failover
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 0),
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
      retryWrites: true,
    });
    clientPromise = client.connect();
    global[globalKey] = clientPromise;
  }
  return clientPromise;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db();
}


