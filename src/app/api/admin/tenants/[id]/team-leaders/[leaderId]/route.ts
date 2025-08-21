import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not configured");
}

let clientPromise: Promise<MongoClient> | undefined;

if (!clientPromise) {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Update a team leader
export async function PUT(
  req: Request,
  { params }: { params: { id: string; leaderId: string } }
) {
  try {
    const body = await req.json();
    const { code, name, email, phone, password, role, tenantSubdomain } = body;

    if (!code || !name || !email || !tenantSubdomain) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await clientPromise!;
    const db = client.db();
    const users = db.collection("users");

    // Check if user with same code already exists in this tenant (excluding current user)
    const existingUser = await users.findOne({
      code,
      tenantSubdomain,
      _id: { $ne: new ObjectId(params.leaderId) },
    });

    if (existingUser) {
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
      phone: phone || null,
      role: role || "teamleader",
      tenantSubdomain,
      updatedAt: new Date(),
    };

    // Only update password if provided
    if (password && password.trim() !== "") {
      updateData.password = password;
    }

    // Update the team leader
    const result = await users.updateOne(
      { _id: new ObjectId(params.leaderId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
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
  { params }: { params: { id: string; leaderId: string } }
) {
  try {
    const client = await clientPromise!;
    const db = client.db();
    const users = db.collection("users");

    // Delete the team leader
    const result = await users.deleteOne({
      _id: new ObjectId(params.leaderId),
    });

    if (result.deletedCount === 0) {
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
