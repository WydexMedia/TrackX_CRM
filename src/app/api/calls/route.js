import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

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
  const calls = db.collection('calls');
  data.createdAt = new Date();
  await calls.insertOne(data);
  return NextResponse.json({ success: true });
}

export async function GET() {
  const client = await clientPromise;
  const db = client.db();
  const calls = db.collection('calls');
  const allCalls = await calls.find({}).toArray();
  return NextResponse.json(allCalls);
}

export async function PUT(request) {
  const client = await clientPromise;
  const db = client.db();
  const calls = db.collection('calls');
  const { _id, ...updateData } = await request.json();
  if (!_id) {
    return NextResponse.json({ success: false, error: 'Missing call ID' }, { status: 400 });
  }
  // Remove fields that shouldn't be updated
  delete updateData._id;
  updateData.updatedAt = new Date();
  const result = await calls.updateOne(
    { _id: new ObjectId(_id) },
    { $set: updateData }
  );
  if (result.modifiedCount === 1) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'Call not found or not updated' }, { status: 404 });
  }
}

export async function DELETE(request) {
  const client = await clientPromise;
  const db = client.db();
  const calls = db.collection('calls');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing call ID' }, { status: 400 });
  }
  const result = await calls.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 1) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'Call not found' }, { status: 404 });
  }
} 