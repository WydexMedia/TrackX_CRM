"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface IntegrationRow { id: number; provider: string; name: string; status: string; lastSyncAt: string | null; metrics24h?: any }

export default function IntegrationsPage() {
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const d = await fetch("/api/tl/integrations").then((r) => r.json());
    setRows(d.rows || []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-sm text-slate-500">Connect sources & telephony</p>
        </div>
        <button
          className="rounded-xl bg-cyan-600 text-white px-4 py-2 text-sm hover:bg-cyan-700"
          onClick={async () => {
            const provider = prompt("Provider (e.g., META_LEAD_ADS, CSV_UPLOAD):") || "";
            const name = prompt("Display name:") || "";
            if (!provider || !name) return;
            const res = await fetch("/api/tl/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, name }) });
            if (res.ok) toast.success("Integration added"); else toast.error("Failed to add integration");
            refresh();
          }}
        >Add Integration</button>
      </div>
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-500">No integrations yet.</div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((i) => (
            <div key={i.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="font-medium">{i.name}</div>
              <div className="text-xs text-slate-500 mt-1">Provider: {i.provider}</div>
              <div className="text-xs text-slate-500 mt-1">Status: {i.status}</div>
              <div className="text-xs text-slate-500 mt-1">Last sync: {i.lastSyncAt || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


