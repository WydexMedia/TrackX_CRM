import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { tenants, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Get all team leaders for a tenant
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get tenant details to verify it exists
    const tenantId = parseInt(id);
    const tenantResult = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    if (!tenantResult[0]) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      );
    }
    
    // Get team leaders for this specific tenant
    const teamLeaders = await db
      .select()
      .from(users)
      .where(and(
        eq(users.role, "teamleader"),
        eq(users.tenantId, tenantId)
      ))
      .orderBy(desc(users.createdAt));

    return NextResponse.json({
      success: true,
      teamLeaders,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch team leaders",
      },
      { status: 500 }
    );
  }
}

// Create a new team leader
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { code, name, email, phone, password, role } = body;
    const { id } = await params;
    const tenantId = parseInt(id);

    if (!code || !name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenantResult = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    if (!tenantResult[0]) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Check if user with same code already exists in this tenant
    const existingUsers = await db
      .select()
      .from(users)
      .where(and(
        eq(users.code, code),
        eq(users.tenantId, tenantId)
      ))
      .limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: "User with this code already exists in this tenant" },
        { status: 409 }
      );
    }

    // Create new team leader
    const [newTeamLeader] = await db
      .insert(users)
      .values({
        code,
        name,
        email,
        password,
        role: role || "teamleader",
        target: 0,
        tenantId: tenantId,
      })
      .returning();

    return NextResponse.json({
      success: true,
      teamLeader: newTeamLeader,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to create team leader",
      },
      { status: 500 }
    );
  }
}
