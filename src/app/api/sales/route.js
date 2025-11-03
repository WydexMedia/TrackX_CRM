import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { authenticateToken, createUnauthorizedResponse } from '@/lib/authMiddleware';
import { db } from '@/db/client';
import { leads, courses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireTenantIdFromRequest } from '@/lib/tenant';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function POST(request) {
  try {
    // Authenticate the request - creating sales requires login
    const authResult = await authenticateToken(request);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
    }

    const body = await request.json();
    const { leadPhone, courseId, paidAmount, stageNotes, actorId } = body;

    // Validate required fields
    if (!leadPhone || !courseId || !paidAmount) {
      return NextResponse.json({ 
        success: false, 
        error: 'Lead phone, course ID, and paid amount are required' 
      }, { status: 400 });
    }

    // Get tenant ID
    let tenantId;
    try {
      tenantId = await requireTenantIdFromRequest(request);
    } catch {
      return NextResponse.json({ success: false, error: "Tenant not resolved" }, { status: 400 });
    }

    // Get lead and course information in parallel for better performance
    const [leadResult, courseResult] = await Promise.all([
      db.select()
        .from(leads)
        .where(and(eq(leads.phone, leadPhone), eq(leads.tenantId, tenantId)))
        .limit(1),
      
      db.select()
        .from(courses)
        .where(and(eq(courses.id, courseId), eq(courses.tenantId, tenantId)))
        .limit(1)
    ]);

    if (!leadResult[0]) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    if (!courseResult[0]) {
      return NextResponse.json({ success: false, error: "Course not found" }, { status: 404 });
    }
    
    const lead = leadResult;
    const course = courseResult;

    // Update lead with course and paid amount
    await db
      .update(leads)
      .set({
        stage: "Customer",
        courseId: courseId,
        paidAmount: Math.round(paidAmount * 100), // Convert to cents
        updatedAt: new Date(),
        lastActivityAt: new Date()
      })
      .where(and(eq(leads.phone, leadPhone), eq(leads.tenantId, tenantId)));

    // Create sale record in MongoDB (for compatibility with existing sales system)
    const { tenantSubdomain } = await getTenantContextFromRequest(request);
    const mongoClient = await clientPromise;
    const mongoDb = mongoClient.db();
    const sales = mongoDb.collection('sales');

    // Get user name from the authenticated user
    let userName = authResult.user.email; // Fallback to email
    try {
      // Try to get the user's actual name from the users collection
      const users = mongoDb.collection('users');
      const user = await users.findOne({ 
        email: authResult.user.email,
        ...(tenantSubdomain ? { tenantSubdomain } : {})
      });
      if (user && user.name) {
        userName = user.name;
      }
    } catch (error) {
      console.log('Could not fetch user name, using email:', error);
    }

    const saleData = {
      customerName: lead[0].name || leadPhone,
      customerPhone: leadPhone,
      amount: Number(paidAmount),
      courseName: course[0].name,
      courseId: courseId,
      newAdmission: 'Yes', // Default to yes for new customers
      ogaName: userName, // Use authenticated user's name
      leadId: lead[0].id,
      stageNotes: stageNotes || null,
      createdAt: new Date(),
      ...(tenantSubdomain ? { tenantSubdomain } : {}),
    };

    console.log('Creating sale with data:', saleData);
    const result = await sales.insertOne(saleData);
    console.log('Sale created with ID:', result.insertedId);

    return NextResponse.json({ 
      success: true, 
      message: 'Sale created and lead updated successfully',
      sale: saleData
    });

  } catch (error) {
    console.error('Sale creation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create sale. Please try again.' 
    }, { status: 500 });
  }
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
  
  console.log('Sales query:', query);
  console.log('Found sales:', userSales.length);
  console.log('Sample sale:', userSales[0]);
  
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
