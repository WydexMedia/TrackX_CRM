import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { authenticateToken, createUnauthorizedResponse } from '@/lib/authMiddleware';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function POST(request) {
  // Authenticate the request - creating sales requires login
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

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
  // Authenticate the request to get user context
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  const client = await clientPromise;
  const db = client.db();
  const sales = db.collection('sales');
  
  // Build query to filter by user and tenant
  const query = {};
  
  // Add tenant filtering
  if (tenantSubdomain) {
    query.tenantSubdomain = tenantSubdomain;
  }
  
  // Add user filtering - filter by the authenticated user's email or name
  // We need to get the user's name from the users collection to match with ogaName
  const users = db.collection('users');
  const user = await users.findOne({ 
    email: authResult.user.email,
    ...(tenantSubdomain ? { tenantSubdomain } : {})
  });
  
  if (user && user.name) {
    // Filter sales by the user's name (ogaName field)
    query.ogaName = user.name;
  } else if (user && user.email) {
    // Fallback: if no name, try filtering by email (some sales might have email as ogaName)
    query.ogaName = user.email;
  } else {
    // Fallback: if user not found, return empty array for security
    return NextResponse.json({
      sales: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      }
    });
  }
  
  // Get pagination parameters
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;
  
  // Get total count for pagination
  const totalCount = await sales.countDocuments(query);
  
  // Get paginated results, sorted by creation date (newest first)
  const userSales = await sales
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  return NextResponse.json({
    sales: userSales,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  });
}

export async function PUT(request) {
  // Authenticate the request - editing sales requires login
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

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
  // Authenticate the request - deleting sales requires login
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

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
