import { NextRequest } from "next/server";
import { and, desc, eq, ilike, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, leadEvents } from "@/db/schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const stage = searchParams.get("stage") || undefined;
    const owner = searchParams.get("owner") || undefined;
    const source = searchParams.get("source") || undefined;
    const minScore = searchParams.get("minScore") ? Number(searchParams.get("minScore")) : undefined;
    const maxScore = searchParams.get("maxScore") ? Number(searchParams.get("maxScore")) : undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const limit = Number(searchParams.get("limit") || 25);
    const offset = Number(searchParams.get("offset") || 0);

    const filters = [
      q ? ilike(leads.name, `%${q}%`) : undefined,
      q ? ilike(leads.email, `%${q}%`) : undefined,
      q ? ilike(leads.phone, `%${q}%`) : undefined,
      stage ? eq(leads.stage, stage) : undefined,
      owner ? eq(leads.ownerId, owner) : undefined,
      source ? eq(leads.source, source) : undefined,
      typeof minScore === "number" ? gte(leads.score, minScore) : undefined,
      typeof maxScore === "number" ? lte(leads.score, maxScore) : undefined,
      from ? gte(leads.createdAt, new Date(from)) : undefined,
      to ? lte(leads.createdAt, new Date(to)) : undefined,
    ].filter(Boolean) as any[];

    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select()
      .from(leads)
      .where(where as any)
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    const totalRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(leads)
      .where(where as any);

    return new Response(JSON.stringify({ success: true, rows, total: Number((totalRow[0] as any)?.c || 0) }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch leads" }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, name, email, source, stage, score } = body || {};
    if (!phone || typeof phone !== "string" || phone.trim() === "") {
      return new Response(JSON.stringify({ success: false, error: "phone is required" }), { status: 400 });
    }
    const values = {
      phone: phone.trim(),
      name: name ?? null,
      email: email ?? null,
      source: source ?? null,
      stage: stage ?? undefined,
      score: typeof score === "number" ? score : undefined,
    } as any;

    const inserted = await db.insert(leads).values(values).returning({ phone: leads.phone, createdAt: leads.createdAt, source: leads.source });
    // timeline event for creation
    if (inserted[0]?.phone) {
      await db.insert(leadEvents).values({ leadPhone: inserted[0].phone, type: "CREATED", data: { source: inserted[0].source }, at: new Date() } as any);
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


