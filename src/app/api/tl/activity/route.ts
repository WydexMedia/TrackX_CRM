import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { leads, leadEvents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { MongoClient } from "mongodb";

function summarizeEvent(e: any, leadName: string | null | undefined, nameByCode: Map<string, string> | null) {
  const t = e.type as string;
  const lp = e.leadPhone as string;
  const actorCode = e.actorId as string | null;
  const actorName = actorCode && nameByCode ? nameByCode.get(actorCode) : undefined;
  const who = actorCode ? ` by ${actorName || actorCode}` : "";
  const name = leadName || lp;
  // Simple mapping of known event types to readable messages and colors
  switch (t) {
    case "CREATED":
      return { title: `Lead created`, detail: name, color: "green" };
    case "ASSIGNED": {
      const owner = e.data?.ownerId ? String(e.data.ownerId) : "";
      const ownerLabel = owner ? (nameByCode?.get(owner) ? `${nameByCode?.get(owner)}` : owner) : "";
      return { title: `Assigned${ownerLabel ? ` to ${ownerLabel}` : ""}`, detail: name, color: "blue" };
    }
    case "CALL_STARTED":
      return { title: `Call started${who}` , detail: name, color: "amber" };
    case "CALL_ENDED":
      return { title: `Call ended${who}` , detail: name, color: "slate" };
    case "CALL_OUTCOME": {
      const status = e.data?.status ? String(e.data.status) : "updated";
      return { title: `Call outcome: ${status}`, detail: name, color: "purple" };
    }
    case "LEAD_STATUS_CHANGED": {
      const stage = e.data?.stage ? String(e.data.stage) : "updated";
      return { title: `Lead stage → ${stage}`, detail: name, color: "cyan" };
    }
    default:
      return { title: t.replaceAll("_", " "), detail: name, color: "indigo" };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 10);

    // Optional: load users to resolve codes -> names
    let nameByCode: Map<string, string> | null = null;
    try {
      const uri = process.env.MONGODB_URI as string;
      if (uri) {
        const mongo = new MongoClient(uri);
        await mongo.connect();
        const mdb = mongo.db();
        const users = mdb.collection("users");
        const docs = await users.find({}, { projection: { code: 1, name: 1 } }).toArray();
        nameByCode = new Map<string, string>();
        for (const u of docs) {
          if (typeof (u as any).code === "string" && typeof (u as any).name === "string") {
            nameByCode.set(String((u as any).code), String((u as any).name));
          }
        }
        await mongo.close();
      }
    } catch {
      // If Mongo is not configured or fails, proceed without names
      nameByCode = null;
    }

    const rows = await db
      .select({
        id: leadEvents.id,
        at: leadEvents.at,
        type: leadEvents.type,
        data: leadEvents.data,
        actorId: leadEvents.actorId,
        leadPhone: leadEvents.leadPhone,
        leadName: leads.name,
      })
      .from(leadEvents)
      .leftJoin(leads, eq(leads.phone, leadEvents.leadPhone))
      .orderBy(desc(leadEvents.at))
      .limit(limit);

    const items = rows.map((r: any) => {
      const summary = summarizeEvent(r, r.leadName, nameByCode);
      return {
        id: r.id,
        at: r.at,
        type: r.type,
        leadPhone: r.leadPhone,
        actorId: r.actorId || null,
        title: summary.title,
        detail: summary.detail,
        color: summary.color,
      };
    });

    return new Response(JSON.stringify({ success: true, items }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || "Failed to fetch activity" }), { status: 500 });
  }
}
