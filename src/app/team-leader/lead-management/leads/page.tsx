"use client";

import { useEffect, useMemo, useState } from "react";
import { AddLeadModal, ImportLeadsModal } from "./AddLeadModals";

interface LeadRow {
  phone: string;
  name: string | null;
  email: string | null;
  source: string | null;
  utm: Record<string, string> | null;
  stage: string;
  ownerId: string | null;
  score: number | null;
  lastActivityAt: string | null;
  createdAt: string | null;
}

export default function LeadsPage() {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newLead, setNewLead] = useState<{ phone: string; name?: string; email?: string; source?: string; stage?: string; score?: number }>({ phone: "" });
  const [importing, setImporting] = useState(false);
  const [sales, setSales] = useState<Array<{ code: string; name: string }>>([]);

  const params = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (stage) sp.set("stage", stage);
    if (source) sp.set("source", source);
    if (owner) sp.set("owner", owner);
    sp.set("limit", String(pageSize));
    sp.set("offset", String((page - 1) * pageSize));
    return sp.toString();
  }, [q, stage, source, owner, page]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tl/leads?${params}`)
      .then((r) => r.json())
      .then((d) => { setRows(d.rows || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, [params]);

  // Load salesperson list and preselect if owner is present in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const preOwner = sp.get("owner");
      if (preOwner) setOwner(preOwner);
    }
    fetch("/api/users")
      .then((r) => r.json())
      .then((all) => {
        const onlySales = (Array.isArray(all) ? all : []).filter((u: any) => (u.role ?? 'sales') === "sales");
        setSales(onlySales.map((u: any) => ({ code: u.code, name: u.name })));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Leads</h1>
            <p className="text-sm text-slate-500">Data table with advanced filters</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-900" onClick={() => setShowImport(true)}>Import CSV/Excel</button>
            <button className="rounded-xl bg-cyan-600 text-white px-4 py-2 text-sm hover:bg-cyan-700" onClick={() => setShowAdd(true)}>Add Lead</button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="border border-slate-300 rounded-md px-3 py-2 text-sm"
            placeholder="Search name, phone, email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">All Sources</option>
            <option value="META">Meta Lead Ads</option>
            <option value="GOOGLE">Google Lead Form</option>
            <option value="CSV">CSV Upload</option>
          </select>
          <select
            className="border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="">All Stages</option>
            <option value="NEW">New</option>
            <option value="ATTEMPTED">Attempted</option>
            <option value="CONNECTED">Connected</option>
            <option value="QUALIFIED">Qualified</option>
          </select>
          <select
            className="border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option value="">All Owners</option>
            {sales.map((s) => (
              <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Lead</th>
                <th className="text-left px-4 py-3">Source/UTM</th>
                <th className="text-left px-4 py-3">Stage</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Last Activity</th>
                <th className="text-left px-4 py-3">Age</th>
                <th className="text-left px-4 py-3">SLA</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={9}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={9}>
                    No leads found
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const utm = r.utm ? Object.entries(r.utm).map(([k, v]) => `${k}=${v}`).join(" ") : "";
                  return (
                    <tr key={r.phone} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <a href={`/team-leader/lead-management/leads/${encodeURIComponent(r.phone)}`} className="font-medium text-blue-600 hover:underline">{r.name || "—"}</a>
                        <div className="text-xs text-slate-500">
                          {r.phone} {r.email ? `• ${r.email}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.source || "—"} {utm && `• ${utm}`}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs">
                          {r.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3">{(sales.find((s) => s.code === (r.ownerId || ""))?.name) || r.ownerId || "—"}</td>
                      <td className="px-4 py-3">{r.score ?? 0}</td>
                      <td className="px-4 py-3">{r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">{r.createdAt ? `${Math.floor((Date.now() - new Date(r.createdAt).getTime())/3600000)}h` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">OK</span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-blue-600 hover:underline">Preview</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-slate-600">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >Previous</button>
          <button
            className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >Next</button>
        </div>
      </div>

      <AddLeadModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={() => {
          // refresh
          fetch(`/api/tl/leads?${params}`).then((r) => r.json()).then((d) => setRows(d.rows || []));
        }}
      />
      <ImportLeadsModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => {
          fetch(`/api/tl/leads?${params}`).then((r) => r.json()).then((d) => setRows(d.rows || []));
        }}
      />
    </div>
  );
}



