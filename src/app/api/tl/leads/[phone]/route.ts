// No need for NextRequest in a Route Handler; use the standard Request type
import { db } from "@/db/client";
import { leads, leadEvents, tasks } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { requireTenantIdFromRequest } from "@/lib/tenant";

export async function GET(_req: Request, { params }: any) {
  try {
    let tenantId: number;
    try {
      tenantId = await requireTenantIdFromRequest(_req);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Tenant not resolved" }), { status: 400 });
    }
    const phone = decodeURIComponent(await params.phone);
    let lead = (await db.select().from(leads).where(and(eq(leads.phone, phone), eq(leads.tenantId, tenantId))))[0];
    if (!lead) {
      const noSpace = phone.replace(/\s+/g, "");
      if (noSpace && noSpace !== phone) {
        lead = (await db.select().from(leads).where(and(eq(leads.phone, noSpace), eq(leads.tenantId, tenantId))))[0];
      }
    }
    if (!lead) {
      if (phone.startsWith("+")) {
        const withoutPlus = phone.slice(1);
        lead = (await db.select().from(leads).where(and(eq(leads.phone, withoutPlus), eq(leads.tenantId, tenantId))))[0];
      } else {
        const withPlus = `+${phone}`;
        lead = (await db.select().from(leads).where(and(eq(leads.phone, withPlus), eq(leads.tenantId, tenantId))))[0];
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
      .where(and(inArray(leadEvents.leadPhone, variants), eq(leadEvents.tenantId, tenantId)))
      .orderBy(desc(leadEvents.at));
    
    console.log('Events found:', events.length);
    console.log('Event types:', events.map(e => e.type));
    console.log('Event lead phones:', events.map(e => e.leadPhone));
    // Select only columns that are guaranteed to exist to avoid errors if migrations haven't been applied
    const openTasks = await db
      .select({ id: tasks.id, leadPhone: tasks.leadPhone, title: tasks.title, status: tasks.status, dueAt: tasks.dueAt, createdAt: tasks.createdAt })
      .from(tasks)
      .where(and(inArray(tasks.leadPhone, variants), eq(tasks.tenantId, tenantId)))
      .orderBy(desc(tasks.createdAt));
    return new Response(JSON.stringify({ success: true, lead, events, tasks: openTasks }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "failed" }), { status: 500 });
  }
}

export async function PUT(_req: Request, { params }: any) {
  try {
    let tenantId: number;
    try {
      tenantId = await requireTenantIdFromRequest(_req);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Tenant not resolved" }), { status: 400 });
    }
    const phone = decodeURIComponent(await params.phone);
    const body = await _req.json();
    const { stage, score, ownerId, source, actorId, stageNotes, needFollowup, followupDate, followupNotes } = body || {};
    
    console.log('Team Leader API - PUT request for phone:', phone);
    console.log('Request body:', { stage, score, ownerId, source, actorId, stageNotes, needFollowup, followupDate, followupNotes });
    
    // Get current lead to capture previous values
    const currentLead = await db.select().from(leads).where(and(eq(leads.phone, phone), eq(leads.tenantId, tenantId))).limit(1);
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
    if (needFollowup !== undefined) updateData.needFollowup = needFollowup;
    if (followupDate !== undefined) {
      // Ensure followupDate is properly formatted as a Date object
      if (typeof followupDate === 'string') {
        updateData.followupDate = new Date(followupDate);
      } else if (followupDate instanceof Date) {
        updateData.followupDate = followupDate;
      } else {
        updateData.followupDate = null;
      }
    }
    if (followupNotes !== undefined) updateData.followupNotes = followupNotes;
    updateData.updatedAt = new Date();
    updateData.lastActivityAt = new Date();

    // Update the lead
    await db.update(leads).set(updateData).where(and(eq(leads.phone, phone), eq(leads.tenantId, tenantId)));

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
        tenantId: tenantId
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

    // Handle followup task creation
    if (needFollowup === true && followupDate) {
      console.log('Creating followup task for date:', followupDate);
      console.log('Followup date type:', typeof followupDate);
      
      try {
        // Validate and format the followup date
        let formattedDate: Date;
        if (typeof followupDate === 'string') {
          formattedDate = new Date(followupDate);
          if (isNaN(formattedDate.getTime())) {
            throw new Error('Invalid followup date format');
          }
        } else if (followupDate instanceof Date) {
          formattedDate = followupDate;
        } else {
          throw new Error('Followup date must be a string or Date object');
        }
        
        console.log('Formatted followup date:', formattedDate);
        
        // Create a followup task
        await db.insert(tasks).values({
          leadPhone: phone,
          title: `Followup: ${stageNotes || 'Status update followup'}`,
          status: "OPEN",
          type: "FOLLOWUP",
          dueAt: formattedDate,
          ownerId: ownerId || currentLead[0].ownerId,
          tenantId: tenantId,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any);
        
        console.log('Followup task created successfully');
        
        // Log followup event
        await db.insert(leadEvents).values({
          leadPhone: phone,
          type: "FOLLOWUP_SCHEDULED",
          data: { 
            followupDate: followupDate,
            followupNotes: followupNotes || stageNotes || null,
            actorId: actorId || currentLead[0].ownerId || "system",
            message: `Followup scheduled for ${followupDate}`,
            reason: "Manual followup scheduling"
          },
          actorId: actorId || currentLead[0].ownerId || "system",
          at: new Date(),
          tenantId: tenantId
        } as any);
        
        console.log('FOLLOWUP_SCHEDULED event created successfully');
      } catch (error) {
        console.error('Failed to create followup task or event:', error);
      }
    } else if (needFollowup === false) {
      // Remove any existing followup tasks for this lead
      try {
        await db.delete(tasks).where(
          tenantId ? 
            and(eq(tasks.leadPhone, phone), eq(tasks.tenantId, tenantId), eq(tasks.type, "FOLLOWUP")) :
            and(eq(tasks.leadPhone, phone), eq(tasks.type, "FOLLOWUP"))
        );
        console.log('Removed existing followup tasks for this lead');
      } catch (error) {
        console.error('Failed to remove existing followup tasks:', error);
      }
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
        tenantId: tenantId,
      } as any);
    }

    return new Response(JSON.stringify({ success: true, phone: phone }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to update lead" }), { status: 500 });
  }
}

// Delete a single lead by phone (and related events & tasks)
export async function DELETE(_req: Request, { params }: any) {
  try {
    let tenantId: number;
    try {
      tenantId = await requireTenantIdFromRequest(_req);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Tenant not resolved" }), { status: 400 });
    }
    const phone = decodeURIComponent(await params.phone);

    // Normalize variants similar to GET lookup for cleanup
    const variantsSet = new Set<string>();
    const base = String(phone || "");
    if (base) {
      variantsSet.add(base);
      const noSpace = base.replace(/\s+/g, "");
      variantsSet.add(noSpace);
      if (base.startsWith('+')) variantsSet.add(base.slice(1));
      else variantsSet.add(`+${base}`);
    }
    const variants = Array.from(variantsSet);

    await db.delete(leadEvents).where(and(inArray(leadEvents.leadPhone, variants), eq(leadEvents.tenantId, tenantId)));
    await db.delete(tasks).where(and(inArray(tasks.leadPhone, variants), eq(tasks.tenantId, tenantId)));
    const deleted = await db.delete(leads).where(and(eq(leads.phone, phone), eq(leads.tenantId, tenantId))).returning({ phone: leads.phone });

    if (!deleted[0]) {
      return new Response(JSON.stringify({ success: false, error: "Lead not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, phone: deleted[0].phone }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to delete lead" }), { status: 500 });
  }
}


