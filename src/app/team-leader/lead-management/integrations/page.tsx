"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Plus, Trash2, AlertTriangle, Wifi, WifiOff, Clock, CheckCircle, XCircle, Search, Edit, User, Infinity, Plug, BookOpen, FileText, CreditCard, FileSpreadsheet, Mail, MessageSquare, Calendar, Facebook, Zap, Cloud, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authenticatedFetch } from "@/lib/tokenValidation";

interface IntegrationRow {
  id: number;
  provider: string;
  name: string;
  status: string;
  lastSyncAt: string | null;
  metrics24h?: any;
  email?: string;
  level?: string;
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
  { value: "META_LEAD_ADS", label: "Meta Lead Ads", icon: Facebook },
  { value: "CSV_UPLOAD", label: "CSV Upload", icon: FileSpreadsheet },
  { value: "GOOGLE_SHEETS", label: "Google Sheets", icon: FileSpreadsheet },
  { value: "SALESFORCE", label: "Salesforce", icon: Cloud },
  { value: "HUBSPOT", label: "HubSpot", icon: CircleDollarSign },
  { value: "ZAPIER", label: "Zapier", icon: Zap },
];

const BROWSE_INTEGRATIONS = [
  { name: "Zoho Books", description: "Connect your Zoho Books account to Trackx", icon: BookOpen, provider: "ZOHO_BOOKS" },
  { name: "Wafeq", description: "Connect your Wafeq account to Trackx", icon: FileText, provider: "WAFEQ" },
  { name: "Telr", description: "Connect your Telr account to Trackx", icon: CreditCard, provider: "TELR" },
  { name: "Forms", description: "Connect your Forms account to Trackx, set webhook to https://api.Trackx.com/api/webhooks/forms", icon: FileSpreadsheet, provider: "FORMS" },
  { name: "Zoho Mail", description: "Connect your Zoho Mail account to Trackx", icon: Mail, provider: "ZOHO_MAIL" },
  { name: "Gmail", description: "Connect your Gmail account to Trackx", icon: Mail, provider: "GMAIL" },
  { name: "Outlook", description: "Connect your Outlook account to Trackx", icon: Mail, provider: "OUTLOOK" },
  { name: "WhatsApp", description: "Connect your WhatsApp Business account to Trackx", icon: MessageSquare, provider: "WHATSAPP" },
  { name: "Facebook Leads", description: "Connect your Facebook account to Trackx to get leads", icon: Facebook, provider: "FACEBOOK_LEADS" },
  { name: "Calendly", description: "Connect Calendly to auto-create activities from bookings.", icon: Calendar, provider: "CALENDLY" },
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Integration</DialogTitle>
        </DialogHeader>
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
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Facebook Lead Gen Campaign"
                className={errors.name ? "border-red-300" : ""}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-cyan-600 hover:bg-cyan-700"
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
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, integration, isDeleting }: ConfirmDeleteModalProps) {
  if (!integration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <DialogTitle>Delete Integration</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete "{integration.name}"? This action cannot be undone and may affect your data sync.
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={onClose}
            disabled={isDeleting}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
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
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConnectedIntegrationCard({ integration, onDelete, onEdit }: { 
  integration: IntegrationRow; 
  onDelete: (integration: IntegrationRow) => void;
  onEdit: (integration: IntegrationRow) => void;
}) {
  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'gmail':
        return <Mail className="w-5 h-5 text-red-500" />;
      case 'meta_lead_ads':
        return <Facebook className="w-5 h-5 text-blue-600" />;
      case 'csv_upload':
        return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'google_sheets':
        return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'salesforce':
        return <Cloud className="w-5 h-5 text-blue-500" />;
      case 'hubspot':
        return <CircleDollarSign className="w-5 h-5 text-orange-500" />;
      case 'zapier':
        return <Zap className="w-5 h-5 text-orange-500" />;
      case 'zoho_books':
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'wafeq':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'telr':
        return <CreditCard className="w-5 h-5 text-green-600" />;
      case 'forms':
        return <FileSpreadsheet className="w-5 h-5 text-purple-600" />;
      case 'zoho_mail':
        return <Mail className="w-5 h-5 text-blue-600" />;
      case 'outlook':
        return <Mail className="w-5 h-5 text-blue-600" />;
      case 'whatsapp':
        return <MessageSquare className="w-5 h-5 text-green-500" />;
      case 'facebook_leads':
        return <Facebook className="w-5 h-5 text-blue-600" />;
      case 'calendly':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      default:
        return <Plug className="w-5 h-5 text-slate-500" />;
    }
  };

  const getProviderLabel = (provider: string) => {
    const option = PROVIDER_OPTIONS.find(opt => opt.value === provider);
    return option?.label || provider.replace(/_/g, ' ');
  };

  return (
    <Card className="bg-slate-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              {getProviderIcon(integration.provider)}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{integration.name}</h3>
              <p className="text-sm text-slate-600">{integration.email || getProviderLabel(integration.provider)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-100 text-yellow-800 gap-1">
              <User className="w-3 h-3" />
              {integration.level || "User level"}
            </Badge>
            <Button
              onClick={() => onEdit(integration)}
              variant="ghost"
              size="sm"
              className="p-2 text-slate-400 hover:text-slate-600"
              title="Edit integration"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onDelete(integration)}
              variant="ghost"
              size="sm"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50"
              title="Delete integration"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BrowseIntegrationCard({ integration, onConnect }: { 
  integration: typeof BROWSE_INTEGRATIONS[0];
  onConnect: (integration: typeof BROWSE_INTEGRATIONS[0]) => void;
}) {
  const IconComponent = integration.icon;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <IconComponent className="w-4 h-4 text-slate-600" />
          </div>
          <Button 
            onClick={() => onConnect(integration)}
            size="sm"
            className="bg-green-600 hover:bg-green-700 gap-1"
          >
            <Plug className="w-3 h-3" />
            Connect
          </Button>
        </div>
        <h3 className="font-semibold text-slate-900 mb-1">{integration.name}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{integration.description}</p>
      </CardContent>
    </Card>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIntegration, setSelectedIntegration] = useState<typeof BROWSE_INTEGRATIONS[0] | null>(null);

  const filteredBrowseIntegrations = BROWSE_INTEGRATIONS.filter(integration =>
    integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    integration.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function refresh() {
    const isInitialLoad = rows.length === 0;
    if (isInitialLoad) setLoading(true);
    else setRefreshing(true);
    
    try {
      setError(null);
      const response = await authenticatedFetch("/api/tl/integrations");
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
    const response = await authenticatedFetch("/api/tl/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, name }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Failed to add integration");
    }

    refresh();
  }

  async function handleDeleteIntegration() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const response = await authenticatedFetch("/api/tl/integrations", {
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

  function handleEditIntegration(integration: IntegrationRow) {
    // TODO: Implement edit functionality
    console.log("Edit integration:", integration);
  }

  function handleConnectIntegration(integration: typeof BROWSE_INTEGRATIONS[0]) {
    setSelectedIntegration(integration);
    setAddModalOpen(true);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Integrations</h1>
        <p className="text-slate-600">Connect your favorite apps to Trackx.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 text-sm">{error}</span>
            <Button
              onClick={() => setError(null)}
              variant="ghost"
              size="sm"
              className="ml-auto p-0 text-red-600 hover:text-red-800"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Connected Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Connected</h2>
          <Button
            onClick={refresh}
            disabled={refreshing}
            variant="ghost"
            size="sm"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            title="Refresh integrations"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-slate-600">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Loading integrations...</span>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-8">
                <WifiOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No connected integrations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((integration) => (
                  <ConnectedIntegrationCard
                    key={integration.id}
                    integration={integration}
                    onDelete={openDeleteConfirm}
                    onEdit={handleEditIntegration}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Browse Integrations Section */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Browse Integrations</h2>
        <p className="text-slate-600 mb-4">Discover new integrations.</p>
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        {/* Integration Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBrowseIntegrations.map((integration, index) => (
            <BrowseIntegrationCard
              key={index}
              integration={integration}
              onConnect={handleConnectIntegration}
            />
          ))}
        </div>

        {filteredBrowseIntegrations.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No integrations found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddIntegrationModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setSelectedIntegration(null);
        }}
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