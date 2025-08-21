import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";

export async function GET() {
  try {
    const allTenants = await db.select().from(tenants).orderBy(tenants.createdAt);
    
    return NextResponse.json({ 
      success: true, 
      tenants: allTenants 
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Failed to fetch tenants" 
      }, 
      { status: 500 }
    );
  }
}
