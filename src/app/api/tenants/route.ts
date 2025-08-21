import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
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
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create tenant" }, { status: 500 });
  }
}


