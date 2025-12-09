import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { leads, courses, sales, users, tenants } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';
import { authenticateRequest, createUnauthorizedResponse } from '@/lib/clerkAuth';
import { requireTenantIdFromRequest } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request - creating sales requires login
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, authResult.statusCode);
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
    
    const lead = leadResult[0];
    const course = courseResult[0];

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

    // Get user name from the authenticated user
    let userName = authResult.email || 'Unknown User'; // Fallback to email
    try {
      // Get the user's actual name from PostgreSQL users table by email
      if (authResult.email) {
        const userResult = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.email, authResult.email))
          .limit(1);
        if (userResult[0] && userResult[0].name) {
          userName = userResult[0].name;
        }
      }
    } catch (error) {
      console.log('Could not fetch user name, using email:', error);
    }

    // Create sale record in PostgreSQL
    const [newSale] = await db
      .insert(sales)
      .values({
        customerName: lead.name || leadPhone,
        customerPhone: leadPhone,
        amount: Math.round(paidAmount), // Store as integer
        courseName: course.name,
        courseId: courseId,
        newAdmission: 'Yes',
        ogaName: userName,
        leadId: lead.id,
        stageNotes: stageNotes || null,
        tenantId: tenantId,
      })
      .returning({ id: sales.id });

    console.log('Sale created with ID:', newSale.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Sale created and lead updated successfully',
      sale: { id: newSale.id, ...newSale }
    });

  } catch (error) {
    console.error('Sale creation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create sale. Please try again.' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Authenticate the request to get user context
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.statusCode);
  }

  const { tenantId } = await getTenantContextFromRequest(request);
  
  if (!tenantId) {
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

  // Get user's name from PostgreSQL
  let userName = authResult.email || 'Unknown User';
  
  if (authResult.email) {
    const userResult = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.email, authResult.email))
      .limit(1);
    if (userResult[0] && userResult[0].name) {
      userName = userResult[0].name;
    }
  }
  
  // Get pagination parameters
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;
  
  // Get total count for pagination
  const countResult = await db
    .select({ count: sales.id })
    .from(sales)
    .where(and(
      eq(sales.tenantId, tenantId),
      eq(sales.ogaName, userName)
    ));
  
  const totalCount = countResult.length;
  
  // Get paginated results, sorted by creation date (newest first)
  const userSales = await db
    .select()
    .from(sales)
    .where(and(
      eq(sales.tenantId, tenantId),
      eq(sales.ogaName, userName)
    ))
    .orderBy(desc(sales.createdAt))
    .limit(limit)
    .offset(offset);
  
  console.log('Found sales:', userSales.length);
  
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

export async function PUT(request: NextRequest) {
  // Authenticate the request - editing sales requires login
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.statusCode);
  }

  const { id, ...updateData } = await request.json();
  const { tenantId } = await getTenantContextFromRequest(request);
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing sale ID' }, { status: 400 });
  }
  
  const saleId = parseInt(id, 10);
  if (isNaN(saleId)) {
    return NextResponse.json({ success: false, error: 'Invalid sale ID' }, { status: 400 });
  }
  
  // Prepare update payload
  const updatePayload = {
    updatedAt: new Date()
  };
  
  if (updateData.newAdmission !== undefined) {
    updatePayload.newAdmission = (String(updateData.newAdmission).trim().toLowerCase() === 'yes') ? 'Yes' : 'No';
  }
  if (updateData.amount !== undefined) {
    updatePayload.amount = Math.round(Number(updateData.amount) || 0);
  }
  if (updateData.ogaName !== undefined) {
    updatePayload.ogaName = String(updateData.ogaName).trim();
  }
  if (updateData.customerName !== undefined) {
    updatePayload.customerName = updateData.customerName;
  }
  if (updateData.courseName !== undefined) {
    updatePayload.courseName = updateData.courseName;
  }
  if (updateData.stageNotes !== undefined) {
    updatePayload.stageNotes = updateData.stageNotes;
  }
  
  let updateResult;
  if (tenantId) {
    updateResult = await db
      .update(sales)
      .set(updatePayload)
      .where(and(
        eq(sales.id, saleId),
        eq(sales.tenantId, tenantId)
      ))
      .returning({ id: sales.id });
  } else {
    updateResult = await db
      .update(sales)
      .set(updatePayload)
      .where(eq(sales.id, saleId))
      .returning({ id: sales.id });
  }
  
  if (updateResult.length > 0) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'Sale not found or not updated' }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest) {
  // Authenticate the request - deleting sales requires login
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.statusCode);
  }

  const { tenantId } = await getTenantContextFromRequest(request);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing sale ID' }, { status: 400 });
  }
  
  const saleId = parseInt(id, 10);
  if (isNaN(saleId)) {
    return NextResponse.json({ success: false, error: 'Invalid sale ID' }, { status: 400 });
  }
  
  let deleteResult;
  if (tenantId) {
    deleteResult = await db
      .delete(sales)
      .where(and(
        eq(sales.id, saleId),
        eq(sales.tenantId, tenantId)
      ))
      .returning({ id: sales.id });
  } else {
    deleteResult = await db
      .delete(sales)
      .where(eq(sales.id, saleId))
      .returning({ id: sales.id });
  }
  
  if (deleteResult.length > 0) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 });
  }
}
