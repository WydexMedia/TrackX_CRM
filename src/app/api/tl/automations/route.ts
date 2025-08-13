import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

const RULES = [
  { id: "ROUND_ROBIN", label: "Pure Round-Robin", description: "Cycle assignments evenly across agents" },
  { id: "CONVERSION_WEIGHTED", label: "Conversion-based", description: "Weight by recent conversion rate" },
  { id: "HYBRID", label: "Hybrid", description: "Hot leads use conversion-weighted; others round-robin" },
];

export async function GET() {
  try {
    const rows = await db.select().from(settings).where(eq(settings.key, "lead_assign_rule"));
    let active = "ROUND_ROBIN";
    if (rows[0]) {
      const rawVal: any = (rows[0] as any).value;
      const obj = typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal;
      if (obj && typeof obj === "object" && obj.id) active = obj.id;
    }
    return new Response(JSON.stringify({ success: true, rules: RULES, active }), { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch rules" }), { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!RULES.some((r) => r.id === id)) {
      return new Response(JSON.stringify({ success: false, error: "invalid rule id" }), { status: 400 });
    }
    // upsert
    await db
      .insert(settings)
      .values({ key: "lead_assign_rule", value: { id } } as any)
      .onConflictDoUpdate({ target: settings.key, set: { value: { id } } });
    return new Response(JSON.stringify({ success: true, active: id }), { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to update rule" }), { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}


