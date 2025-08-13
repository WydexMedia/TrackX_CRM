import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { integrations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(integrations).orderBy(desc(integrations.createdAt));
    return new Response(JSON.stringify({ success: true, rows }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch integrations" }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, name, status } = body || {};
    if (!provider || !name) {
      return new Response(JSON.stringify({ success: false, error: "provider and name required" }), { status: 400 });
    }
    const inserted = await db.insert(integrations).values({ provider, name, status: status || "NOT_CONFIGURED" } as any).returning({ id: integrations.id });
    return new Response(JSON.stringify({ success: true, id: inserted[0]?.id }), { status: 201 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to create integration" }), { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Accept id from JSON body or query string for flexibility
    const body = await req.json().catch(() => null);
    const idRaw = body?.id ?? new URL(req.url).searchParams.get("id");
    const id = typeof idRaw === "string" ? parseInt(idRaw, 10) : idRaw;
    if (!id || Number.isNaN(id)) {
      return new Response(JSON.stringify({ success: false, error: "id required" }), { status: 400 });
    }
    await db.delete(integrations).where(eq(integrations.id, id as number));
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to delete integration" }), { status: 500 });
  }
}


