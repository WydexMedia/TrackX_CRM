import { NextRequest, NextResponse } from "next/server";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { courses } from "@/db/schema";
import { requireTenantIdFromRequest } from "@/lib/tenant";
import { authenticateToken, createUnauthorizedResponse } from "@/lib/authMiddleware";
import { addPerformanceHeaders, CACHE_DURATION } from "@/lib/performance";

// GET - Fetch all courses for tenant
export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(req as any);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.errorCode, authResult.statusCode);
    }

    let tenantId: number;
    try {
      tenantId = await requireTenantIdFromRequest(req as any);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Tenant not resolved" }), { status: 400 });
    }

    const coursesList = await db
      .select()
      .from(courses)
      .where(and(eq(courses.tenantId, tenantId), eq(courses.isActive, true)))
      .orderBy(asc(courses.name));

    const response = NextResponse.json({ success: true, courses: coursesList });
    return addPerformanceHeaders(response, CACHE_DURATION.LONG);
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch courses" }), { status: 500 });
  }
}

// POST - Create new course
export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(req as any);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.errorCode, authResult.statusCode);
    }

    const body = await req.json();
    const { name, price, description } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return new Response(JSON.stringify({ success: false, error: "Course name is required" }), { status: 400 });
    }

    if (!price || typeof price !== "number" || price <= 0) {
      return new Response(JSON.stringify({ success: false, error: "Valid price is required" }), { status: 400 });
    }

    let tenantId: number;
    try {
      tenantId = await requireTenantIdFromRequest(req as any);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Tenant not resolved" }), { status: 400 });
    }

    // Check if course with same name already exists for this tenant
    const existingCourse = await db
      .select()
      .from(courses)
      .where(and(eq(courses.name, name.trim()), eq(courses.tenantId, tenantId)))
      .limit(1);

    if (existingCourse.length > 0) {
      return new Response(JSON.stringify({ success: false, error: "A course with this name already exists" }), { status: 409 });
    }

    const values = {
      name: name.trim(),
      price: Math.round(price * 100), // Convert to cents
      description: description?.trim() || null,
      isActive: true,
      tenantId: tenantId,
    };

    const inserted = await db.insert(courses).values(values as any).returning();

    return new Response(JSON.stringify({ success: true, course: inserted[0] }), { status: 201 });
  } catch (e: any) {
    console.error("Course creation error:", e);
    const msg = String(e?.message || "Failed to create course");
    if (msg.includes("duplicate key") || msg.includes("unique") || msg.includes("course_tenant_name_idx")) {
      return new Response(JSON.stringify({ success: false, error: "A course with this name already exists" }), { status: 409 });
    }
    // Don't expose internal database errors to the user
    return new Response(JSON.stringify({ success: false, error: "Failed to create course. Please try again." }), { status: 500 });
  }
}

// PATCH - Update course
export async function PATCH(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(req as any);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.errorCode, authResult.statusCode);
    }

    const body = await req.json();
    const { id, name, price, description, isActive } = body || {};

    if (!id || typeof id !== "number") {
      return new Response(JSON.stringify({ success: false, error: "Course id is required" }), { status: 400 });
    }

    let tenantId: number;
    try {
      tenantId = await requireTenantIdFromRequest(req as any);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Tenant not resolved" }), { status: 400 });
    }

    // Get the current course data (before update) to check if name is changing
    const currentCourse = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, id), eq(courses.tenantId, tenantId)))
      .limit(1);

    if (!currentCourse.length) {
      return new Response(JSON.stringify({ success: false, error: "Course not found or unauthorized" }), { status: 404 });
    }

    // If name is being changed, check if new name already exists for this tenant
    if (name && typeof name === "string" && name.trim() && name.trim() !== currentCourse[0].name) {
      const existingCourse = await db
        .select()
        .from(courses)
        .where(and(eq(courses.name, name.trim()), eq(courses.tenantId, tenantId)))
        .limit(1);

      if (existingCourse.length > 0) {
        return new Response(JSON.stringify({ success: false, error: "A course with this name already exists" }), { status: 409 });
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (name && typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (price && typeof price === "number" && price > 0) {
      updateData.price = Math.round(price * 100); // Convert to cents
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }

    const updated = await db
      .update(courses)
      .set(updateData)
      .where(and(eq(courses.id, id), eq(courses.tenantId, tenantId)))
      .returning();

    return new Response(JSON.stringify({ success: true, course: updated[0] }), { status: 200 });
  } catch (e: any) {
    console.error("Course update error:", e);
    const msg = String(e?.message || "Failed to update course");
    if (msg.includes("duplicate key") || msg.includes("unique") || msg.includes("course_tenant_name_idx")) {
      return new Response(JSON.stringify({ success: false, error: "A course with this name already exists" }), { status: 409 });
    }
    // Don't expose internal database errors to the user
    return new Response(JSON.stringify({ success: false, error: "Failed to update course. Please try again." }), { status: 500 });
  }
}

// DELETE - Delete course (soft delete by setting isActive to false)
export async function DELETE(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(req as any);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.errorCode, authResult.statusCode);
    }

    const body = await req.json();
    const { id } = body || {};

    if (!id || typeof id !== "number") {
      return new Response(JSON.stringify({ success: false, error: "Course id is required" }), { status: 400 });
    }

    let tenantId: number;
    try {
      tenantId = await requireTenantIdFromRequest(req as any);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Tenant not resolved" }), { status: 400 });
    }

    // Soft delete by setting isActive to false
    const updated = await db
      .update(courses)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(courses.id, id), eq(courses.tenantId, tenantId)))
      .returning();

    if (!updated.length) {
      return new Response(JSON.stringify({ success: false, error: "Course not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, course: updated[0] }), { status: 200 });
  } catch (e: any) {
    console.error("Course deletion error:", e);
    // Don't expose internal database errors to the user
    return new Response(JSON.stringify({ success: false, error: "Failed to delete course. Please try again." }), { status: 500 });
  }
}
