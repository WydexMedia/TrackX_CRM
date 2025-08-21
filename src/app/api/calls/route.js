import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { db as db_pg } from '@/db/client';
import { leads, leadEvents } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function POST(request) {
  const data = await request.json();
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
      await db_pg.insert(leadEvents).values({ leadPhone: p, type: 'CALL_LOGGED', data: { status: data?.callStatus, notes: data?.notes }, actorId: actor, tenantId: tenantId || null });

      // If the salesperson marks NOT_INTERESTED here, reflect it in lead stage and timeline
      if (String(data?.callStatus || '').toUpperCase() === 'NOT_INTERESTED') {
        await db_pg.update(leads).set({ stage: 'NOT_INTERESTED', updatedAt: now, lastActivityAt: now }).where(tenantId ? and(eq(leads.phone, p), eq(leads.tenantId, tenantId)) : eq(leads.phone, p));
        if (noSpace !== p) await db_pg.update(leads).set({ stage: 'NOT_INTERESTED', updatedAt: now, lastActivityAt: now }).where(tenantId ? and(eq(leads.phone, noSpace), eq(leads.tenantId, tenantId)) : eq(leads.phone, noSpace));
        if (p.startsWith('+')) {
          await db_pg.update(leads).set({ stage: 'NOT_INTERESTED', updatedAt: now, lastActivityAt: now }).where(tenantId ? and(eq(leads.phone, p.slice(1)), eq(leads.tenantId, tenantId)) : eq(leads.phone, p.slice(1)));
        } else {
          await db_pg.update(leads).set({ stage: 'NOT_INTERESTED', updatedAt: now, lastActivityAt: now }).where(tenantId ? and(eq(leads.phone, `+${p}`), eq(leads.tenantId, tenantId)) : eq(leads.phone, `+${p}`));
        }
        await db_pg.insert(leadEvents).values({ leadPhone: p, type: 'STAGE_CHANGE', data: { stage: 'NOT_INTERESTED' }, actorId: actor, tenantId: tenantId || null });
      }
    }
  } catch {}
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