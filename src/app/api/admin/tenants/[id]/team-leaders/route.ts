import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not configured");
}

let clientPromise: Promise<MongoClient> | undefined;

if (!clientPromise) {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Get all team leaders for a tenant
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise!;
    const mongoDb = client.db();
    const users = mongoDb.collection("users");

    // Get tenant details to get the subdomain
    const tenantId = parseInt(id);
    const tenantResult = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    if (!tenantResult[0]) {
      throw new Error("Tenant not found");
    }
    
    const tenantSubdomain = tenantResult[0].subdomain;
    
    // Get team leaders for this specific tenant
    const teamLeaders = await users
      .find({
        role: "teamleader",
        tenantSubdomain: tenantSubdomain,
      })
      .sort({ createdAt: -1 })
      .toArray();

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
    const { code, name, email, phone, password, role, tenantSubdomain } = body;

    if (!code || !name || !email || !password || !tenantSubdomain) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await clientPromise!;
    const db = client.db();
    const users = db.collection("users");

    // Check if user with same code already exists in this tenant
    const existingUser = await users.findOne({
      code,
      tenantSubdomain,
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "User with this code already exists in this tenant" },
        { status: 409 }
      );
    }

    // Create new team leader
    const newTeamLeader = {
      code,
      name,
      email,
      phone: phone || null,
      password,
      role: role || "teamleader",
      tenantSubdomain,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(newTeamLeader);

    return NextResponse.json({
      success: true,
      teamLeader: {
        _id: result.insertedId,
        ...newTeamLeader,
      },
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
