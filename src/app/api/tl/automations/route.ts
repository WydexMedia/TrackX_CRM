import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

const RULES = [
  { id: "ROUND_ROBIN", label: "Pure Round-Robin", description: "Cycle assignments evenly across agents" },
  { id: "CONVERSION_WEIGHTED", label: "Conversion-based", description: "Weight by recent conversion rate" },
  { id: "HYBRID", label: "Hybrid", description: "Hot leads use conversion-weighted; others round-robin" },
  { id: "CUSTOM", label: "Custom Automation", description: "Advanced lead assignment based on custom criteria including ad spend percentages and multiple business rules" },
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
    const { id, conversionRate, conversionRates, customConfig } = await req.json();
    if (!RULES.some((r) => r.id === id)) {
      return new Response(JSON.stringify({ success: false, error: "invalid rule id" }), { status: 400 });
    }
    
    // Handle both single and multiple conversion rates
    const rates = conversionRates || (conversionRate ? [conversionRate] : []);
    
    // Validate conversion rates for CONVERSION_WEIGHTED rule
    if (id === "CONVERSION_WEIGHTED" && rates.length > 0) {
      const validRates = ["default", "low", "medium", "high"];
      const invalidRates = rates.filter((rate: string) => !validRates.includes(rate));
      if (invalidRates.length > 0) {
        return new Response(JSON.stringify({ success: false, error: `invalid conversion rates: ${invalidRates.join(", ")}` }), { status: 400 });
      }
    }
    
    // Validate custom configuration for CUSTOM rule
    if (id === "CUSTOM") {
      if (!customConfig || !customConfig.adSpendPercentages || !customConfig.selectedOptions) {
        return new Response(JSON.stringify({ success: false, error: "custom configuration required for custom automation rule" }), { status: 400 });
      }
      
      if (customConfig.adSpendPercentages.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "at least one ad spend percentage required" }), { status: 400 });
      }
      
      if (customConfig.selectedOptions.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "at least one business rule required" }), { status: 400 });
      }
      
      // Validate ad spend percentages are numbers between 1-100
      const invalidPercentages = customConfig.adSpendPercentages.filter((p: number) => 
        typeof p !== 'number' || p < 1 || p > 100
      );
      if (invalidPercentages.length > 0) {
        return new Response(JSON.stringify({ success: false, error: "ad spend percentages must be numbers between 1-100" }), { status: 400 });
      }
    }
    
    // Store rule with conversion rates if provided
    let ruleData: any = { id };
    
    if (rates.length > 0) {
      ruleData.conversionRates = rates;
    }
    
    if (id === "CUSTOM" && customConfig) {
      ruleData.customConfig = customConfig;
    }
    
    // upsert
    await db
      .insert(settings)
      .values({ key: "lead_assign_rule", value: ruleData } as any)
      .onConflictDoUpdate({ target: settings.key, set: { value: ruleData } });
    
    const responseData: any = { success: true, active: id };
    if (rates.length > 0) responseData.conversionRates = rates;
    if (id === "CUSTOM" && customConfig) responseData.customConfig = customConfig;
    
    return new Response(JSON.stringify(responseData), { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to update rule" }), { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}


