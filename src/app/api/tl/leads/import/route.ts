import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { leads, leadEvents } from "@/db/schema";
import { requireTenantIdFromRequest } from "@/lib/tenant";

// Normalize phone by extracting the first 10+ digit run, and cap to 15 digits
function normalizePhone(value: any): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value);
  const cleaned = raw.replace(/[\u00A0\u2000-\u200F\u2028-\u202F\u205F\u3000]/g, ' ');
  const digitRuns = cleaned.match(/\d{10,}/g);
  if (!digitRuns || digitRuns.length === 0) return null;
  let digits = digitRuns[0];
  if (digits.length > 15) digits = digits.slice(-15);
  return digits;
}

function safeStr(value: any, max: number): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const tenantId = await requireTenantIdFromRequest(req as any).catch(() => undefined);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "rows array required" }), { status: 400 });
    }
    const values = rows
      .map((r: any) => {
        const phone = normalizePhone(r.phone);
        return {
          phone: phone || undefined,
          name: safeStr(r.name, 160),
          email: safeStr(r.email, 256),
          source: safeStr(r.source, 64),
          stage: safeStr(r.stage, 48) || "Not contacted",
          score: typeof r.score === "number" ? r.score : Number.isFinite(Number(r.score)) ? Number(r.score) : 0,
          tenantId: tenantId || null,
        };
      })
      .filter((v: { phone?: string }) => typeof v.phone === "string" && v.phone.length >= 10);

    if (values.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "no valid rows with phone" }), { status: 400 });
    }

    const inserted = await db
      .insert(leads)
      .values(values as any)
      .onConflictDoNothing({ target: [leads.tenantId, leads.phone] })
      .returning({ phone: leads.phone, source: leads.source });

    // timeline events for created leads
    if (inserted.length) {
      const ev = inserted
        .filter((r) => r.phone)
        .map((r: { phone: string; source: string | null }) => ({ leadPhone: r.phone, type: "CREATED", data: { source: r.source }, at: new Date(), tenantId: tenantId || null }));
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


