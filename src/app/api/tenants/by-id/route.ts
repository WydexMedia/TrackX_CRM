import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticateRequest, createUnauthorizedResponse } from "@/lib/clerkAuth";

/**
 * Get tenant by ID
 * Used to get tenant subdomain for redirect purposes
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return createUnauthorizedResponse(authResult.error, authResult.statusCode);
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "tenantId parameter is required" },
        { status: 400 }
      );
    }

    const tenantIdNum = parseInt(tenantId);
    if (isNaN(tenantIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid tenantId" },
        { status: 400 }
      );
    }

    const tenantResult = await db
      .select({
        id: tenants.id,
        subdomain: tenants.subdomain,
        name: tenants.name,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantIdNum))
      .limit(1);

    if (tenantResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant: tenantResult[0],
    });
  } catch (error: any) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch tenant",
      },
      { status: 500 }
    );
  }
}


