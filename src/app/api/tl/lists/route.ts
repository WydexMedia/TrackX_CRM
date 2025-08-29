import { NextRequest } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { sql as dsql } from "drizzle-orm";
import { db } from "@/db/client";
import { leadLists, leadListItems } from "@/db/schema";
import { requireTenantIdFromRequest } from "@/lib/tenant";

async function ensureTables() {
  await db.execute(dsql`CREATE TABLE IF NOT EXISTS lead_lists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    tenant_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(dsql`CREATE TABLE IF NOT EXISTS lead_list_items (
    id SERIAL PRIMARY KEY,
    list_id INTEGER NOT NULL,
    lead_phone VARCHAR(32) NOT NULL,
    tenant_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db.execute(dsql`CREATE UNIQUE INDEX IF NOT EXISTS lead_list_items_unique ON lead_list_items (list_id, lead_phone, tenant_id)`);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");
    
    if (listId) {
      // Return items for a specific list
      const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
      const items = await db
        .select({ leadPhone: leadListItems.leadPhone })
        .from(leadListItems)
        .where(tenantId ? and(eq(leadListItems.listId, Number(listId)), eq(leadListItems.tenantId, tenantId)) : eq(leadListItems.listId, Number(listId)));
      return new Response(JSON.stringify({ success: true, items }), { status: 200 });
    }
    
    // Return all lists
    const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
    const rows = await db
      .select({ id: leadLists.id, name: leadLists.name, createdAt: leadLists.createdAt })
      .from(leadLists)
      .where(tenantId ? eq(leadLists.tenantId, tenantId) : (sql`1=1` as any))
      .orderBy(leadLists.createdAt);
    return new Response(JSON.stringify({ success: true, rows }), { status: 200 });
  } catch (e: any) {
    // Try auto-create then retry once
    if (String(e?.message || "").toLowerCase().includes("relation") && String(e?.message).includes("lead_lists")) {
      try {
        await ensureTables();
        const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
        const rows = await db
          .select({ id: leadLists.id, name: leadLists.name, createdAt: leadLists.createdAt })
          .from(leadLists)
          .where(tenantId ? eq(leadLists.tenantId, tenantId) : (sql`1=1` as any))
          .orderBy(leadLists.createdAt);
        return new Response(JSON.stringify({ success: true, rows }), { status: 200 });
      } catch {}
    }
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch lists" }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string" || name.trim() === "") {
      return new Response(JSON.stringify({ success: false, error: "name is required" }), { status: 400 });
    }
    const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
    const [created] = await db
      .insert(leadLists)
      .values({ name: name.trim(), tenantId: tenantId || null } as any)
      .returning({ id: leadLists.id, name: leadLists.name });
    return new Response(JSON.stringify({ success: true, list: created }), { status: 201 });
  } catch (e: any) {
    // Check for table missing error - try multiple error patterns
    const errorMsg = String(e?.message || "").toLowerCase();
    const isTableMissing = errorMsg.includes("relation") || 
                          errorMsg.includes("table") || 
                          errorMsg.includes("does not exist") ||
                          errorMsg.includes("lead_lists");
    
    if (isTableMissing) {
      try {
        console.log("Auto-creating tables due to error:", e?.message);
        await ensureTables();
        const { name } = await req.json();
        const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
        const [created] = await db
          .insert(leadLists)
          .values({ name: (name || "").trim(), tenantId: tenantId || null } as any)
          .returning({ id: leadLists.id, name: leadLists.name });
        return new Response(JSON.stringify({ success: true, list: created }), { status: 201 });
      } catch (e2: any) {
        console.log("Auto-create failed:", e2?.message);
        return new Response(JSON.stringify({ success: false, error: e2?.message || "Failed to create list" }), { status: 500 });
      }
    }
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to create list" }), { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { listId, phones } = await req.json();
    console.log("PUT request - listId:", listId, "phones:", phones);
    
    if (!listId || !Array.isArray(phones) || phones.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "listId and phones[] required" }), { status: 400 });
    }
    const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
    console.log("PUT request - tenantId:", tenantId);

    // Ensure list belongs to tenant
    const exists = await db
      .select({ id: leadLists.id })
      .from(leadLists)
      .where(tenantId ? and(eq(leadLists.id, Number(listId)), eq(leadLists.tenantId, tenantId)) : eq(leadLists.id, Number(listId)))
      .limit(1);
    if (!exists.length) {
      return new Response(JSON.stringify({ success: false, error: "List not found" }), { status: 404 });
    }

    const values = (phones as string[]).map((p) => ({ listId: Number(listId), leadPhone: String(p), tenantId: tenantId || null } as any));
    console.log("PUT request - inserting values:", values);
    
    let insertedCount = 0;
    for (const v of values) {
      try {
        await db.insert(leadListItems).values(v);
        insertedCount++;
        console.log("Successfully inserted:", v);
      } catch (insertError: any) {
        console.log("Failed to insert:", v, "Error:", insertError?.message);
        // Don't silently ignore - return error
        return new Response(JSON.stringify({ success: false, error: `Failed to insert phone ${v.leadPhone}: ${insertError?.message}` }), { status: 500 });
      }
    }

    console.log("PUT request - inserted", insertedCount, "items");
    return new Response(JSON.stringify({ success: true, inserted: insertedCount }), { status: 200 });
  } catch (e: any) {
    console.log("PUT request - outer error:", e?.message);
    if (String(e?.message || "").toLowerCase().includes("relation") && (String(e?.message).includes("lead_lists") || String(e?.message).includes("lead_list_items"))) {
      try {
        await ensureTables();
        const { listId, phones } = await req.json();
        const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
        const values = (phones as string[]).map((p) => ({ listId: Number(listId), leadPhone: String(p), tenantId: tenantId || null } as any));
        let insertedCount = 0;
        for (const v of values) {
          try { 
            await db.insert(leadListItems).values(v); 
            insertedCount++;
          } catch (insertError: any) {
            console.log("Auto-create retry failed to insert:", v, "Error:", insertError?.message);
            return new Response(JSON.stringify({ success: false, error: `Failed to insert phone ${v.leadPhone}: ${insertError?.message}` }), { status: 500 });
          }
        }
        return new Response(JSON.stringify({ success: true, inserted: insertedCount }), { status: 200 });
      } catch (e2: any) {
        return new Response(JSON.stringify({ success: false, error: e2?.message || "Failed to add to list" }), { status: 500 });
      }
    }
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to add to list" }), { status: 500 });
  }
} 

export async function PATCH(req: NextRequest) {
  try {
    await ensureTables();
    return new Response(JSON.stringify({ success: true, message: "Tables created" }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to create tables" }), { status: 500 });
  }
} 