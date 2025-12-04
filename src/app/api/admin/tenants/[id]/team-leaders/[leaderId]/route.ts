import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

// Update a team leader
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; leaderId: string }> }
) {
  try {
    const { id, leaderId } = await params;
    const body = await req.json();
    const { code, name, email, phone, password, role } = body;
    const tenantId = parseInt(id);
    const userId = parseInt(leaderId);

    if (!code || !name || !email) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid leader ID" },
        { status: 400 }
      );
    }

    // Check if user with same code already exists in this tenant (excluding current user)
    const existingUsers = await db
      .select()
      .from(users)
      .where(and(
        eq(users.code, code),
        eq(users.tenantId, tenantId),
        ne(users.id, userId)
      ))
      .limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: "User with this code already exists in this tenant" },
        { status: 409 }
      );
    }

    // Prepare update data
    const updateData: any = {
      code,
      name,
      email,
      role: role || "teamleader",
      updatedAt: new Date(),
    };

    // Only update password if provided
    if (password && password.trim() !== "") {
      updateData.password = password;
    }

    // Update the team leader
    const updateResult = await db
      .update(users)
      .set(updateData)
      .where(and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId)
      ))
      .returning({ id: users.id });

    if (updateResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Team leader not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Team leader updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to update team leader",
      },
      { status: 500 }
    );
  }
}

// Delete a team leader
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; leaderId: string }> }
) {
  try {
    const { id, leaderId } = await params;
    const tenantId = parseInt(id);
    const userId = parseInt(leaderId);

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid leader ID" },
        { status: 400 }
      );
    }

    // Delete the team leader
    const deleteResult = await db
      .delete(users)
      .where(and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId),
        eq(users.role, "teamleader")
      ))
      .returning({ id: users.id });

    if (deleteResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Team leader not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Team leader deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to delete team leader",
      },
      { status: 500 }
    );
  }
}
