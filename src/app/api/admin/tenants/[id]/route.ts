import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = parseInt(id);
    if (isNaN(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Invalid tenant ID" },
        { status: 400 }
      );
    }

    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant[0]) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant: tenant[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch tenant",
      },
      { status: 500 }
    );
  }
}

interface TenantMetadata {
  logoPath?: string;
  [key: string]: any;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = parseInt(id);

    if (isNaN(tenantId)) {
      return NextResponse.json(
        { success: false, error: "Invalid tenant ID" },
        { status: 400 }
      );
    }

    // Get tenant info before deletion (for logo cleanup)
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (tenant.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Delete logo files if they exist
    const metadata = tenant[0].metadata as TenantMetadata;
    if (metadata?.logoPath) {
      try {
        const logoPath = metadata.logoPath;
        const fullPath = join(process.cwd(), "public", logoPath);
        
        if (existsSync(fullPath)) {
          await unlink(fullPath);
          console.log(`Logo file deleted: ${fullPath}`);
        }
        
        // Also try to delete the tenant's logo directory
        const logoDir = join(process.cwd(), "public", "uploads", "logos", tenantId.toString());
        if (existsSync(logoDir)) {
          // Note: We can't easily delete directories with files in Node.js without additional packages
          // For now, we'll just delete the logo file
          console.log(`Logo directory exists: ${logoDir}`);
        }
      } catch (logoError) {
        console.error("Error deleting logo files:", logoError);
        // Continue with tenant deletion even if logo cleanup fails
      }
    }

    // Delete the tenant from database
    await db.delete(tenants).where(eq(tenants.id, tenantId));

    return NextResponse.json({ 
      success: true, 
      message: "Tenant deleted successfully" 
    });

  } catch (error: any) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Failed to delete tenant" 
      },
      { status: 500 }
    );
  }
}
