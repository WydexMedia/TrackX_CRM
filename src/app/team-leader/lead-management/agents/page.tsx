"use client";

import { useEffect, useState } from "react";

interface AgentKPI {
  user: { id: string; name: string };
  touches: number;
  connects: number;
  qualRate: number;
  frtMedianSec: number;
  openTasks: number;
  breaches: number;
}

export default function AgentsPage() {
  const [rows, setRows] = useState<AgentKPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [salesByCode, setSalesByCode] = useState<Record<string, { name: string; code: string }>>({});

  useEffect(() => {
    setLoading(true);
    fetch("/api/tl/agents/kpis").then((r) => r.json()).then((d) => setRows(d.rows || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((all) => {
        const onlySales = (Array.isArray(all) ? all : []).filter((u: any) => (u.role ?? 'sales') === "sales");
        const map: Record<string, { name: string; code: string }> = {};
        for (const u of onlySales) map[u.code] = { name: u.name, code: u.code };
        setSalesByCode(map);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Agents</h1>
      <p className="text-sm text-slate-500 mb-4">Productivity, leaderboard, coaching</p>

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rows.map((r) => {
            const displayName = salesByCode[r.user.id]?.name || r.user.name || r.user.id;
            return (
            <div key={r.user.id} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="font-medium">{displayName}</div>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
                <div>Touches</div><div className="text-right font-medium">{r.touches}</div>
                <div>Connects</div><div className="text-right font-medium">{r.connects}</div>
                <div>Open Tasks</div><div className="text-right font-medium">{r.openTasks}</div>
                <div>Breaches</div><div className="text-right font-medium">{r.breaches}</div>
              </div>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}


