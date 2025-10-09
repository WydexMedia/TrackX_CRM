import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { leadEvents } from "@/db/schema";
import { requireTenantIdFromRequest } from "@/lib/tenant";
import { authenticateToken, createUnauthorizedResponse } from "@/lib/authMiddleware";

export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(req as any);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.errorCode, authResult.statusCode);
    }

    const { phone, note } = await req.json();
    
    if (!phone || !note) {
      return new Response(JSON.stringify({ success: false, error: "Phone and note are required" }), { status: 400 });
    }

    // Get tenant ID
    let tenantId: number;
    try {
      tenantId = await requireTenantIdFromRequest(req as any);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Tenant not resolved" }), { status: 400 });
    }

    // Add note event to lead events
    await db.insert(leadEvents).values({
      leadPhone: phone,
      type: "NOTE_ADDED",
      data: { note: note.trim() },
      actorId: authResult.user?.email || null,
      at: new Date(),
      tenantId: tenantId
    } as any);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to add note" }), { status: 500 });
  }
} 