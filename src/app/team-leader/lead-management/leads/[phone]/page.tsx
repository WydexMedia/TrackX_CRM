"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface Lead {
  phone: string;
  name: string | null;
  email: string | null;
  source: string | null;
  stage: string;
  ownerId: string | null;
  score: number | null;
  createdAt: string | null;
}

const getEventIcon = (type: string) => {
  switch (type) {
    case "ASSIGNED":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "STAGE_CHANGE":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "created":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

const getEventColor = (type: string) => {
  switch (type) {
    case "ASSIGNED":
      return {
        bg: "bg-blue-500",
        ring: "ring-blue-100",
        text: "text-blue-700",
        bgLight: "bg-blue-50"
      };
    case "STAGE_CHANGE":
      return {
        bg: "bg-green-500",
        ring: "ring-green-100",
        text: "text-green-700",
        bgLight: "bg-green-50"
      };
    case "created":
      return {
        bg: "bg-purple-500",
        ring: "ring-purple-100",
        text: "text-purple-700",
        bgLight: "bg-purple-50"
      };
    default:
      return {
        bg: "bg-gray-500",
        ring: "ring-gray-100",
        text: "text-gray-700",
        bgLight: "bg-gray-50"
      };
  }
};

export default function LeadDetailPage() {
  const routeParams = useParams<{ phone: string }>();
  const phone = decodeURIComponent(String(routeParams.phone));
  const [lead, setLead] = useState<Lead | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [salesByCode, setSalesByCode] = useState<Record<string, { name: string; code: string }>>({});
  const [assignee, setAssignee] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tl/leads/${encodeURIComponent(phone)}`)
      .then((r) => r.json())
      .then((d) => { setLead(d.lead || null); setEvents(d.events || []); setTasks(d.tasks || []); })
      .finally(() => setLoading(false));
  }, [phone]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((all) => {
        const onlySales = (Array.isArray(all) ? all : []).filter((u: any) => (u.role ?? 'sales') === "sales");
        const map: Record<string, { name: string; code: string }> = {};
        for (const u of onlySales) map[u.code] = { name: u.name, code: u.code };
        setSalesByCode(map);
        setAssignee((prev) => prev || (lead?.ownerId || ""));
      })
      .catch(() => {});
  }, [lead?.ownerId]);

  const timeline = (() => {
    const items: Array<{ id: string | number; label: string; at?: string; meta?: string; type: string; data?: any }> = [];
    if (lead) {
      items.push({
        id: "created",
        label: "Prospect Created",
        at: lead.createdAt || undefined,
        meta: `Source: ${lead.source || "—"}`,
        type: "created",
      });
    }
    for (const e of events.slice().sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime())) {
      const type = String(e.type || "Event");
      let label = type;
      let meta: string | undefined = undefined;
      if (type === "ASSIGNED") {
        const ownerCode = e.data?.ownerId || "";
        const ownerName = salesByCode[ownerCode]?.name || ownerCode || undefined;
        label = "Lead Assigned";
        meta = ownerName ? `Assigned to ${ownerName}` : undefined;
      }
      if (type === "STAGE_CHANGE") {
        label = "Stage Changed";
        meta = e.data?.from && e.data?.to ? `${e.data.from} → ${e.data.to}` : undefined;
      }
      items.push({ id: e.id, label, at: e.at, meta, type, data: e.data });
    }
    return items.reverse(); // Show latest first
  })();

  if (loading) return <div className="p-6">Loading…</div>;
  if (!lead) return <div className="p-6">Lead not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500"><Link href="/team-leader/lead-management/leads" className="hover:underline">Leads</Link> / {lead.phone}</div>
          <h1 className="text-2xl font-semibold">{lead.name || lead.phone}</h1>
          <div className="text-sm text-slate-600">{lead.email || "—"} • Source: {lead.source || "—"} • Stage: {lead.stage || "NEW"}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
          </div>
          
          {timeline.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-sm text-slate-500">No activity yet</p>
            </div>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {timeline.map((item, idx) => {
                  const colors = getEventColor(item.type);
                  const isLast = idx === timeline.length - 1;
                  
                  return (
                    <li key={`${item.id}-${idx}`}>
                      <div className="relative pb-8">
                        {!isLast && (
                          <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                        )}
                        <div className="relative flex items-start space-x-3">
                          <div className={`relative px-1 ${colors.bgLight} rounded-lg`}>
                            <div className={`h-8 w-8 rounded-lg ${colors.bg} flex items-center justify-center ring-8 ${colors.ring}`}>
                              <div className="text-white">
                                {getEventIcon(item.type)}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                                {item.at && (
                                  <time className="text-xs text-slate-500 font-medium">
                                    {new Date(item.at).toLocaleDateString()} at {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </time>
                                )}
                              </div>
                              {item.meta && (
                                <div className="mt-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.text} ${colors.bgLight} border`}>
                                    {item.meta}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-900">Lead Details</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{lead.phone}</dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Owner</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{salesByCode[lead.ownerId || ""]?.name || lead.ownerId || "—"}</dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Score</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    (lead.score ?? 0) >= 80 ? 'text-green-800 bg-green-100' :
                    (lead.score ?? 0) >= 60 ? 'text-yellow-800 bg-yellow-100' :
                    'text-red-800 bg-red-100'
                  }`}>
                    {lead.score ?? 0}
                  </span>
                </dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}</dd>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">Reassign Lead</label>
              <div className="space-y-3">
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="">Select salesperson…</option>
                  {Object.values(salesByCode).map((s) => (
                    <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                  ))}
                </select>
                <button
                  className="w-full rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
                  disabled={!assignee || assigning}
                  onClick={async () => {
                    try {
                      setAssigning(true);
                      const toastId = toast.loading("Assigning…");
                      const res = await fetch("/api/tl/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign", phones: [lead.phone], ownerId: assignee }) });
                      if (res.ok) {
                        toast.success("Lead reassigned", { id: toastId });
                        const d = await fetch(`/api/tl/leads/${encodeURIComponent(phone)}`).then((r) => r.json());
                        setLead(d.lead || null); setEvents(d.events || []); setTasks(d.tasks || []);
                      } else {
                        toast.error("Failed to reassign", { id: toastId });
                      }
                    } finally {
                      setAssigning(false);
                    }
                  }}
                >
                  {assigning && (
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" aria-hidden="true" />
                  )}
                  <span>{assigning ? "Assigning…" : "Assign Lead"}</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-sm font-medium text-slate-700">Tasks</h3>
              </div>
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-500">No tasks assigned</p>
                  </div>
                ) : (
                  tasks.map((t) => (
                    <div key={t.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                      <div className="font-medium text-sm text-slate-900">{t.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          t.status === 'completed' ? 'text-green-800 bg-green-100' :
                          t.status === 'in_progress' ? 'text-blue-800 bg-blue-100' :
                          'text-gray-800 bg-gray-100'
                        }`}>
                          {t.status}
                        </span>
                        {t.dueAt && (
                          <span className="text-xs text-slate-500">
                            Due: {new Date(t.dueAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}