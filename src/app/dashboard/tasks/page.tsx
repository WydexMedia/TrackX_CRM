"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { 
  Clock, 
  Users, 
  UserPlus, 
  ArrowLeft, 
  Calendar,
  CheckCircle2,
  ListTodo
} from "lucide-react";

function getUser() {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

type Lead = { phone: string; name?: string | null; source?: string | null; stage?: string | null };
type TaskRow = { id: number; leadPhone: string; title: string; status: string; type?: string | null; dueAt?: string | null; priority?: string | null; ownerId?: string | null };

export default function TasksPage() {
  const [user, setUser] = useState<any>(null);
  const [dueCalls, setDueCalls] = useState<Array<{ task: TaskRow; lead: Lead }>>([]);
  const [followUps, setFollowUps] = useState<Array<{ task: TaskRow; lead: Lead }>>([]);
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [specialTasks, setSpecialTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      window.location.href = "/login";
      return;
    }
    setUser(u);
  }, []);

  const ownerId = user?.code || "";
  const ownerName = user?.name || "";

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    const qs = `ownerId=${encodeURIComponent(ownerId)}&ownerName=${encodeURIComponent(ownerName)}`;
    const [a, b, c] = await Promise.all([
      fetch(`/api/tasks/due-calls?${qs}`).then((r) => r.json()),
      fetch(`/api/tasks/today?${qs}`).then((r) => r.json()),
      fetch(`/api/tl/tasks?ownerId=${encodeURIComponent(ownerId)}`).then((r) => r.json()),
    ]);
    setDueCalls(a.rows || []);
    setFollowUps(b.followUps || []);
    
    // Filter special tasks for the current user
    const userSpecialTasks = (c.rows || []).filter((task: any) => 
      task.ownerId === ownerId && task.type === "OTHER" && task.status === "OPEN"
    );
    setSpecialTasks(userSpecialTasks);
    
    let leadsList = b.newLeads || [];
    if ((!Array.isArray(leadsList) || leadsList.length === 0) && ownerId) {
      try {
        const tl = await fetch(`/api/tl/leads?owner=${encodeURIComponent(ownerId)}&limit=200`).then((r) => r.json());
        if (Array.isArray(tl.rows) && tl.rows.length > 0) leadsList = tl.rows;
      } catch {}
    }
    setNewLeads(leadsList);
    setLoading(false);
  }, [ownerId, ownerName]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const SectionHeader = ({ icon: Icon, title, count, color = "blue" }: { icon: any; title: string; count: number; color?: "blue" | "amber" | "emerald" }) => {
    const colorClasses: Record<"blue" | "amber" | "emerald", string> = {
      blue: "from-blue-500 to-indigo-600",
      amber: "from-amber-500 to-orange-600",
      emerald: "from-emerald-500 to-teal-600"
    };

    return (
      <div className="flex items-center justify-between mb-6">
        <div className={`w-8 h-8 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center text-white`}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{count} items</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Tasks Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Welcome back, {ownerName}</p>
          </div>
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </a>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Special Tasks</p>
                <p className="text-3xl font-bold text-blue-600">{specialTasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ListTodo size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Due Calls</p>
                <p className="text-3xl font-bold text-red-600">{dueCalls.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Clock size={24} className="text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Follow-ups</p>
                <p className="text-3xl font-bold text-amber-600">{followUps.length}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users size={24} className="text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Leads</p>
                <p className="text-3xl font-bold text-emerald-600">{newLeads.length}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <UserPlus size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Special Tasks Section */}
        <section className="mb-8">
          <SectionHeader icon={ListTodo} title="Special Tasks" count={specialTasks.length} color="blue" />
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                <CheckCircle2 size={20} className="text-blue-600 mr-2" />
                Special Tasks
              </h4>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading special tasks...</p>
                </div>
              ) : specialTasks.length === 0 ? (
                <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-600">
                  No special tasks assigned yet.
                </div>
              ) : (
                specialTasks.map((task) => (
                  <div key={task.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-blue-900">{task.title}</h5>
                          {task.priority && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              task.priority === "HIGH" ? "bg-red-100 text-red-800" :
                              task.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-800" :
                              "bg-green-100 text-green-800"
                            }`}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        {task.dueAt && (
                          <p className="text-sm text-blue-700">
                            Due: {new Date(task.dueAt).toLocaleDateString()}
                          </p>
                        )}
                        {task.leadPhone && task.leadPhone !== "SPECIAL_TASK" && (
                          <p className="text-sm text-blue-600">
                            Related to: {task.leadPhone}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // Mark task as completed
                            fetch("/api/tl/tasks", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: task.id, status: "DONE" })
                            }).then(() => {
                              toast.success("Task completed!");
                              load(); // Refresh tasks
                            }).catch(() => {
                              toast.error("Failed to complete task");
                            });
                          }}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Due Calls Section */}
        <section className="mb-8">
          <SectionHeader icon={Clock} title="Due Calls (Yesterday)" count={dueCalls.length} color="blue" />
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Loading due calls...</p>
              </div>
            ) : dueCalls.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No due calls</p>
                <p className="text-sm text-gray-400">Great job staying on top of your tasks!</p>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                Due calls functionality will be implemented here
              </div>
            )}
          </div>
        </section>

        {/* Follow-ups Section */}
        <section className="mb-8">
          <SectionHeader icon={Calendar} title="Today's Follow-ups" count={followUps.length} color="amber" />
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Loading follow-ups...</p>
              </div>
            ) : followUps.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No follow-ups scheduled</p>
                <p className="text-sm text-gray-400">Check back later for new tasks</p>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                Follow-ups functionality will be implemented here
              </div>
            )}
          </div>
        </section>

        {/* New Leads Section */}
        <section className="mb-8">
          <SectionHeader icon={UserPlus} title="New Leads" count={newLeads.length} color="emerald" />
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="animate-spin w-6 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Loading new leads...</p>
              </div>
            ) : newLeads.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <UserPlus size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No new leads</p>
                <p className="text-sm text-gray-400">New opportunities will appear here</p>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                New leads functionality will be implemented here
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
