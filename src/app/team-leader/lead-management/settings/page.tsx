"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { authenticatedFetch } from "@/lib/tokenValidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  GripVertical, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  AlertCircle,
  Settings as SettingsIcon,
  Palette
} from "lucide-react";

interface Stage {
  id: number;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  tenantId: number;
}

const COLOR_OPTIONS = [
  { value: "slate", label: "Slate", bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" },
  { value: "gray", label: "Gray", bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" },
  { value: "red", label: "Red", bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  { value: "orange", label: "Orange", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  { value: "amber", label: "Amber", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  { value: "yellow", label: "Yellow", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  { value: "lime", label: "Lime", bg: "bg-lime-100", text: "text-lime-800", border: "border-lime-200" },
  { value: "green", label: "Green", bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  { value: "emerald", label: "Emerald", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  { value: "teal", label: "Teal", bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-200" },
  { value: "cyan", label: "Cyan", bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-200" },
  { value: "sky", label: "Sky", bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200" },
  { value: "blue", label: "Blue", bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  { value: "indigo", label: "Indigo", bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
  { value: "violet", label: "Violet", bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-200" },
  { value: "purple", label: "Purple", bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  { value: "fuchsia", label: "Fuchsia", bg: "bg-fuchsia-100", text: "text-fuchsia-800", border: "border-fuchsia-200" },
  { value: "pink", label: "Pink", bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
  { value: "rose", label: "Rose", bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" },
];

export default function SettingsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", color: "slate" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch("/api/tl/stages");
      if (res.ok) {
        const data = await res.json();
        setStages(data.stages || []);
      } else {
        toast.error("Failed to load stages");
      }
    } catch (error) {
      toast.error("Failed to load stages");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStage = async () => {
    if (!formData.name.trim()) {
      toast.error("Stage name is required");
      return;
    }

    try {
      setSaving(true);
      const res = await authenticatedFetch("/api/tl/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          color: formData.color,
          order: stages.length + 1
        })
      });

      if (res.ok) {
        toast.success("Stage added successfully");
        setShowAddModal(false);
        setFormData({ name: "", color: "slate" });
        loadStages();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add stage");
      }
    } catch (error) {
      toast.error("Failed to add stage");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStage = async () => {
    if (!editingStage || !formData.name.trim()) {
      toast.error("Stage name is required");
      return;
    }

    try {
      setSaving(true);
      const res = await authenticatedFetch("/api/tl/stages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingStage.id,
          name: formData.name,
          color: formData.color,
        })
      });

      if (res.ok) {
        toast.success("Stage updated successfully");
        setEditingStage(null);
        setFormData({ name: "", color: "slate" });
        loadStages();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update stage");
      }
    } catch (error) {
      toast.error("Failed to update stage");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStage = async (id: number) => {
    try {
      const res = await authenticatedFetch("/api/tl/stages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        toast.success("Stage deleted successfully");
        setShowDeleteConfirm(null);
        loadStages();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete stage");
      }
    } catch (error) {
      toast.error("Failed to delete stage");
    }
  };

  const moveStage = async (stageId: number, direction: "up" | "down") => {
    const index = stages.findIndex(s => s.id === stageId);
    if (index === -1) return;
    
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === stages.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...stages];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

    // Update local state immediately for smooth UX
    setStages(reordered);

    // Update backend
    try {
      await Promise.all([
        authenticatedFetch("/api/tl/stages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: reordered[index].id, order: index + 1 })
        }),
        authenticatedFetch("/api/tl/stages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: reordered[newIndex].id, order: newIndex + 1 })
        })
      ]);
    } catch (error) {
      toast.error("Failed to reorder stages");
      loadStages(); // Reload on error
    }
  };

  const getColorClasses = (colorName: string) => {
    const colorOption = COLOR_OPTIONS.find(c => c.value === colorName);
    return colorOption || COLOR_OPTIONS[0];
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">Manage your lead stages, territories, and preferences</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stages Management - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Palette className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Lead Stages</h2>
                    <p className="text-xs text-slate-500">Customize your sales pipeline stages</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAddModal(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Stage
                </Button>
              </div>
            </div>

    <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                  <p className="text-sm text-slate-500 mt-3">Loading stages...</p>
                </div>
              ) : stages.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No stages found. Add your first stage to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stages.map((stage, index) => {
                    const colorClasses = getColorClasses(stage.color);
                    return (
                      <div
                        key={stage.id}
                        className="group flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-white"
                      >
                        {/* Drag Handle */}
                        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveStage(stage.id, "up")}
                            disabled={index === 0}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveStage(stage.id, "down")}
                            disabled={index === stages.length - 1}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>

                        {/* Order Badge */}
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-600">{index + 1}</span>
                        </div>

                        {/* Stage Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
                              {stage.name}
                            </span>
                            {stage.isDefault && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                Default
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingStage(stage);
                              setFormData({ name: stage.name, color: stage.color });
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit stage"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(stage.id)}
                            disabled={stage.isDefault}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={stage.isDefault ? "Cannot delete default stage" : "Delete stage"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Stage Management Tips</p>
                    <ul className="text-xs space-y-1 text-blue-800">
                      <li>• Use the arrows to reorder stages in your pipeline</li>
                      <li>• Default stages can be edited but not deleted</li>
                      <li>• Choose colors that match your workflow (e.g., green for positive, red for negative)</li>
                      <li>• Stage order reflects your typical sales progression</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other Settings - Placeholder */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Settings</h2>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span>Fields Manager</span>
                <span className="text-xs text-slate-400">Coming soon</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span>Territories</span>
                <span className="text-xs text-slate-400">Coming soon</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Consent Settings</span>
                <span className="text-xs text-slate-400">Coming soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Stage Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => { 
        if (!open) { 
          setShowAddModal(false); 
          setFormData({ name: "", color: "slate" }); 
        } 
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Add New Stage
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Stage Name
              </label>
              <Input
                placeholder="e.g. Demo Scheduled"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_OPTIONS.map((color) => {
                  const isSelected = formData.color === color.value;
                  return (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        isSelected 
                          ? 'border-blue-500 shadow-md scale-105' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      title={color.label}
                    >
                      <div className={`w-full h-8 rounded ${color.bg} flex items-center justify-center`}>
                        <span className={`text-xs font-medium ${color.text}`}>Aa</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Selected: <span className="font-medium">{COLOR_OPTIONS.find(c => c.value === formData.color)?.label}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                New stages will be added to the end of your pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowAddModal(false);
                setFormData({ name: "", color: "slate" });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddStage}
              disabled={saving || !formData.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Add Stage
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Modal */}
      <Dialog open={!!editingStage} onOpenChange={(open) => { 
        if (!open) { 
          setEditingStage(null); 
          setFormData({ name: "", color: "slate" }); 
        } 
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Edit Stage
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Stage Name
              </label>
              <Input
                placeholder="Stage name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_OPTIONS.map((color) => {
                  const isSelected = formData.color === color.value;
                  return (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        isSelected 
                          ? 'border-blue-500 shadow-md scale-105' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      title={color.label}
                    >
                      <div className={`w-full h-8 rounded ${color.bg} flex items-center justify-center`}>
                        <span className={`text-xs font-medium ${color.text}`}>Aa</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Selected: <span className="font-medium">{COLOR_OPTIONS.find(c => c.value === formData.color)?.label}</span>
              </p>
            </div>

            {editingStage?.isDefault && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  This is a default stage. You can edit it but cannot delete it.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <Button 
              variant="ghost" 
              onClick={() => {
                setEditingStage(null);
                setFormData({ name: "", color: "slate" });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStage}
              disabled={saving || !formData.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Update Stage
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => { if (!open) setShowDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Delete Stage?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this stage? This action cannot be undone.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>Warning:</strong> Existing leads with this stage will not be affected, but the stage won't appear in dropdowns anymore.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDeleteStage(showDeleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Stage
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
