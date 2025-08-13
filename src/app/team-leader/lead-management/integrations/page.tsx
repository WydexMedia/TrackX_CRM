"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Plus, Trash2, AlertTriangle, Wifi, WifiOff, Clock, CheckCircle, XCircle } from "lucide-react";

interface IntegrationRow {
  id: number;
  provider: string;
  name: string;
  status: string;
  lastSyncAt: string | null;
  metrics24h?: any;
}

interface AddIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (provider: string, name: string) => Promise<void>;
}

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  integration: IntegrationRow | null;
  isDeleting: boolean;
}

const PROVIDER_OPTIONS = [
  { value: "META_LEAD_ADS", label: "Meta Lead Ads" },
  { value: "CSV_UPLOAD", label: "CSV Upload" },
  { value: "GOOGLE_SHEETS", label: "Google Sheets" },
  { value: "SALESFORCE", label: "Salesforce" },
  { value: "HUBSPOT", label: "HubSpot" },
  { value: "ZAPIER", label: "Zapier" },
];

function AddIntegrationModal({ isOpen, onClose, onAdd }: AddIntegrationModalProps) {
  const [provider, setProvider] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ provider?: string; name?: string }>({});

  const validateForm = () => {
    const newErrors: { provider?: string; name?: string } = {};
    if (!provider) newErrors.provider = "Provider is required";
    if (!name.trim()) newErrors.name = "Name is required";
    if (name.trim().length < 2) newErrors.name = "Name must be at least 2 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onAdd(provider, name.trim());
      setProvider("");
      setName("");
      setErrors({});
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Integration</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.provider ? "border-red-300" : "border-slate-300"
                }`}
              >
                <option value="">Select a provider</option>
                {PROVIDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.provider && (
                <p className="mt-1 text-xs text-red-600">{errors.provider}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Facebook Lead Gen Campaign"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.name ? "border-red-300" : "border-slate-300"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Integration
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, integration, isDeleting }: ConfirmDeleteModalProps) {
  if (!isOpen || !integration) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold">Delete Integration</h2>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Are you sure you want to delete "{integration.name}"? This action cannot be undone and may affect your data sync.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case "active":
    case "connected":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "error":
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "syncing":
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    default:
      return <Clock className="w-4 h-4 text-slate-400" />;
  }
}

function IntegrationCard({ integration, onDelete }: { integration: IntegrationRow; onDelete: (integration: IntegrationRow) => void }) {
  const getProviderLabel = (provider: string) => {
    const option = PROVIDER_OPTIONS.find(opt => opt.value === provider);
    return option?.label || provider;
  };

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return "Never";
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 mb-1">{integration.name}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <StatusIcon status={integration.status} />
            <span className="capitalize">{integration.status}</span>
          </div>
        </div>
        <button
          onClick={() => onDelete(integration)}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete integration"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Provider</span>
          <span className="text-slate-700 font-medium">{getProviderLabel(integration.provider)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Last sync</span>
          <span className="text-slate-700">{formatLastSync(integration.lastSyncAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IntegrationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    const isInitialLoad = rows.length === 0;
    if (isInitialLoad) setLoading(true);
    else setRefreshing(true);
    
    try {
      setError(null);
      const response = await fetch("/api/tl/integrations");
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      
      const data = await response.json();
      setRows(data.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAddIntegration(provider: string, name: string) {
    const response = await fetch("/api/tl/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, name }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Failed to add integration");
    }

    // Show success notification (you'd need to implement toast or notification system)
    refresh();
  }

  async function handleDeleteIntegration() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/tl/integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to delete integration");
      }

      setConfirmOpen(false);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete integration");
    } finally {
      setDeleting(false);
    }
  }

  function openDeleteConfirm(integration: IntegrationRow) {
    setDeleteTarget(integration);
    setConfirmOpen(true);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
          <p className="text-slate-600 mt-1">Connect your data sources and telephony services</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh integrations"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Integration
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-600">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading integrations...</span>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12">
          <WifiOff className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No integrations yet</h3>
          <p className="text-slate-600 mb-6">Get started by connecting your first data source or telephony service.</p>
          <button
            onClick={() => setAddModalOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Integration
          </button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onDelete={openDeleteConfirm}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddIntegrationModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddIntegration}
      />

      <ConfirmDeleteModal
        isOpen={confirmOpen}
        onClose={() => {
          if (!deleting) {
            setConfirmOpen(false);
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleDeleteIntegration}
        integration={deleteTarget}
        isDeleting={deleting}
      />
    </div>
  );
}