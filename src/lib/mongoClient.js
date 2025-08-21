import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not configured");
}

let clientPromise;

export async function getMongoClient() {
  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db();
}


