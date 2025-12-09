"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
// Clerk handles authentication automatically via cookies - no need for fetch
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  AlertCircle,
  Settings as SettingsIcon,
  Palette,
  ChevronUp,
  ChevronDown,
  Info,
  Layers,
  Sparkles,
  RefreshCw
} from "lucide-react";

interface Stage {
  id: number;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  tenantId: number;
}

interface Course {
  id: number;
  name: string;
  price: number;
  description: string | null;
  isActive: boolean;
  tenantId: number;
}

const COLOR_OPTIONS = [
  { value: "slate", label: "Slate", bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200", dot: "bg-slate-500" },
  { value: "gray", label: "Gray", bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200", dot: "bg-gray-500" },
  { value: "red", label: "Red", bg: "bg-red-100", text: "text-red-800", border: "border-red-200", dot: "bg-red-500" },
  { value: "orange", label: "Orange", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200", dot: "bg-orange-500" },
  { value: "amber", label: "Amber", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  { value: "yellow", label: "Yellow", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200", dot: "bg-yellow-500" },
  { value: "green", label: "Green", bg: "bg-green-100", text: "text-green-800", border: "border-green-200", dot: "bg-green-500" },
  { value: "emerald", label: "Emerald", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" },
  { value: "cyan", label: "Cyan", bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-200", dot: "bg-cyan-500" },
  { value: "blue", label: "Blue", bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" },
  { value: "indigo", label: "Indigo", bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200", dot: "bg-indigo-500" },
  { value: "purple", label: "Purple", bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200", dot: "bg-purple-500" },
  { value: "pink", label: "Pink", bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200", dot: "bg-pink-500" },
];

export default function SettingsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", color: "slate" });
  const [saving, setSaving] = useState(false);
  
  // Course management state
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showDeleteCourseConfirm, setShowDeleteCourseConfirm] = useState<number | null>(null);
  const [courseFormData, setCourseFormData] = useState({ name: "", price: "", description: "" });
  const [savingCourse, setSavingCourse] = useState(false);

  useEffect(() => {
    loadStages();
    loadCourses();
  }, []);

  const loadStages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tl/stages");
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
      const res = await fetch("/api/tl/stages", {
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
      const res = await fetch("/api/tl/stages", {
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
      const res = await fetch("/api/tl/stages", {
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

    setStages(reordered);

    try {
      await Promise.all([
        fetch("/api/tl/stages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: reordered[index].id, order: index + 1 })
        }),
        fetch("/api/tl/stages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: reordered[newIndex].id, order: newIndex + 1 })
        })
      ]);
    } catch (error) {
      toast.error("Failed to reorder stages");
      loadStages();
    }
  };

  const getColorClasses = (colorName: string) => {
    const colorOption = COLOR_OPTIONS.find(c => c.value === colorName);
    return colorOption || COLOR_OPTIONS[0];
  };

  // Course management functions
  const loadCourses = async () => {
    try {
      const res = await fetch("/api/tl/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      } else {
        toast.error("Failed to load courses");
      }
    } catch (error) {
      toast.error("Failed to load courses");
    }
  };

  const handleAddCourse = async () => {
    if (!courseFormData.name.trim()) {
      toast.error("Course name is required");
      return;
    }

    if (!courseFormData.price || parseFloat(courseFormData.price) <= 0) {
      toast.error("Valid price is required");
      return;
    }

    try {
      setSavingCourse(true);
      const res = await fetch("/api/tl/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: courseFormData.name,
          price: parseFloat(courseFormData.price),
          description: courseFormData.description
        })
      });

      if (res.ok) {
        toast.success("Course added successfully");
        setShowAddCourseModal(false);
        setCourseFormData({ name: "", price: "", description: "" });
        loadCourses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add course");
      }
    } catch (error) {
      toast.error("Failed to add course");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse || !courseFormData.name.trim()) {
      toast.error("Course name is required");
      return;
    }

    if (!courseFormData.price || parseFloat(courseFormData.price) <= 0) {
      toast.error("Valid price is required");
      return;
    }

    try {
      setSavingCourse(true);
      const res = await fetch("/api/tl/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCourse.id,
          name: courseFormData.name,
          price: parseFloat(courseFormData.price),
          description: courseFormData.description
        })
      });

      if (res.ok) {
        toast.success("Course updated successfully");
        setEditingCourse(null);
        setCourseFormData({ name: "", price: "", description: "" });
        loadCourses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update course");
      }
    } catch (error) {
      toast.error("Failed to update course");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (id: number) => {
    try {
      const res = await fetch("/api/tl/courses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        toast.success("Course deleted successfully");
        setShowDeleteCourseConfirm(null);
        loadCourses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete course");
      }
    } catch (error) {
      toast.error("Failed to delete course");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
              <p className="text-xs text-slate-500">Manage pipeline stages</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={loadStages}
              variant="outline"
              size="sm"
              className="border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-black shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Stage
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3 space-y-4">
            {/* Stages Section */}
            <div>
            <Card className="border-slate-200/60 shadow-sm">
              <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-600" />
                    <h2 className="text-sm font-semibold text-slate-900">Pipeline Stages</h2>
                    <Badge variant="outline" className="text-xs">{stages.length}</Badge>
                  </div>
                </div>
              </div>

              <CardContent className="p-4">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-primary border-r-transparent"></div>
                  </div>
                ) : stages.length === 0 ? (
                  <div className="text-center py-12">
                    <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No stages found</p>
                    <Button onClick={() => setShowAddModal(true)} size="sm" className="mt-3">
                      Add Stage
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {stages.map((stage, index) => {
                        const colorClasses = getColorClasses(stage.color);
                        return (
                          <motion.div
                            key={stage.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="group"
                          >
                            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200/60 hover:border-slate-300 bg-white hover:shadow-sm transition-all">
                              {/* Reorder buttons */}
                              <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => moveStage(stage.id, "up")}
                                  disabled={index === 0}
                                  className="text-slate-400 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveStage(stage.id, "down")}
                                  disabled={index === stages.length - 1}
                                  className="text-slate-400 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Order number */}
                              <div className="flex-shrink-0 w-7 h-7 bg-slate-100 rounded-md flex items-center justify-center">
                                <span className="text-xs font-bold text-slate-600">{index + 1}</span>
                              </div>

                              {/* Color dot */}
                              <div className={`w-2.5 h-2.5 rounded-full ${colorClasses.dot} flex-shrink-0`}></div>

                              {/* Stage name */}
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`}>
                                  {stage.name}
                                </span>
                                {stage.isDefault && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/30">
                                    Default
                                  </Badge>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingStage(stage);
                                    setFormData({ name: stage.name, color: stage.color });
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(stage.id)}
                                  disabled={stage.isDefault}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}

                {/* Compact Info */}
                {!loading && stages.length > 0 && (
                  <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex gap-2">
                      <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-700">
                        <p className="font-medium mb-1">Tips</p>
                        <p className="text-slate-600">Use arrows to reorder • Default stages can be edited • Renaming updates all leads automatically</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Courses Section */}
            <div>
              <Card className="border-slate-200/60 shadow-sm">
                <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">Course Catalog</h2>
                        <p className="text-xs text-slate-500">Manage courses and pricing</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{courses.length}</Badge>
                    </div>
                    <Button
                      onClick={() => setShowAddCourseModal(true)}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Course
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4">
                  {courses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <p className="text-sm text-slate-500">No courses found</p>
                      <Button onClick={() => setShowAddCourseModal(true)} size="sm" className="mt-3">
                        Add Course
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {courses.map((course) => (
                          <motion.div
                            key={course.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="group"
                          >
                            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200/60 hover:border-slate-300 bg-white hover:shadow-sm transition-all">
                              {/* Course icon */}
                              <div className="flex-shrink-0 w-7 h-7 bg-emerald-100 rounded-md flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>

                              {/* Course info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-900 truncate">
                                    {course.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                    ${(course.price / 100).toFixed(2)}
                                  </Badge>
                                </div>
                                {course.description && (
                                  <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {course.description}
                                  </p>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingCourse(course);
                                    setCourseFormData({ 
                                      name: course.name, 
                                      price: (course.price / 100).toString(), 
                                      description: course.description || "" 
                                    });
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setShowDeleteCourseConfirm(course.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Course Info */}
                  {courses.length > 0 && (
                    <div className="mt-4 p-3 bg-emerald-50/80 border border-emerald-200/60 rounded-lg">
                      <div className="flex gap-2">
                        <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-700">
                          <p className="font-medium mb-1">Course Management</p>
                          <p className="text-slate-600">Courses appear in dropdowns when leads reach "Customer" stage • Prices are stored in cents for accuracy</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Compact Sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <Card className="border-slate-200/60 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Overview</h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Total</span>
                    <span className="text-lg font-bold text-slate-900">{stages.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Default</span>
                    <span className="text-lg font-bold text-primary">{stages.filter(s => s.isDefault).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Custom</span>
                    <span className="text-lg font-bold text-emerald-600">{stages.filter(s => !s.isDefault).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Preview */}
            <Card className="border-slate-200/60 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Colors</h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_OPTIONS.slice(0, 12).map((color) => (
                    <div
                      key={color.value}
                      className={`w-full h-7 rounded ${color.bg} border ${color.border}`}
                      title={color.label}
                    ></div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center">
                  {COLOR_OPTIONS.length} colors available
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Compact Add Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => { 
        if (!open) { 
          setShowAddModal(false); 
          setFormData({ name: "", color: "slate" }); 
        } 
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-black" />
              </div>
              Add Stage
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Stage Name</label>
              <Input
                placeholder="e.g., Demo Scheduled"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Color</label>
              <div className="grid grid-cols-6 gap-1.5">
                {COLOR_OPTIONS.map((color) => {
                  const isSelected = formData.color === color.value;
                  return (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`relative p-2 rounded-lg border-2 transition-all ${
                        isSelected ? 'border-primary scale-105' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-full h-6 rounded ${color.bg}`}></div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {COLOR_OPTIONS.find(c => c.value === formData.color)?.label}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => {setShowAddModal(false); setFormData({ name: "", color: "slate" });}}>
              Cancel
            </Button>
            <Button onClick={handleAddStage} disabled={saving || !formData.name.trim()} className="bg-primary hover:bg-primary/90 text-black">
              {saving ? "Adding..." : "Add Stage"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compact Edit Modal */}
      <Dialog open={!!editingStage} onOpenChange={(open) => { 
        if (!open) { 
          setEditingStage(null); 
          setFormData({ name: "", color: "slate" }); 
        } 
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Edit className="w-4 h-4 text-white" />
              </div>
              Edit Stage
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Stage Name</label>
              <Input
                placeholder="Stage name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Color</label>
              <div className="grid grid-cols-6 gap-1.5">
                {COLOR_OPTIONS.map((color) => {
                  const isSelected = formData.color === color.value;
                  return (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`relative p-2 rounded-lg border-2 transition-all ${
                        isSelected ? 'border-emerald-500 scale-105' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-full h-6 rounded ${color.bg}`}></div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {COLOR_OPTIONS.find(c => c.value === formData.color)?.label}
              </p>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-lg">
              <p className="text-xs text-amber-900">
                <strong>Note:</strong> Renaming will update all existing leads automatically.
              </p>
            </div>

            {editingStage?.isDefault && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-xs text-slate-700">
                  <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
                  Default stage - can be edited but not deleted.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => {setEditingStage(null); setFormData({ name: "", color: "slate" });}}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStage} disabled={saving || !formData.name.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? "Updating..." : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compact Delete Modal */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => { if (!open) setShowDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Stage?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Are you sure? This action cannot be undone.
            </p>
            <div className="p-3 bg-red-50/80 border border-red-200/60 rounded-lg">
              <p className="text-xs text-red-900">
                Existing leads with this stage will keep it, but it won't appear in dropdowns.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button onClick={() => showDeleteConfirm && handleDeleteStage(showDeleteConfirm)} variant="destructive">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Add Modal */}
      <Dialog open={showAddCourseModal} onOpenChange={(open) => { 
        if (!open) { 
          setShowAddCourseModal(false); 
          setCourseFormData({ name: "", price: "", description: "" }); 
        } 
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              Add Course
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Course Name</label>
              <Input
                placeholder="e.g., Digital Marketing Mastery"
                value={courseFormData.name}
                onChange={(e) => setCourseFormData({ ...courseFormData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Price ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="99.99"
                value={courseFormData.price}
                onChange={(e) => setCourseFormData({ ...courseFormData, price: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Description (Optional)</label>
              <textarea
                placeholder="Course description..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                rows={3}
                value={courseFormData.description}
                onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => {setShowAddCourseModal(false); setCourseFormData({ name: "", price: "", description: "" });}}>
              Cancel
            </Button>
            <Button onClick={handleAddCourse} disabled={savingCourse || !courseFormData.name.trim() || !courseFormData.price} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {savingCourse ? "Adding..." : "Add Course"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Edit Modal */}
      <Dialog open={!!editingCourse} onOpenChange={(open) => { 
        if (!open) { 
          setEditingCourse(null); 
          setCourseFormData({ name: "", price: "", description: "" }); 
        } 
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Edit className="w-4 h-4 text-white" />
              </div>
              Edit Course
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Course Name</label>
              <Input
                placeholder="Course name"
                value={courseFormData.name}
                onChange={(e) => setCourseFormData({ ...courseFormData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Price ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="99.99"
                value={courseFormData.price}
                onChange={(e) => setCourseFormData({ ...courseFormData, price: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Description (Optional)</label>
              <textarea
                placeholder="Course description..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                rows={3}
                value={courseFormData.description}
                onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => {setEditingCourse(null); setCourseFormData({ name: "", price: "", description: "" });}}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCourse} disabled={savingCourse || !courseFormData.name.trim() || !courseFormData.price} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {savingCourse ? "Updating..." : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Delete Modal */}
      <Dialog open={!!showDeleteCourseConfirm} onOpenChange={(open) => { if (!open) setShowDeleteCourseConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Course?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Are you sure? This action cannot be undone.
            </p>
            <div className="p-3 bg-red-50/80 border border-red-200/60 rounded-lg">
              <p className="text-xs text-red-900">
                Existing leads with this course will keep it, but it won't appear in dropdowns.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setShowDeleteCourseConfirm(null)}>Cancel</Button>
            <Button onClick={() => showDeleteCourseConfirm && handleDeleteCourse(showDeleteCourseConfirm)} variant="destructive">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
