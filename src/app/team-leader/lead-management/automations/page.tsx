"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Rule { id: string; label: string; description: string }

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [active, setActive] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const d = await fetch("/api/tl/automations", { cache: "no-store" }).then((r) => r.json());
    setRules(d.rules || []);
    setActive(d.active || "");
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Automations</h1>
      <p className="text-sm text-slate-500 mb-4">Lead assignment rules</p>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Rule</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{r.label}</td>
                <td className="px-4 py-3 text-slate-600">{r.description}</td>
                <td className="px-4 py-3">
                  {active === r.id ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">Active</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="rounded-xl bg-slate-800 text-white px-3 py-2 text-sm disabled:opacity-50"
                    disabled={saving || active === r.id}
                    onClick={async () => {
                      setSaving(true);
                      const res = await fetch("/api/tl/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id }), cache: "no-store" });
                      if (res.ok) toast.success("Automation updated"); else toast.error("Failed to update automation");
                      try {
                        if (typeof window !== "undefined") {
                          localStorage.setItem("lead_assign_rule", r.id);
                          window.dispatchEvent(new CustomEvent("automation-rule-changed", { detail: { id: r.id } }));
                        }
                      } catch {}
                      await refresh();
                      setSaving(false);
                    }}
                  >{active === r.id ? "Selected" : "Activate"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


