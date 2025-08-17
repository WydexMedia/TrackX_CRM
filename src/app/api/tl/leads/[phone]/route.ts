// No need for NextRequest in a Route Handler; use the standard Request type
import { db } from "@/db/client";
import { leads, leadEvents, tasks } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function GET(_req: Request, { params }: any) {
  try {
    const phone = decodeURIComponent(params.phone);
    let lead = (await db.select().from(leads).where(eq(leads.phone, phone)))[0];
    if (!lead) {
      const noSpace = phone.replace(/\s+/g, "");
      if (noSpace && noSpace !== phone) {
        lead = (await db.select().from(leads).where(eq(leads.phone, noSpace)))[0];
      }
    }
    if (!lead) {
      if (phone.startsWith("+")) {
        const withoutPlus = phone.slice(1);
        lead = (await db.select().from(leads).where(eq(leads.phone, withoutPlus)))[0];
      } else {
        const withPlus = `+${phone}`;
        lead = (await db.select().from(leads).where(eq(leads.phone, withPlus)))[0];
      }
    }
    if (!lead) return new Response(JSON.stringify({ success: false, error: "not found" }), { status: 404 });
    // Build phone variants to handle + prefix and spaces
    const variantsSet = new Set<string>();
    const base = String(lead.phone || "");
    if (base) {
      variantsSet.add(base);
      const noSpace = base.replace(/\s+/g, "");
      variantsSet.add(noSpace);
      if (base.startsWith("+")) variantsSet.add(base.slice(1));
      else variantsSet.add(`+${base}`);
    }
    const variants = Array.from(variantsSet);

    const events = await db
      .select()
      .from(leadEvents)
      .where(inArray(leadEvents.leadPhone, variants))
      .orderBy(desc(leadEvents.at));
    // Select only columns that are guaranteed to exist to avoid errors if migrations haven't been applied
    const openTasks = await db
      .select({ id: tasks.id, leadPhone: tasks.leadPhone, title: tasks.title, status: tasks.status, dueAt: tasks.dueAt, createdAt: tasks.createdAt })
      .from(tasks)
      .where(inArray(tasks.leadPhone, variants))
      .orderBy(desc(tasks.createdAt));
    return new Response(JSON.stringify({ success: true, lead, events, tasks: openTasks }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}


