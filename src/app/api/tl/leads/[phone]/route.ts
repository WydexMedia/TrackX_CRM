// No need for NextRequest in a Route Handler; use the standard Request type
import { db } from "@/db/client";
import { leads, leadEvents, tasks } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { requireTenantIdFromRequest } from "@/lib/tenant";

export async function GET(_req: Request, { params }: any) {
  try {
    const tenantId = await requireTenantIdFromRequest(_req).catch(() => undefined);
    const phone = decodeURIComponent(await params.phone);
    let lead = (await db.select().from(leads).where(tenantId ? and(eq(leads.phone, phone), eq(leads.tenantId, tenantId)) : eq(leads.phone, phone)))[0];
    if (!lead) {
      const noSpace = phone.replace(/\s+/g, "");
      if (noSpace && noSpace !== phone) {
        lead = (await db.select().from(leads).where(tenantId ? and(eq(leads.phone, noSpace), eq(leads.tenantId, tenantId)) : eq(leads.phone, noSpace)))[0];
      }
    }
    if (!lead) {
      if (phone.startsWith("+")) {
        const withoutPlus = phone.slice(1);
        lead = (await db.select().from(leads).where(tenantId ? and(eq(leads.phone, withoutPlus), eq(leads.tenantId, tenantId)) : eq(leads.phone, withoutPlus)))[0];
      } else {
        const withPlus = `+${phone}`;
        lead = (await db.select().from(leads).where(tenantId ? and(eq(leads.phone, withPlus), eq(leads.tenantId, tenantId)) : eq(leads.phone, withPlus)))[0];
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
      if (base.startsWith('+')) variantsSet.add(base.slice(1));
      else variantsSet.add(`+${base}`);
    }
    const variants = Array.from(variantsSet);
    
    console.log('Phone variants for events query:', variants);
    console.log('Lead phone:', lead.phone);

    const events = await db
      .select()
      .from(leadEvents)
      .where(tenantId ? and(inArray(leadEvents.leadPhone, variants), eq(leadEvents.tenantId, tenantId)) : inArray(leadEvents.leadPhone, variants))
      .orderBy(desc(leadEvents.at));
    
    console.log('Events found:', events.length);
    console.log('Event types:', events.map(e => e.type));
    console.log('Event lead phones:', events.map(e => e.leadPhone));
    // Select only columns that are guaranteed to exist to avoid errors if migrations haven't been applied
    const openTasks = await db
      .select({ id: tasks.id, leadPhone: tasks.leadPhone, title: tasks.title, status: tasks.status, dueAt: tasks.dueAt, createdAt: tasks.createdAt })
      .from(tasks)
      .where(tenantId ? and(inArray(tasks.leadPhone, variants), eq(tasks.tenantId, tenantId)) : inArray(tasks.leadPhone, variants))
      .orderBy(desc(tasks.createdAt));
    return new Response(JSON.stringify({ success: true, lead, events, tasks: openTasks }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}

export async function PUT(_req: Request, { params }: any) {
  try {
    const tenantId = await requireTenantIdFromRequest(_req).catch(() => undefined);
    const phone = decodeURIComponent(await params.phone);
    const body = await _req.json();
    const { stage, score, ownerId, source, actorId, stageNotes } = body || {};
    
    console.log('Team Leader API - PUT request for phone:', phone);
    console.log('Request body:', { stage, score, ownerId, source, actorId, stageNotes });
    
    // Get current lead to capture previous values
    const currentLead = await db.select().from(leads).where(tenantId ? and(eq(leads.phone, phone), eq(leads.tenantId, tenantId)) : eq(leads.phone, phone)).limit(1);
    if (!currentLead[0]) {
      console.log('Lead not found for phone:', phone);
      return new Response(JSON.stringify({ success: false, error: "Lead not found" }), { status: 404 });
    }

    console.log('Current lead found:', currentLead[0]);
    console.log('Current stage:', currentLead[0].stage, 'New stage:', stage);

    const updateData: any = {};
    if (stage !== undefined) updateData.stage = stage;
    if (score !== undefined) updateData.score = score;
    if (ownerId !== undefined) updateData.ownerId = ownerId;
    if (source !== undefined) updateData.source = source;
    updateData.updatedAt = new Date();
    updateData.lastActivityAt = new Date();

    // Update the lead
    await db.update(leads).set(updateData).where(tenantId ? and(eq(leads.phone, phone), eq(leads.tenantId, tenantId)) : eq(leads.phone, phone));

    // Log stage change event if stage was updated
    if (stage !== undefined && stage !== currentLead[0].stage) {
      console.log('Creating STAGE_CHANGE event from', currentLead[0].stage, 'to', stage);
      
      const eventData = {
        leadPhone: phone,
        type: "STAGE_CHANGE",
        data: { 
          from: currentLead[0].stage, 
          to: stage,
          actorId: actorId || currentLead[0].ownerId || "system",
          message: `Stage changed from ${currentLead[0].stage} to ${stage}`,
          stageNotes: stageNotes || null,
          reason: stageNotes ? "Manual stage update" : "Stage update"
        },
        actorId: actorId || currentLead[0].ownerId || "system",
        at: new Date(),
        tenantId: tenantId || null
      };
      
      console.log('Inserting STAGE_CHANGE event:', eventData);
      try {
        await db.insert(leadEvents).values(eventData as any);
        console.log('STAGE_CHANGE event created successfully');
      } catch (error) {
        console.error('Failed to create STAGE_CHANGE event:', error);
      }
    } else {
      console.log('No stage change detected or stage is the same');
    }

    // Log assignment change event if ownerId was updated
    if (ownerId !== undefined && ownerId !== currentLead[0].ownerId) {
      await db.insert(leadEvents).values({
        leadPhone: phone,
        type: "ASSIGNED",
        data: { 
          from: currentLead[0].ownerId || "unassigned", 
          to: ownerId,
          actorId: actorId || currentLead[0].ownerId || "system",
          message: `Lead reassigned from ${currentLead[0].ownerId || "unassigned"} to ${ownerId}`
        },
        actorId: actorId || currentLead[0].ownerId || "system",
        at: new Date(),
        tenantId: tenantId || null,
      } as any);
    }

    return new Response(JSON.stringify({ success: true, phone: phone }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to update lead" }), { status: 500 });
  }
}


