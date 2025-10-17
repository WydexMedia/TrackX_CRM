import { NextRequest } from "next/server";
import { and, asc, desc, eq, isNull, sql, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, tasks, settings, leadEvents } from "@/db/schema";
import { MongoClient } from "mongodb";
import { getTenantContextFromRequest } from "@/lib/mongoTenant";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "unassigned"; // unassigned|aging|hot
    const limit = Number(searchParams.get("limit") || 25);
    const offset = Number(searchParams.get("offset") || 0);
    const { tenantId } = await getTenantContextFromRequest(req as any);

    let where: any = undefined;
    if (tab === "unassigned") where = isNull(leads.ownerId);
    if (tab === "aging") where = undefined; // handled by order
    if (tab === "hot") where = eq(leads.stage, "Not contacted");

    const order = tab === "aging" ? asc(leads.createdAt) : desc(leads.createdAt);

    const rows = await db
      .select()
      .from(leads)
      .where(tenantId ? and(where as any, eq(leads.tenantId, tenantId)) : where as any)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    const totalRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(leads)
      .where(tenantId ? and(where as any, eq(leads.tenantId, tenantId)) : where as any);

    return new Response(JSON.stringify({ success: true, rows, total: Number((totalRow[0] as any)?.c || 0) }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch queue" }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body || {};
    const { tenantId, tenantSubdomain } = await getTenantContextFromRequest(req as any);
    if (action === "assign") {
      const { phones, ownerId, actorId } = body as { phones: string[]; ownerId: string; actorId?: string };
      if (!Array.isArray(phones) || !ownerId) {
        return new Response(JSON.stringify({ success: false, error: "phones[] and ownerId required" }), { status: 400 });
      }
      // Capture previous owners before update
      const existing = await db
        .select({ phone: leads.phone, ownerId: leads.ownerId })
        .from(leads)
        .where(tenantId ? and(inArray(leads.phone, phones), eq(leads.tenantId, tenantId)) : inArray(leads.phone, phones));
      const prevOwnerByPhone = new Map(existing.map((r: any) => [r.phone, r.ownerId as string | null]));

      await db.update(leads).set({ ownerId }).where(tenantId ? and(inArray(leads.phone, phones), eq(leads.tenantId, tenantId)) : inArray(leads.phone, phones));
      // timeline events with from → to and actorId
      const eventValues = phones.map((p) => ({
        leadPhone: p,
        type: "ASSIGNED",
        data: { from: (prevOwnerByPhone.get(p) || "unassigned"), to: ownerId, actorId: actorId || "system" },
        at: new Date(),
        actorId: actorId || null,
        tenantId: tenantId || null,
      }));
      if (eventValues.length) {
        await db.insert(leadEvents).values(eventValues as any);
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    if (action === "bulkTask") {
      const { phones, title, dueAt, ownerId } = body as { phones: string[]; title: string; dueAt?: string; ownerId?: string };
      if (!Array.isArray(phones) || !title) {
        return new Response(JSON.stringify({ success: false, error: "phones[] and title required" }), { status: 400 });
      }
      const values = phones.map((p) => ({ 
        leadPhone: p, 
        title, 
        status: "OPEN", 
        dueAt: dueAt ? new Date(dueAt) : null, 
        ownerId: ownerId || null,
        tenantId: tenantId || null 
      }));
      await db.insert(tasks).values(values as any);
      return new Response(JSON.stringify({ success: true }), { status: 201 });
    }
    if (action === "bulkStageUpdate") {
      const { phones, stage, actorId } = body as { phones: string[]; stage: string; actorId?: string };
      if (!Array.isArray(phones) || !stage) {
        return new Response(JSON.stringify({ success: false, error: "phones[] and stage required" }), { status: 400 });
      }
      // Capture previous stages before update
      const existing = await db
        .select({ phone: leads.phone, stage: leads.stage })
        .from(leads)
        .where(tenantId ? and(inArray(leads.phone, phones), eq(leads.tenantId, tenantId)) : inArray(leads.phone, phones));
      const prevStageByPhone = new Map(existing.map((r: any) => [r.phone, r.stage as string]));

      // Update stages
      await db.update(leads)
        .set({ stage, updatedAt: new Date() })
        .where(tenantId ? and(inArray(leads.phone, phones), eq(leads.tenantId, tenantId)) : inArray(leads.phone, phones));
      
      // Create timeline events for stage changes
      const eventValues = phones.map((p) => ({
        leadPhone: p,
        type: "STAGE_CHANGE",
        data: { from: prevStageByPhone.get(p) || "Unknown", to: stage, actorId: actorId || "system" },
        at: new Date(),
        actorId: actorId || null,
        tenantId: tenantId || null,
      }));
      if (eventValues.length) {
        await db.insert(leadEvents).values(eventValues as any);
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    if (action === "autoAssign") {
      const { phones, actorId, selectedSalesPersons } = body as { phones: string[]; actorId?: string; selectedSalesPersons?: string[] };
      if (!Array.isArray(phones) || phones.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "phones[] required" }), { status: 400 });
      }

      // 1) Load active rule
      let rule: "ROUND_ROBIN" | "CONVERSION_WEIGHTED" | "HYBRID" = "ROUND_ROBIN";
      const rows = await db.select().from(settings).where(eq(settings.key, "lead_assign_rule"));
      if (rows[0]) {
        const rawVal: any = (rows[0] as any).value;
        const obj = typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal;
        if (obj?.id) rule = obj.id;
      }

      // 2) Load sales agents from MongoDB
      const uri = process.env.MONGODB_URI as string;
      if (!uri) {
        return new Response(JSON.stringify({ success: false, error: "MONGODB_URI not set" }), { status: 500 });
      }
      const mongo = new MongoClient(uri);
      await mongo.connect();
      const mdb = mongo.db();
      const users = mdb.collection("users");
      const agents = await users
        .find(Object.assign({ $or: [{ role: "sales" }, { role: { $exists: false } }] }, tenantSubdomain ? { tenantSubdomain } : {}), { projection: { code: 1, name: 1, role: 1 } })
        .toArray();
      let sales = agents.filter((u: any) => typeof u.code === "string" && u.code.trim().length > 0);
      
      // Filter by selectedSalesPersons if provided
      if (selectedSalesPersons && selectedSalesPersons.length > 0) {
        sales = sales.filter((u: any) => selectedSalesPersons.includes(u.code));
      }
      
      if (sales.length === 0) {
        await mongo.close();
        return new Response(JSON.stringify({ success: false, error: "no sales agents found" }), { status: 400 });
      }

      // 3) Build assignment order helpers
      const pickRoundRobin = async (count: number) => {
        const idxRows = await db.select().from(settings).where(eq(settings.key, "lead_assign_rr_index"));
        let start = 0;
        if (idxRows[0]) {
          const raw: any = (idxRows[0] as any).value;
          const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
          start = Number(obj?.i || 0) || 0;
        }
        const order: string[] = [];
        for (let i = 0; i < count; i++) {
          const s = sales[(start + i) % sales.length];
          order.push(s.code);
        }
        const next = (start + count) % sales.length;
        await db
          .insert(settings)
          .values({ key: "lead_assign_rr_index", value: { i: next } } as any)
          .onConflictDoUpdate({ target: settings.key, set: { value: { i: next } } });
        return order;
      };

      const pickWeighted = async (count: number) => {
        try {
          const salesColl = mdb.collection("sales");
          const agg = await salesColl
            .aggregate([
              ...(tenantSubdomain ? [{ $match: { tenantSubdomain } }] : []),
              { $group: { _id: "$code", c: { $sum: 1 } } },
            ])
            .toArray();
          const weightByCode = new Map<string, number>();
          for (const a of agg) {
            if (typeof a._id === "string") weightByCode.set(a._id, Number(a.c) || 1);
          }
          const expanded: string[] = [];
          for (const s of sales) {
            const w = Math.max(1, Math.min(10, weightByCode.get(s.code) || 1));
            for (let i = 0; i < w; i++) expanded.push(s.code);
          }
          if (expanded.length === 0) return pickRoundRobin(count);
          const order: string[] = [];
          let cursor = 0;
          for (let i = 0; i < count; i++) {
            order.push(expanded[cursor % expanded.length]);
            cursor++;
          }
          return order;
        } catch {
          return pickRoundRobin(count);
        }
      };

      // 4) If hybrid, detect hot leads
      let assignCodes: string[] = [];
      if (rule === "ROUND_ROBIN") {
        assignCodes = await pickRoundRobin(phones.length);
      } else if (rule === "CONVERSION_WEIGHTED") {
        assignCodes = await pickWeighted(phones.length);
      } else {
        // HYBRID
        const rows = await db.select().from(leads).where(tenantId ? and(inArray(leads.phone, phones), eq(leads.tenantId, tenantId)) : inArray(leads.phone, phones));
        const isHot = new Map<string, boolean>();
        for (const r of rows as any[]) {
          const hot = (typeof r.score === "number" && r.score >= 50) || ["META", "GOOGLE"].includes(r.source || "");
          isHot.set(r.phone, hot);
        }
        const hotPhones = phones.filter((p) => isHot.get(p));
        const coldPhones = phones.filter((p) => !isHot.get(p));
        const hotAssign = await pickWeighted(hotPhones.length);
        const coldAssign = await pickRoundRobin(coldPhones.length);
        const mapping = new Map<string, string>();
        hotPhones.forEach((p, i) => mapping.set(p, hotAssign[i]));
        coldPhones.forEach((p, i) => mapping.set(p, coldAssign[i]));
        // apply updates in groups
        const byOwner: Record<string, string[]> = {};
        for (const p of phones) {
          const owner = mapping.get(p) as string;
          if (!byOwner[owner]) byOwner[owner] = [];
          byOwner[owner].push(p);
        }
        for (const [owner, list] of Object.entries(byOwner)) {
          await db.update(leads).set({ ownerId: owner }).where(tenantId ? and(inArray(leads.phone, list), eq(leads.tenantId, tenantId)) : inArray(leads.phone, list));
        }
        // Log events with from → to and actorId
        const prevOwnerByPhone = new Map<string, string | null>((rows as any[]).map((r) => [r.phone, r.ownerId || null]));
        const eventsToInsert = phones.map((p) => ({ 
          leadPhone: p, 
          type: "ASSIGNED", 
          data: { from: (prevOwnerByPhone.get(p) || "unassigned"), to: mapping.get(p), actorId: actorId || "system" }, 
          at: new Date(), 
          actorId: actorId || null, 
          tenantId: tenantId || null 
        }));
        if (eventsToInsert.length) await db.insert(leadEvents).values(eventsToInsert as any);
        await mongo.close();
        return new Response(JSON.stringify({ success: true, rule: rule }), { status: 200 });
      }

      // Non-hybrid path: apply mapping sequentially grouped by owner
      const byOwner: Record<string, string[]> = {};
      phones.forEach((p, i) => {
        const owner = assignCodes[i % assignCodes.length];
        if (!byOwner[owner]) byOwner[owner] = [];
        byOwner[owner].push(p);
      });
      // Capture previous owners for all phones before updates
      const existingBefore = await db
        .select({ phone: leads.phone, ownerId: leads.ownerId })
        .from(leads)
        .where(tenantId ? and(inArray(leads.phone, phones), eq(leads.tenantId, tenantId)) : inArray(leads.phone, phones));
      const prevOwnerByPhone = new Map(existingBefore.map((r: any) => [r.phone, r.ownerId as string | null]));
      for (const [owner, list] of Object.entries(byOwner)) {
        await db.update(leads).set({ ownerId: owner }).where(tenantId ? and(inArray(leads.phone, list), eq(leads.tenantId, tenantId)) : inArray(leads.phone, list));
      }
      const eventsToInsert = phones.map((p, i) => ({ 
        leadPhone: p, 
        type: "ASSIGNED", 
        data: { from: (prevOwnerByPhone.get(p) || "unassigned"), to: assignCodes[i % assignCodes.length], actorId: actorId || "system" }, 
        at: new Date(), 
        actorId: actorId || null, 
        tenantId: tenantId || null 
      }));
      if (eventsToInsert.length) await db.insert(leadEvents).values(eventsToInsert as any);
      await mongo.close();
      return new Response(JSON.stringify({ success: true, rule: rule }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false, error: "unknown action" }), { status: 400 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to update queue" }), { status: 500 });
  }
}


