import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { db as db_pg } from '@/db/client';
import { leads, leadEvents } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';
           import { authenticateToken, createUnauthorizedResponse } from '@/lib/authMiddleware';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function POST(request) {
  // Authenticate the request
  const authResult = await authenticateToken(request);
  if (!authResult.success) {
    return createUnauthorizedResponse(authResult.error, authResult.errorCode, authResult.statusCode);
  }

  const data = await request.json();
  console.log('Received call data:', data);
  
  const { tenantSubdomain, tenantId } = await getTenantContextFromRequest(request);
  const client = await clientPromise;
  const mongoDb = client.db();
  const calls = mongoDb.collection('calls');
  data.createdAt = new Date();
  if (tenantSubdomain) data.tenantSubdomain = tenantSubdomain;
  await calls.insertOne(data);
  
  try {
    const now = new Date();
    const actor = data?.ogaName || null;
    const phone = data?.leadPhone || data?.phone || null;
    
    if (phone) {
      const p = String(phone);
      
      // Get current lead stage if not provided
      let currentStage = data?.currentStage;
      if (!currentStage) {
        try {
          const whereBase = tenantId ? and(eq(leads.phone, p), eq(leads.tenantId, tenantId)) : eq(leads.phone, p);
          const currentLead = await db_pg.select({ stage: leads.stage }).from(leads).where(whereBase).limit(1);
          if (currentLead[0]) {
            currentStage = currentLead[0].stage;
          }
        } catch (error) {
          console.error('Failed to fetch current stage:', error);
          currentStage = 'Unknown';
        }
      }
      
      console.log('Processing lead:', p, 'Current stage:', currentStage);
      
      // attempt updates with a few normalizations for robustness
      const whereBase = tenantId ? and(eq(leads.phone, p), eq(leads.tenantId, tenantId)) : eq(leads.phone, p);
      await db_pg.update(leads).set({ lastActivityAt: now, updatedAt: now }).where(whereBase);
      const noSpace = p.replace(/\s+/g, '');
      if (noSpace !== p) await db_pg.update(leads).set({ lastActivityAt: now, updatedAt: now }).where(tenantId ? and(eq(leads.phone, noSpace), eq(leads.tenantId, tenantId)) : eq(leads.phone, noSpace));
      if (p.startsWith('+')) {
        await db_pg.update(leads).set({ lastActivityAt: now, updatedAt: now }).where(tenantId ? and(eq(leads.phone, p.slice(1)), eq(leads.tenantId, tenantId)) : eq(leads.phone, p.slice(1)));
      } else {
        await db_pg.update(leads).set({ lastActivityAt: now, updatedAt: now }).where(tenantId ? and(eq(leads.phone, `+${p}`), eq(leads.tenantId, tenantId)) : eq(leads.phone, `+${p}`));
      }
      
      // Always log the call event
      console.log('Creating CALL_LOGGED event for:', p);
      await db_pg.insert(leadEvents).values({ 
        leadPhone: p, 
        type: 'CALL_LOGGED', 
        data: { 
          status: data?.callStatus, 
          notes: data?.notes,
          callType: data?.callType,
          callCompleted: data?.callCompleted
        }, 
        actorId: actor, 
        tenantId: tenantId || null 
      });
      console.log('CALL_LOGGED event created successfully');

      // Handle stage changes from the call form
      if (data?.stageChanged && data?.leadStage && currentStage && data.leadStage !== currentStage) {
        console.log('Processing stage change from', currentStage, 'to', data.leadStage);
        
        // Update lead stage
        await db_pg.update(leads).set({ 
          stage: data.leadStage, 
          updatedAt: now, 
          lastActivityAt: now 
        }).where(whereBase);
        
        // Update phone variants
        if (noSpace !== p) await db_pg.update(leads).set({ 
          stage: data.leadStage, 
          updatedAt: now, 
          lastActivityAt: now 
        }).where(tenantId ? and(eq(leads.phone, noSpace), eq(leads.tenantId, tenantId)) : eq(leads.phone, noSpace));
        if (p.startsWith('+')) {
          await db_pg.update(leads).set({ 
            stage: data.leadStage, 
            updatedAt: now, 
            lastActivityAt: now 
          }).where(tenantId ? and(eq(leads.phone, p.slice(1)), eq(leads.tenantId, tenantId)) : eq(leads.phone, p.slice(1)));
        } else {
          await db_pg.update(leads).set({ 
            stage: data.leadStage, 
            updatedAt: now, 
            lastActivityAt: now 
          }).where(tenantId ? and(eq(leads.phone, `+${p}`), eq(leads.tenantId, tenantId)) : eq(leads.phone, `+${p}`));
        }
        
        // Log stage change event
        console.log('Creating STAGE_CHANGE event');
        await db_pg.insert(leadEvents).values({ 
          leadPhone: p, 
          type: 'STAGE_CHANGE', 
          data: { 
            from: currentStage, 
            to: data.leadStage,
            reason: 'Call outcome',
            callStatus: data?.callStatus,
            stageNotes: data?.stageNotes || null,
            actorId: actor
          }, 
          actorId: actor, 
          tenantId: tenantId || null 
        });
        console.log('STAGE_CHANGE event created successfully');
      }

      // Handle STAGE_UPDATE status (special case for stage-only updates)
      if (data?.callStatus === 'STAGE_UPDATE' && data?.stageChanged) {
        // Update lead stage
        await db_pg.update(leads).set({ 
          stage: data.leadStage, 
          updatedAt: now, 
          lastActivityAt: now 
        }).where(whereBase);
        
        // Update phone variants
        if (noSpace !== p) await db_pg.update(leads).set({ 
          stage: data.leadStage, 
          updatedAt: now, 
          lastActivityAt: now 
        }).where(tenantId ? and(eq(leads.phone, noSpace), eq(leads.tenantId, tenantId)) : eq(leads.phone, noSpace));
        if (p.startsWith('+')) {
          await db_pg.update(leads).set({ 
            stage: data.leadStage, 
            updatedAt: now, 
            lastActivityAt: now 
          }).where(tenantId ? and(eq(leads.phone, p.slice(1)), eq(leads.tenantId, tenantId)) : eq(leads.phone, p.slice(1)));
        } else {
          await db_pg.update(leads).set({ 
            stage: data.leadStage, 
            updatedAt: now, 
            lastActivityAt: now 
          }).where(tenantId ? and(eq(leads.phone, `+${p}`), eq(leads.tenantId, tenantId)) : eq(leads.phone, `+${p}`));
        }
        
        // Log stage change event
        await db_pg.insert(leadEvents).values({ 
          leadPhone: p, 
          type: 'STAGE_CHANGE', 
          data: { 
            from: data.currentStage || 'Unknown', 
            to: data.leadStage,
            reason: 'Stage update from call outcome',
            callStatus: 'STAGE_UPDATE',
            stageNotes: data?.stageNotes || null,
            actorId: actor
          }, 
          actorId: actor, 
          tenantId: tenantId || null 
        });
      }

      // Legacy handling for NOT_INTERESTED status (keep for backward compatibility)
      if (String(data?.callStatus || '').toUpperCase() === 'NOT_INTERESTED' && !data?.stageChanged) {
        await db_pg.update(leads).set({ stage: 'NOT_INTERESTED', updatedAt: now, lastActivityAt: now }).where(whereBase);
        if (noSpace !== p) await db_pg.update(leads).set({ stage: 'NOT_INTERESTED', updatedAt: now, lastActivityAt: now }).where(tenantId ? and(eq(leads.phone, noSpace), eq(leads.tenantId, tenantId)) : eq(leads.phone, noSpace));
        if (p.startsWith('+')) {
          await db_pg.update(leads).set({ stage: 'NOT_INTERESTED', updatedAt: now, lastActivityAt: now }).where(tenantId ? and(eq(leads.phone, p.slice(1)), eq(leads.tenantId, tenantId)) : eq(leads.phone, p.slice(1)));
        } else {
          await db_pg.update(leads).set({ stage: 'NOT_INTERESTED', updatedAt: now, lastActivityAt: now }).where(tenantId ? and(eq(leads.phone, `+${p}`), eq(leads.tenantId, tenantId)) : eq(leads.phone, `+${p}`));
        }
        await db_pg.insert(leadEvents).values({ 
          leadPhone: p, 
          type: 'STAGE_CHANGE', 
          data: { 
            from: data?.currentStage || 'Unknown', 
            to: 'NOT_INTERESTED',
            reason: 'Call outcome - NOT_INTERESTED',
            callStatus: data?.callStatus
          }, 
          actorId: actor, 
          tenantId: tenantId || null 
        });
      }
    }
  } catch (error) {
    console.error('Error updating lead data:', error);
  }
  
  return NextResponse.json({ success: true });
}

