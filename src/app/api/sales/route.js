import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function POST(request) {
  const data = await request.json();
  const client = await clientPromise;
  const db = client.db();
  const sales = db.collection('sales');
  data.createdAt = new Date();
  await sales.insertOne(data);
  return NextResponse.json({ success: true });
}

export async function GET() {
  const client = await clientPromise;
  const db = client.db();
  const sales = db.collection('sales');
  const allSales = await sales.find({}).toArray();
  return NextResponse.json(allSales);
}
