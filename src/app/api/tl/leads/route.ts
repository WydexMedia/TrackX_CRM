import { NextRequest } from "next/server";
import { and, or, desc, eq, ilike, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, leadEvents } from "@/db/schema";
import { requireTenantIdFromRequest } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const stage = searchParams.get("stage") || undefined;
    const owner = searchParams.get("owner") || undefined;
    const source = searchParams.get("source") || undefined;
    // Support both legacy minScore/maxScore and new scoreMin/scoreMax
    const legacyMin = searchParams.get("minScore");
    const legacyMax = searchParams.get("maxScore");
    const newMin = searchParams.get("scoreMin");
    const newMax = searchParams.get("scoreMax");
    const minScore = newMin ? Number(newMin) : legacyMin ? Number(legacyMin) : undefined;
    const maxScore = newMax ? Number(newMax) : legacyMax ? Number(legacyMax) : undefined;

    // Advanced filters
    const needFollowupParam = searchParams.get("needFollowup");
    const hasEmailParam = searchParams.get("hasEmail");
    const emailDomain = searchParams.get("emailDomain") || undefined; // like gmail.com
    const excludeEarlyStages = searchParams.get("excludeEarlyStages") === "true";
    const sortByCallCount = searchParams.get("sortByCallCount") === "true";
    const callCountMin = searchParams.get("callCountMin") ? Number(searchParams.get("callCountMin")) : undefined;
    const callCountMax = searchParams.get("callCountMax") ? Number(searchParams.get("callCountMax")) : undefined;

    // Date filters: explicit from/to or derived from dateRange
    let from = searchParams.get("from") || undefined;
    let to = searchParams.get("to") || undefined;
    const dateRange = searchParams.get("dateRange") || undefined; // today, yesterday, last7days, last30days, thismonth, lastmonth

    if (!from && !to && dateRange) {
      const now = new Date();
      const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      switch (dateRange) {
        case "today":
          from = startOfDay(now).toISOString();
          to = endOfDay(now).toISOString();
          break;
        case "yesterday": {
          const y = new Date(now);
          y.setDate(now.getDate() - 1);
          from = startOfDay(y).toISOString();
          to = endOfDay(y).toISOString();
          break;
        }
        case "last7days": {
          const s = new Date(now);
          s.setDate(now.getDate() - 7);
          from = startOfDay(s).toISOString();
          to = endOfDay(now).toISOString();
          break;
        }
        case "last30days": {
          const s = new Date(now);
          s.setDate(now.getDate() - 30);
          from = startOfDay(s).toISOString();
          to = endOfDay(now).toISOString();
          break;
        }
        case "thismonth": {
          const s = startOfMonth(now);
          const e = endOfMonth(now);
          from = s.toISOString();
          to = e.toISOString();
          break;
        }
        case "lastmonth": {
          const s = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
          const e = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
          from = s.toISOString();
          to = e.toISOString();
          break;
        }
      }
    }

    // Last activity relative filters
    const lastActivity = searchParams.get("lastActivity") || undefined; // today, last3days, lastweek, lastmonth, noactivity
    const limit = Number(searchParams.get("limit") || 25);
    const offset = Number(searchParams.get("offset") || 0);

    const filters = [
      // Search across name OR email OR phone
      q ? or(ilike(leads.name, `%${q}%`), ilike(leads.email, `%${q}%`), ilike(leads.phone, `%${q}%`)) : undefined,
      stage ? eq(leads.stage, stage) : undefined,
      owner === "unassigned" ? (sql`${leads.ownerId} is null` as any) : owner ? eq(leads.ownerId, owner) : undefined,
      source ? eq(leads.source, source) : undefined,
      typeof minScore === "number" && !Number.isNaN(minScore) ? gte(leads.score, minScore) : undefined,
      typeof maxScore === "number" && !Number.isNaN(maxScore) ? lte(leads.score, maxScore) : undefined,
      from ? gte(leads.createdAt, new Date(from)) : undefined,
      to ? lte(leads.createdAt, new Date(to)) : undefined,
      needFollowupParam === "true" ? eq(leads.needFollowup, true) : needFollowupParam === "false" ? eq(leads.needFollowup, false) : undefined,
      hasEmailParam === "true" ? (sql`${leads.email} is not null and ${leads.email} <> ''` as any) : hasEmailParam === "false" ? (sql`${leads.email} is null or ${leads.email} = ''` as any) : undefined,
      emailDomain ? ilike(leads.email, `%@${emailDomain}`) : undefined,
      // Filter to exclude leads that are still in early stages
      excludeEarlyStages ? sql`${leads.stage} NOT IN ('Did not Pickup', 'Did not Connect', 'Attempt to contact')` : undefined,
      // Call count filtering will be applied after fetching leads with call counts
    ].filter(Boolean) as any[];

    // Last activity window
    if (lastActivity) {
      const now = new Date();
      const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (lastActivity === "noactivity") {
        filters.push(sql`${leads.lastActivityAt} is null` as any);
      } else if (lastActivity === "today") {
        filters.push(gte(leads.lastActivityAt, startOfDay(now)) as any);
      } else if (lastActivity === "last3days") {
        const s = new Date(now);
        s.setDate(now.getDate() - 3);
        filters.push(gte(leads.lastActivityAt, s) as any);
      } else if (lastActivity === "lastweek") {
        const s = new Date(now);
        s.setDate(now.getDate() - 7);
        filters.push(gte(leads.lastActivityAt, s) as any);
      } else if (lastActivity === "lastmonth") {
        const s = new Date(now);
        s.setMonth(now.getMonth() - 1);
        filters.push(gte(leads.lastActivityAt, s) as any);
      }
    }

    const where = filters.length ? and(...filters) : undefined;
    const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
    const scopedWhere = tenantId ? (where ? and(where, eq(leads.tenantId, tenantId)) : eq(leads.tenantId, tenantId)) : where as any;

    let rows;
    
    // Always fetch leads with call count for filtering and display
    const leadsWithCallCount = await db
      .select({
        lead: leads,
        callCount: sql<number>`(
          SELECT COUNT(*) 
          FROM lead_events 
          WHERE lead_events.lead_phone = leads.phone 
          AND lead_events.type = 'STAGE_CHANGE'
          AND lead_events.tenant_id = leads.tenant_id
        )`
      })
      .from(leads)
      .where(scopedWhere as any)
      .orderBy(sortByCallCount ? 
        desc(sql`(
          SELECT COUNT(*) 
          FROM lead_events 
          WHERE lead_events.lead_phone = leads.phone 
          AND lead_events.type = 'STAGE_CHANGE'
          AND lead_events.tenant_id = leads.tenant_id
        )`) : 
        desc(leads.createdAt)
      )
      .limit(limit)
      .offset(offset);
    
    rows = leadsWithCallCount.map(row => ({ ...row.lead, callCount: row.callCount }));
    
    // Apply call count filtering if specified
    if (callCountMin || callCountMax) {
      rows = rows.filter(row => {
        const callCount = row.callCount || 0;
        const min = callCountMin ? Number(callCountMin) : 0;
        const max = callCountMax ? Number(callCountMax) : Infinity;
        return callCount >= min && callCount <= max;
      });
    }

    const totalRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(leads)
      .where(scopedWhere as any);

    return new Response(JSON.stringify({ success: true, rows, total: Number((totalRow[0] as any)?.c || 0) }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch leads" }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
    const { phone, name, email, source, stage, score } = body || {};
    if (!phone || typeof phone !== "string" || phone.trim() === "") {
      return new Response(JSON.stringify({ success: false, error: "phone is required" }), { status: 400 });
    }
    const values = {
      phone: phone.trim(),
      name: name ?? null,
      email: email ?? null,
      source: source ?? null,
      stage: stage ?? "Attempt to contact",
      score: typeof score === "number" ? score : undefined,
      tenantId: tenantId || null,
    } as any;

    const inserted = await db.insert(leads).values(values).returning({ phone: leads.phone, createdAt: leads.createdAt, source: leads.source });
    // timeline event for creation
    if (inserted[0]?.phone) {
      await db.insert(leadEvents).values({ leadPhone: inserted[0].phone, type: "CREATED", data: { source: inserted[0].source }, at: new Date(), tenantId: tenantId || null } as any);
    }
    return new Response(JSON.stringify({ success: true, phone: inserted[0]?.phone }), { status: 201 });
  } catch (e: any) {
    const msg = String(e?.message || "Failed to create lead");
    if (msg.includes("duplicate key") || msg.includes("unique")) {
      return new Response(JSON.stringify({ success: false, error: "Lead with this phone already exists" }), { status: 409 });
    }
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500 });
  }
}


