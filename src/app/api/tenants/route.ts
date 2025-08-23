import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: Request) {
  try {
    // Check if the request is multipart/form-data (file upload)
    const contentType = req.headers.get("content-type");
    
    if (contentType && contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await req.formData();
      const subdomain = String(formData.get("subdomain") || "").trim().toLowerCase();
      const name = String(formData.get("name") || subdomain);
      const metadata = formData.get("metadata") ? JSON.parse(String(formData.get("metadata"))) : null;
      const logoFile = formData.get("logo") as File | null;

      if (!subdomain || !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
        return NextResponse.json({ error: "Invalid subdomain" }, { status: 400 });
      }

      const existing = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.subdomain, subdomain))
        .limit(1);
      if (existing[0]?.id) {
        return NextResponse.json({ error: "Subdomain already exists" }, { status: 409 });
      }

      // Create tenant first
      const inserted = await db
        .insert(tenants)
        .values({ subdomain, name, metadata })
        .returning();

      const tenantId = inserted[0].id;

      // Handle logo upload if provided
      if (logoFile && logoFile instanceof File) {
        try {
          // Create uploads directory if it doesn't exist
          const uploadsDir = join(process.cwd(), "public", "uploads", "logos", tenantId.toString());
          if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
          }

          // Generate unique filename
          const fileExtension = logoFile.name.split('.').pop();
          const fileName = `logo.${fileExtension}`;
          const filePath = join(uploadsDir, fileName);

          // Convert File to Buffer and save
          const bytes = await logoFile.arrayBuffer();
          const buffer = Buffer.from(bytes);
          await writeFile(filePath, buffer);

          // Update tenant with logo path
          const logoPath = `/uploads/logos/${tenantId}/${fileName}`;
          
          await db
            .update(tenants)
            .set({ 
              metadata: { 
                ...metadata, 
                logoPath: logoPath
              } 
            })
            .where(eq(tenants.id, tenantId));

        } catch (logoError) {
          console.error("Logo upload failed:", logoError);
          // Logo upload failed, but tenant was created successfully
          // We don't want to fail the entire request for logo issues
        }
      }

      return NextResponse.json({ tenant: inserted[0] }, { status: 201 });
    } else {
      // Handle JSON request (backward compatibility)
      const body = await req.json();
      const subdomain = String(body.subdomain || "").trim().toLowerCase();
      const name = String(body.name || subdomain);
      const metadata = body.metadata ?? null;

      if (!subdomain || !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
        return NextResponse.json({ error: "Invalid subdomain" }, { status: 400 });
      }

      const existing = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.subdomain, subdomain))
        .limit(1);
      if (existing[0]?.id) {
        return NextResponse.json({ error: "Subdomain already exists" }, { status: 409 });
      }

      const inserted = await db
        .insert(tenants)
        .values({ subdomain, name, metadata })
        .returning();

      return NextResponse.json({ tenant: inserted[0] }, { status: 201 });
    }
  } catch (err: any) {
    console.error("Tenant creation error:", err);
    return NextResponse.json({ error: err?.message || "Failed to create tenant" }, { status: 500 });
  }
}