export async function GET(request) {
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  const client = await clientPromise;
  const db = client.db();
  const calls = db.collection('calls');
  const allCalls = await calls.find(tenantSubdomain ? { tenantSubdomain } : {}).toArray();
  return NextResponse.json(allCalls);
}

export async function PUT(request) {
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  const client = await clientPromise;
  const db = client.db();
  const calls = db.collection('calls');
  const { _id, ...updateData } = await request.json();
  if (!_id) {
    return NextResponse.json({ success: false, error: 'Missing call ID' }, { status: 400 });
  }
  // Remove fields that shouldn't be updated
  delete updateData._id;
  updateData.updatedAt = new Date();
  const result = await calls.updateOne(
    tenantSubdomain ? { _id: new ObjectId(_id), tenantSubdomain } : { _id: new ObjectId(_id) },
    { $set: updateData }
  );
  if (result.modifiedCount === 1) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'Call not found or not updated' }, { status: 404 });
  }
}

export async function DELETE(request) {
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  const client = await clientPromise;
  const db = client.db();
  const calls = db.collection('calls');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing call ID' }, { status: 400 });
  }
  const result = await calls.deleteOne(tenantSubdomain ? { _id: new ObjectId(id), tenantSubdomain } : { _id: new ObjectId(id) });
  if (result.deletedCount === 1) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: 'Call not found' }, { status: 404 });
  }
} 