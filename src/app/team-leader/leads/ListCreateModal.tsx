"use client";
import { useState } from "react";
import { authenticatedFetch } from "@/lib/tokenValidation";

export function ListCreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (list: { id: number; name: string }) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      const res = await authenticatedFetch("/api/tl/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await res.json();
      if (res.ok && data?.list) {
        onCreated(data.list);
        setName("");
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold text-gray-900">Create List</h3>
        <p className="text-sm text-gray-600 mt-1">Give your list a name.</p>
        <div className="mt-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Hot leads"
          />
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            onClick={submit}
            disabled={saving || !name.trim()}
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
} 