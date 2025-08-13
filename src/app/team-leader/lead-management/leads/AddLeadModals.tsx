"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export function AddLeadModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<{ phone: string; name?: string; email?: string; source?: string; stage?: string; score?: number }>({ phone: "" });
  const [submitting, setSubmitting] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-5">
        <div className="text-lg font-semibold mb-4">Add Lead</div>
        <div className="space-y-3">
          <input className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="Phone (required)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="Source" value={form.source || ""} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button
            className="rounded-xl bg-cyan-600 text-white px-4 py-2 text-sm hover:bg-cyan-700 disabled:opacity-50"
            disabled={submitting || !form.phone.trim()}
            onClick={async () => {
              setSubmitting(true);
              const res = await fetch("/api/tl/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
              if (res.ok) toast.success("Lead added"); else toast.error("Failed to add lead");
              setSubmitting(false);
              onCreated();
              onClose();
            }}
          >
            {submitting ? "Adding..." : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImportLeadsModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5">
        <div className="text-lg font-semibold mb-4">Import Leads (CSV/Excel)</div>
        <input ref={fileRef} type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const data = await file.arrayBuffer();
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
          // Normalize to { phone, name, email, source, stage, score }
          const normalized = (json as any[]).map((r) => ({
            phone: String(r.phone || r.Phone || r.PHONE || "").trim(),
            name: r.name || r.Name || r.NAME || "",
            email: r.email || r.Email || r.EMAIL || "",
            source: r.source || r.Source || r.SOURCE || "",
            stage: r.stage || r.Stage || r.STAGE || "",
            score: Number(r.score || r.Score || r.SCORE || 0) || 0,
          })).filter((r) => r.phone);
          setRows(normalized);
        }} />
        <div className="mt-3 text-xs text-slate-500">Required column: phone. Optional: name, email, source, stage, score.</div>
        <div className="mt-4 flex justify-between text-sm">
          <div>{rows.length} rows ready</div>
          <div className="flex gap-2">
            <button className="px-4 py-2" onClick={onClose}>Cancel</button>
            <button
              className="rounded-xl bg-slate-800 text-white px-4 py-2 hover:bg-slate-900 disabled:opacity-50"
              disabled={uploading || rows.length === 0}
              onClick={async () => {
                setUploading(true);
                const res = await fetch("/api/tl/leads/import", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ rows }),
                });
                if (res.ok) toast.success("Leads imported"); else toast.error("Import failed");
                setUploading(false);
                onImported();
                onClose();
              }}
            >
              {uploading ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


