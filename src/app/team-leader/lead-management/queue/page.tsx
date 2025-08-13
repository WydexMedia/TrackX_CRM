"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

interface LeadRow {
  phone: string;
  name: string | null;
  email: string | null;
  source: string | null;
  stage: string;
  ownerId: string | null;
  createdAt: string | null;
}

export default function QueuePage() {
  const [tab, setTab] = useState<"unassigned" | "aging" | "hot">("unassigned");
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState<Array<{ code: string; name: string }>>([]);
  const [assignee, setAssignee] = useState<string>("");
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("tab", tab);
    sp.set("limit", String(pageSize));
    sp.set("offset", String((page - 1) * pageSize));
    return sp.toString();
  }, [tab, page, pageSize]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tl/queue?${params}`).then((r) => r.json()).then((d) => { setRows(d.rows || []); setTotal(d.total || 0); }).finally(() => setLoading(false));
  }, [params]);

  // Load salespersons from Mongo-backed API
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((all) => {
        const onlySales = (Array.isArray(all) ? all : []).filter((u: any) => u.role === "sales");
        setSales(onlySales.map((u: any) => ({ code: u.code, name: u.name })));
      })
      .catch(() => {});
  }, []);

  const phones = Object.keys(selected).filter((k) => selected[k]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Queue</h1>
      <p className="text-sm text-slate-500 mb-4">Unassigned, aging, hot leads</p>

      <div className="flex items-center gap-2 mb-3">
        <button className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${tab === "unassigned" ? "bg-slate-900 text-white" : "bg-white border"}`} onClick={() => setTab("unassigned")}>Unassigned</button>
        <button className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${tab === "aging" ? "bg-slate-900 text-white" : "bg-white border"}`} onClick={() => setTab("aging")}>Aging</button>
        <button className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${tab === "hot" ? "bg-slate-900 text-white" : "bg-white border"}`} onClick={() => setTab("hot")}>Hot</button>
        <div className="flex-1" />
        <select
          className="border border-slate-300 rounded-md px-2 py-2 text-sm"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        >
          <option value="">Select salesperson…</option>
          {sales.map((s) => (
            <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
          ))}
        </select>
        <button
          className="rounded-xl bg-slate-800 text-white px-3 py-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          disabled={phones.length === 0 || !assignee}
          onClick={async () => {
            const res = await fetch("/api/tl/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign", phones, ownerId: assignee }) });
            if (res.ok) toast.success(`Assigned ${phones.length} lead(s)`); else toast.error("Assignment failed");
            setSelected({});
            const d = await fetch(`/api/tl/queue?${params}`).then((r) => r.json());
            setRows(d.rows || []);
          }}
        >Assign</button>
        <button
          className="rounded-xl cursor-pointer bg-emerald-600 text-white px-3 py-2 text-sm disabled:opacity-50 inline-flex items-center gap-2"
          disabled={phones.length === 0 || autoAssigning}
          onClick={async () => {
            try {
              setAutoAssigning(true);
              const res = await fetch("/api/tl/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "autoAssign", phones }) });
              if (res.ok) {
                const data = await res.json();
                toast.success(`Auto-assigned ${phones.length} lead(s) via ${data.rule}`);
              } else {
                toast.error("Auto-assign failed");
              }
              setSelected({});
              const d = await fetch(`/api/tl/queue?${params}`).then((r) => r.json());
              setRows(d.rows || []);
            } finally {
              setAutoAssigning(false);
            }
          }}
        >
          {autoAssigning && (
            <span className="inline-block  h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" aria-hidden="true" />
          )}
          <span>{autoAssigning ? "Auto-Assigning…" : "Auto-Assign (Active Rule)"}</span>
        </button>
        <button
          className="rounded-xl bg-cyan-600 text-white px-3 py-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          disabled={phones.length === 0}
          onClick={async () => {
            const title = prompt("Task title:") || "Follow up";
            const dueAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            const res = await fetch("/api/tl/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bulkTask", phones, title, dueAt }) });
            if (res.ok) toast.success("Tasks created"); else toast.error("Failed to create tasks");
            setSelected({});
          }}
        >Create Tasks</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" onChange={(e) => {
                  const next: Record<string, boolean> = {};
                  if (e.target.checked) rows.forEach((r) => (next[r.phone] = true));
                  setSelected(next);
                }} /></th>
                <th className="text-left px-4 py-3">Lead</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Age</th>
                <th className="text-left px-4 py-3">SLA</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>No leads</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.phone} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><input type="checkbox" checked={!!selected[r.phone]} onChange={(e) => setSelected({ ...selected, [r.phone]: e.target.checked })} /></td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name || "—"}</div>
                      <div className="text-xs text-slate-500">{r.phone} {r.email ? `• ${r.email}` : ""}</div>
                    </td>
                    <td className="px-4 py-3">{r.source || "—"}</td>
                    <td className="px-4 py-3">{(sales.find((s) => s.code === (r.ownerId || ""))?.name) || r.ownerId || "—"}</td>
                    <td className="px-4 py-3">{r.createdAt ? `${Math.floor((Date.now() - new Date(r.createdAt).getTime())/3600000)}h` : "—"}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">OK</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-slate-600">Showing {(page - 1) * pageSize + (rows.length ? 1 : 0)}-{Math.min(page * pageSize, total)} of {total}</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Rows:</span>
            <select
              className="border border-slate-300 rounded-md px-2 py-1 text-sm cursor-pointer"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded-lg border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >Previous</button>
          <button
            className="px-3 py-1.5 rounded-lg border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}


