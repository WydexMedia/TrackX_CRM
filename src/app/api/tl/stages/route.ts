import { NextRequest } from "next/server";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { leadStages } from "@/db/schema";
import { requireTenantIdFromRequest } from "@/lib/tenant";
import { authenticateToken, createUnauthorizedResponse } from "@/lib/authMiddleware";

// GET - Fetch all stages for tenant
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

    const stages = await db
      .select()
      .from(leadStages)
      .where(eq(leadStages.tenantId, tenantId))
      .orderBy(asc(leadStages.order));

    return new Response(JSON.stringify({ success: true, stages }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch stages" }), { status: 500 });
  }
}

// POST - Create new stage
export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(req as any);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.errorCode, authResult.statusCode);
    }

    const body = await req.json();
    const { name, color, order } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return new Response(JSON.stringify({ success: false, error: "Stage name is required" }), { status: 400 });
    }

    let tenantId: number;
    try {
      tenantId = await requireTenantIdFromRequest(req as any);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Tenant not resolved" }), { status: 400 });
    }

    const values = {
      name: name.trim(),
      color: color || "slate",
      order: typeof order === "number" ? order : 999,
      isDefault: false,
      tenantId: tenantId,
    };

    const inserted = await db.insert(leadStages).values(values as any).returning();

    return new Response(JSON.stringify({ success: true, stage: inserted[0] }), { status: 201 });
  } catch (e: any) {
    const msg = String(e?.message || "Failed to create stage");
    if (msg.includes("duplicate key") || msg.includes("unique")) {
      return new Response(JSON.stringify({ success: false, error: "A stage with this name already exists" }), { status: 409 });
    }
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500 });
  }
}

// PATCH - Update stage
export async function PATCH(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(req as any);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.errorCode, authResult.statusCode);
    }

    const body = await req.json();
    const { id, name, color, order } = body || {};

    if (!id || typeof id !== "number") {
      return new Response(JSON.stringify({ success: false, error: "Stage id is required" }), { status: 400 });
    }

    let tenantId: number;
    try {
      tenantId = await requireTenantIdFromRequest(req as any);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Tenant not resolved" }), { status: 400 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (name && typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (color && typeof color === "string") {
      updateData.color = color;
    }
    if (typeof order === "number") {
      updateData.order = order;
    }

    const updated = await db
      .update(leadStages)
      .set(updateData)
      .where(and(eq(leadStages.id, id), eq(leadStages.tenantId, tenantId)))
      .returning();

    if (!updated.length) {
      return new Response(JSON.stringify({ success: false, error: "Stage not found or unauthorized" }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, stage: updated[0] }), { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || "Failed to update stage");
    if (msg.includes("duplicate key") || msg.includes("unique")) {
      return new Response(JSON.stringify({ success: false, error: "A stage with this name already exists" }), { status: 409 });
    }
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500 });
  }
}

// DELETE - Delete stage
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
      return new Response(JSON.stringify({ success: false, error: "Stage id is required" }), { status: 400 });
    }

    let tenantId: number;
    try {
      tenantId = await requireTenantIdFromRequest(req as any);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Tenant not resolved" }), { status: 400 });
    }

    // Check if stage is default
    const stage = await db
      .select()
      .from(leadStages)
      .where(and(eq(leadStages.id, id), eq(leadStages.tenantId, tenantId)))
      .limit(1);

    if (!stage.length) {
      return new Response(JSON.stringify({ success: false, error: "Stage not found" }), { status: 404 });
    }

    if (stage[0].isDefault) {
      return new Response(JSON.stringify({ success: false, error: "Cannot delete default stage" }), { status: 400 });
    }

    const deleted = await db
      .delete(leadStages)
      .where(and(eq(leadStages.id, id), eq(leadStages.tenantId, tenantId)))
      .returning();

    return new Response(JSON.stringify({ success: true, deleted: deleted[0] }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to delete stage" }), { status: 500 });
  }
}

