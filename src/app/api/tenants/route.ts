import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getMongoDb } from "@/lib/mongoClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const subdomain = url.searchParams.get('subdomain');
    
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain parameter is required" }, { status: 400 });
    }

    const normalizedSubdomain = subdomain.trim().toLowerCase();
    
    // Check if subdomain already exists
    const existing = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.subdomain, normalizedSubdomain))
      .limit(1);

    return NextResponse.json({ 
      exists: !!existing[0]?.id,
      subdomain: normalizedSubdomain 
    });
  } catch (err: any) {
    console.error("Subdomain check error:", err);
    return NextResponse.json({ error: err?.message || "Failed to check subdomain" }, { status: 500 });
  }
}

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
      // Handle JSON request (signup form data)
      const body = await req.json();
      const subdomain = String(body.subdomain || "").trim().toLowerCase();
      const companyName = String(body.companyName || "");
      const contactName = String(body.contactName || "");
      const email = String(body.email || "");
      const phone = String(body.phone || "");
      const website = String(body.website || "");
      const password = String(body.password || "");

      // Validate required fields
      if (!subdomain || !companyName || !contactName || !email || !password) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // Validate subdomain format (minimum 4 characters, alphanumeric and hyphens)
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain) || subdomain.length < 4) {
        return NextResponse.json({ error: "Invalid subdomain format" }, { status: 400 });
      }

      // Check if subdomain already exists
      const existing = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.subdomain, subdomain))
        .limit(1);
      if (existing[0]?.id) {
        return NextResponse.json({ error: "Subdomain already exists" }, { status: 409 });
      }

      // Create tenant with signup data
      const metadata = {
        companyName,
        contactName,
        email,
        phone,
        website,
        password, // Note: In production, this should be hashed
        createdAt: new Date().toISOString()
      };

      const inserted = await db
        .insert(tenants)
        .values({ 
          subdomain, 
          name: companyName, 
          metadata 
        })
        .returning();

      const tenantId = inserted[0].id;

      // Create team leader user in MongoDB
      try {
        const mongoDb = await getMongoDb();
        const users = mongoDb.collection('users');
        
        const teamLeader = {
          name: contactName,
          code: email, // Use email as the employee code
          email: email,
          password: password, // Note: In production, this should be hashed
          role: "teamleader",
          target: 0,
          tenantSubdomain: subdomain,
          tenantId: tenantId,
          createdAt: new Date()
        };
        
        await users.insertOne(teamLeader);
        
        console.log(`Team leader created for tenant ${subdomain}:`, {
          name: teamLeader.name,
          code: teamLeader.code, // This is now the email
          email: teamLeader.email,
          role: teamLeader.role
        });
        
      } catch (mongoError) {
        console.error("Failed to create team leader user:", mongoError);
        // Don't fail the entire request if user creation fails
        // The tenant was created successfully
      }

      return NextResponse.json({ 
        tenant: inserted[0],
        message: "Account created successfully"
      }, { status: 201 });
    }
  } catch (err: any) {
    console.error("Tenant creation error:", err);
    return NextResponse.json({ error: err?.message || "Failed to create tenant" }, { status: 500 });
  }
}


