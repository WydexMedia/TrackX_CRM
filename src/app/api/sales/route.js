import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function POST(request) {
  const raw = await request.json();
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  console.log('Raw sales data received:', raw);
  const client = await clientPromise;
  const db = client.db();
  const sales = db.collection('sales');

  // Normalize fields
  const data = {
    customerName: (raw.customerName || '').toString().trim(),
    amount: Number(raw.amount || 0),
    newAdmission: (((raw.newAdmission ?? '') + '').trim().toLowerCase() === 'yes') ? 'yes' : 'no',
    ogaName: (raw.ogaName || '').toString().trim(),
    createdAt: new Date(),
    ...(tenantSubdomain ? { tenantSubdomain } : {}),
  };
  console.log('Normalized sales data:', data);

  await sales.insertOne(data);
  console.log('Sale saved to database');
  return NextResponse.json({ success: true });
}

export async function GET(request) {
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  const client = await clientPromise;
  const db = client.db();
  const sales = db.collection('sales');
  const allSales = await sales.find(tenantSubdomain ? { tenantSubdomain } : {}).toArray();
  return NextResponse.json(allSales);
}

export async function PUT(request) {
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  const client = await clientPromise;
  const db = client.db();
  const sales = db.collection('sales');
  const { _id, ...updateData } = await request.json();
  if (!_id) {
    return NextResponse.json({ success: false, error: 'Missing sale ID' }, { status: 400 });
  }
  // Remove fields that shouldn't be updated
  delete updateData._id;
  updateData.updatedAt = new Date();
  if (updateData.newAdmission !== undefined) {
    updateData.newAdmission = (((updateData.newAdmission ?? '') + '').trim().toLowerCase() === 'yes') ? 'yes' : 'no';
  }
  if (updateData.amount !== undefined) {
    updateData.amount = Number(updateData.amount || 0);
  }
  if (updateData.ogaName !== undefined) {
    updateData.ogaName = (updateData.ogaName || '').toString().trim();
  }
  const result = await sales.updateOne(
    tenantSubdomain ? { _id: new ObjectId(_id), tenantSubdomain } : { _id: new ObjectId(_id) },
    { $set: updateData }
  );
  if (result.modifiedCount === 1) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'Sale not found or not updated' }, { status: 404 });
  }
}

export async function DELETE(request) {
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  const client = await clientPromise;
  const db = client.db();
  const sales = db.collection('sales');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing sale ID' }, { status: 400 });
  }
  const result = await sales.deleteOne(tenantSubdomain ? { _id: new ObjectId(id), tenantSubdomain } : { _id: new ObjectId(id) });
  if (result.deletedCount === 1) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 });
  }
}
