"use client";

import { useEffect, useState } from "react";

export default function LeadManagementOverviewPage() {
  const [widgets, setWidgets] = useState<{ slaAtRisk: number; leadsToday: number; qualifiedRate: number } | null>(null);

  useEffect(() => {
    fetch("/api/tl/overview").then((r) => r.json()).then((d) => setWidgets(d.widgets || { slaAtRisk: 0, leadsToday: 0, qualifiedRate: 0 }));
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-slate-500">Snapshot metrics & alerts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-sm text-slate-500">SLA at Risk</div>
          <div className="mt-2 text-3xl font-semibold">{widgets ? widgets.slaAtRisk : 0}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-sm text-slate-500">Leads Today</div>
          <div className="mt-2 text-3xl font-semibold">{widgets ? widgets.leadsToday : 0}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-sm text-slate-500">Qualified Rate</div>
          <div className="mt-2 text-3xl font-semibold">{widgets ? `${widgets.qualifiedRate}%` : "0%"}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="text-lg font-semibold mb-2">Alerts</div>
        <div className="text-sm text-slate-500">No alerts right now.</div>
      </div>
    </div>
  );
}


