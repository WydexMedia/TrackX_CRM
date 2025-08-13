"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface TaskRow { id: number; leadPhone: string; title: string; status: string; dueAt: string | null; createdAt: string | null }

export default function TasksPage() {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const d = await fetch("/api/tl/tasks").then((r) => r.json());
    setRows(d.rows || []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Tasks</h1>
      <p className="text-sm text-slate-500 mb-4">SLA timers, reassignment, bulk ops</p>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Lead</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Due</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No tasks</td></tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{t.leadPhone}</td>
                    <td className="px-4 py-3">{t.title}</td>
                    <td className="px-4 py-3">{t.dueAt ? new Date(t.dueAt).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3">{t.status}</td>
                    <td className="px-4 py-3">
                      {t.status !== "DONE" && (
                        <button className="text-blue-600 hover:underline" onClick={async () => {
                          const res = await fetch("/api/tl/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, status: "DONE" }) });
                          if (res.ok) toast.success("Task marked done"); else toast.error("Failed to update task");
                          refresh();
                        }}>Mark Done</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


