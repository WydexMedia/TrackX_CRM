import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { leads, leadEvents } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "rows array required" }), { status: 400 });
    }
    const values = rows
      .map((r: any) => ({
        phone: typeof r.phone === "string" ? r.phone.trim() : undefined,
        name: r.name ?? null,
        email: r.email ?? null,
        source: r.source ?? null,
        stage: r.stage ?? undefined,
        score: typeof r.score === "number" ? r.score : undefined,
      }))
      .filter((v: { phone?: string }) => typeof v.phone === "string" && v.phone.length > 0);

    if (values.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "no valid rows with phone" }), { status: 400 });
    }

    const inserted = await db
      .insert(leads)
      .values(values as any)
      .onConflictDoNothing({ target: leads.phone })
      .returning({ phone: leads.phone, source: leads.source });

    // timeline events for created leads
    if (inserted.length) {
      const ev = inserted
        .filter((r) => r.phone)
        .map((r: { phone: string; source: string | null }) => ({ leadPhone: r.phone, type: "CREATED", data: { source: r.source }, at: new Date() }));
      if (ev.length) await db.insert(leadEvents).values(ev as any);
    }

    return new Response(
      JSON.stringify({ success: true, inserted: inserted.length, skipped: values.length - inserted.length }),
      { status: 201 }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "import failed" }), { status: 500 });
  }
}


