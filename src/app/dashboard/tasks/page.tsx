"use client";

import { useState, useEffect, useCallback } from "react";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { 
  Phone, 
  PhoneOff, 
  Clock, 
  Users, 
  UserPlus, 
  ArrowLeft, 
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Star,
  MoreVertical
} from "lucide-react";

function getUser() {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

type Lead = { phone: string; name?: string | null; source?: string | null; stage?: string | null };
type TaskRow = { id: number; leadPhone: string; title: string; status: string; type?: string | null; dueAt?: string | null };

function useCallTimer() {
  const [isCalling, setIsCalling] = useState(false);
  const [callLogId, setCallLogId] = useState<number | null>(null);
  const [leadPhone, setLeadPhone] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const start = useCallback(async (leadPhoneIn: string, phoneIn: string, salespersonId?: string) => {
    const res = await fetch("/api/calls/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadPhone: leadPhoneIn, phone: phoneIn, salespersonId }) });
    const data = await res.json();
    setCallLogId(data.callLogId);
    setLeadPhone(leadPhoneIn);
    setPhone(phoneIn);
    setStartedAt(Date.now());
    setIsCalling(true);
  }, []);

  const endNow = useCallback(async () => {
    if (!isCalling) return;
    try {
      if (callLogId) {
        await fetch("/api/calls/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callLogId }) });
      }
    } finally {
      setIsCalling(false);
    }
  }, [isCalling, callLogId]);

  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState === "visible" && isCalling) {
        endNow();
      }
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [isCalling, endNow]);

  return { isCalling, callLogId, start, endNow, leadPhone, phone, startedAt };
}

// Lead Detail Modal Component
function LeadDetailModal({ lead, onClose, onRefresh }: { lead: any; onClose: () => void; onRefresh: () => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [selectedStage, setSelectedStage] = useState(lead?.stage || "NEW");
  const [updatingStage, setUpdatingStage] = useState(false);

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`);
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
          setNotes(data.events?.filter((event: any) => event.type === "NOTE_ADDED") || []);
          setSelectedStage(lead?.stage || "NEW");
        }
      } catch (error) {
        console.error("Failed to fetch lead data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (lead) {
      fetchLeadData();
    }
  }, [lead?.phone, lead?.stage]);

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      NEW: "bg-blue-100 text-blue-800 border-blue-200",
      INTERESTED: "bg-green-100 text-green-800 border-green-200",
      QUALIFIED: "bg-emerald-100 text-emerald-800 border-emerald-200",
      PROSPECT: "bg-purple-100 text-purple-800 border-purple-200",
      PAYMENT_INITIAL: "bg-yellow-100 text-yellow-800 border-yellow-200",
      PAYMENT_DONE: "bg-orange-100 text-orange-800 border-orange-200",
      SALES_CLOSED: "bg-indigo-100 text-indigo-800 border-indigo-200",
      CUSTOMER: "bg-green-100 text-green-800 border-green-200",
      CONVERTED: "bg-green-100 text-green-800 border-green-200",
      FOLLOW_UP: "bg-amber-100 text-amber-800 border-amber-200",
      DNP: "bg-red-100 text-red-800 border-red-200",
      DNC: "bg-red-100 text-red-800 border-red-200",
      NIFC: "bg-gray-100 text-gray-800 border-gray-200",
      DISQUALIFIED: "bg-red-100 text-red-800 border-red-200",
      NOT_INTERESTED: "bg-red-100 text-red-800 border-red-200",
      SEND_WHATSAPP: "bg-green-100 text-green-800 border-green-200",
      NOT_CONTACTED: "bg-gray-100 text-gray-800 border-gray-200",
      CALLBACK: "bg-blue-100 text-blue-800 border-blue-200"
    };
    return colors[stage] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const handleStageUpdate = async () => {
    if (selectedStage === lead?.stage) {
      toast.success("Stage is already set to this value.");
      return;
    }
    
    const previousStage = lead?.stage;
    
    try {
      setUpdatingStage(true);
      const res = await fetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: selectedStage })
      });
      
      if (res.ok) {
        // Update the lead object locally
        lead.stage = selectedStage;
        // Refresh the data
        const dataRes = await fetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`);
        if (dataRes.ok) {
          const data = await dataRes.json();
          setTasks(data.tasks || []);
          setNotes(data.events?.filter((event: any) => event.type === "NOTE_ADDED") || []);
        }
        // Refresh the parent dashboard
        onRefresh();
        toast.success(`Stage updated from ${previousStage} to ${selectedStage}!`);
      } else {
        toast.error("Failed to update stage.");
      }
    } catch (error) {
      console.error("Failed to update stage:", error);
      toast.error("Failed to update stage.");
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      setAddingNote(true);
      const res = await fetch("/api/tl/leads/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: lead.phone, note: newNote.trim() })
      });
      
      if (res.ok) {
        setNewNote("");
        // Refresh notes
        const dataRes = await fetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`);
        if (dataRes.ok) {
          const data = await dataRes.json();
          setNotes(data.events?.filter((event: any) => event.type === "NOTE_ADDED") || []);
        }
        // Refresh the parent dashboard
        onRefresh();
        toast.success("Note added successfully!");
      } else {
        toast.error("Failed to add note.");
      }
    } catch (error) {
      console.error("Failed to add note:", error);
      toast.error("Failed to add note.");
    } finally {
      setAddingNote(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                {(lead?.name || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white">{lead?.name || "Unknown Lead"}</h3>
                <p className="text-blue-100 text-sm">{lead?.phone}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lead Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Info */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <UserPlus size={20} className="text-blue-600" />
                    Lead Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                      <p className="text-gray-900 font-medium">{lead?.name || "—"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                      <p className="text-gray-900 font-medium">{lead?.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                      <p className="text-gray-900 font-medium">{lead?.email || "—"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Source</label>
                      <p className="text-gray-900 font-medium">{lead?.source || "—"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Stage</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedStage}
                          onChange={(e) => setSelectedStage(e.target.value)}
                          disabled={updatingStage}
                          className={`px-3 py-1 rounded-lg text-sm font-medium border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getStageColor(selectedStage)} ${updatingStage ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="NEW">🆕 NEW</option>
                          <option value="INTERESTED">😊 INTERESTED</option>
                          <option value="QUALIFIED">⭐ QUALIFIED</option>
                          <option value="PROSPECT">🔍 PROSPECT</option>
                          <option value="PAYMENT_INITIAL">💰 PAYMENT_INITIAL</option>
                          <option value="PAYMENT_DONE">💳 PAYMENT_DONE</option>
                          <option value="SALES_CLOSED">🎯 SALES_CLOSED</option>
                          <option value="CUSTOMER">👤 CUSTOMER</option>
                          <option value="CONVERTED">✅ CONVERTED</option>
                          <option value="FOLLOW_UP">📅 FOLLOW_UP</option>
                          <option value="DNP">🚫 DNP</option>
                          <option value="DNC">📞 DNC</option>
                          <option value="NIFC">📋 NIFC</option>
                          <option value="DISQUALIFIED">❌ DISQUALIFIED</option>
                          <option value="NOT_INTERESTED">❌ NOT_INTERESTED</option>
                          <option value="SEND_WHATSAPP">💬 SEND_WHATSAPP</option>
                          <option value="NOT_CONTACTED">📱 NOT_CONTACTED</option>
                          <option value="CALLBACK">📞 CALLBACK</option>
                        </select>
                        <button
                          onClick={handleStageUpdate}
                          disabled={updatingStage || selectedStage === lead?.stage}
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {updatingStage ? "Updating..." : "Update"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Score</label>
                      <p className="text-gray-900 font-medium">{lead?.score || 0}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Created</label>
                      <p className="text-gray-900 font-medium">{lead?.createdAt ? formatDate(lead.createdAt) : "—"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Last Activity</label>
                      <p className="text-gray-900 font-medium">{lead?.lastActivityAt ? formatDate(lead.lastActivityAt) : "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-blue-600" />
                    Tasks
                  </h4>
                  {tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No tasks assigned</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-3">
                          <p className="text-sm font-medium text-gray-900">{task.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status}
                            </span>
                            {task.dueAt && (
                              <span className="text-xs text-gray-500">
                                Due: {formatDate(task.dueAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageCircle size={20} className="text-blue-600" />
                    Notes
                  </h4>
                  
                  {/* Add New Note */}
                  <div className="mb-6">
                    <div className="flex gap-2">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a note about this lead..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || addingNote}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
                      >
                        {addingNote ? "Adding..." : "Add Note"}
                      </button>
                    </div>
                  </div>

                  {/* Display Notes */}
                  {notes.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No notes added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notes.slice().reverse().map((note, index) => (
                        <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">{note.data?.note}</p>
                              {note.at && (
                                <p className="text-xs text-gray-500 mt-2">{formatDate(note.at)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MoreVertical size={20} className="text-blue-600" />
                    Quick Actions
                  </h4>
                  <div className="space-y-3">
                    <button className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      <Phone size={16} />
                      Call Lead
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                      <MessageCircle size={16} />
                      Send WhatsApp
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                      <Calendar size={16} />
                      Schedule Follow-up
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [user, setUser] = useState<any>(null);
  const [dueCalls, setDueCalls] = useState<Array<{ task: TaskRow; lead: Lead }>>([]);
  const [followUps, setFollowUps] = useState<Array<{ task: TaskRow; lead: Lead }>>([]);
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOutcome, setShowOutcome] = useState(false);
  const [outcomeFor, setOutcomeFor] = useState<{ callLogId: number; durationMs: number } | null>(null);
  const [hasShownOutcome, setHasShownOutcome] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [leadDetailLoading, setLeadDetailLoading] = useState(false);

  const { isCalling, callLogId, start, endNow, leadPhone, phone, startedAt } = useCallTimer();

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
    const [a, b] = await Promise.all([
      fetch(`/api/tasks/due-calls?${qs}`).then((r) => r.json()),
      fetch(`/api/tasks/today?${qs}`).then((r) => r.json()),
    ]);
    setDueCalls(a.rows || []);
    setFollowUps(b.followUps || []);
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

  useEffect(() => {
    if (!isCalling && startedAt != null && !showOutcome && !hasShownOutcome) {
      const elapsed = Date.now() - startedAt;
      setOutcomeFor({ callLogId: callLogId ?? 0, durationMs: elapsed });
      setShowOutcome(true);
      setHasShownOutcome(true);
    }
  }, [isCalling, callLogId, startedAt, showOutcome, hasShownOutcome]);

  // Reset the one-time outcome guard on new call start
  useEffect(() => {
    if (isCalling) setHasShownOutcome(false);
  }, [isCalling]);

  const submitOutcome = useCallback(async (payload: any) => {
    if (!outcomeFor) return;
    const res = await fetch("/api/calls/outcome", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callLogId: outcomeFor.callLogId, leadPhone: leadPhone, phone: phone, ...payload }) });
    const data = await res.json();
    setShowOutcome(false);
    setOutcomeFor(null);
    if (data.redirect) window.location.href = data.redirect;
    else load();
  }, [outcomeFor, load, leadPhone, phone]);

  // Open outcome dialog directly from the menu without placing a real call
  const openOutcomeManually = useCallback(async (leadPhoneIn: string, phoneIn: string) => {
    try {
      await start(leadPhoneIn, phoneIn, ownerId);
      await new Promise((r) => setTimeout(r, 50));
      await endNow();
      const id = callLogId || null;
      setOutcomeFor({ callLogId: id as any, durationMs: 0 });
      setShowOutcome(true);
    } catch (_) {
      // ignore
    }
  }, [ownerId, start, endNow, callLogId]);

  // Fetch lead details when lead name is clicked
  const openLeadDetail = useCallback(async (leadPhone: string) => {
    try {
      setLeadDetailLoading(true);
      const res = await fetch(`/api/tl/leads/${encodeURIComponent(leadPhone)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLead(data.lead);
        setShowLeadDetail(true);
      } else {
        console.error("Failed to fetch lead details");
      }
    } catch (error) {
      console.error("Error fetching lead details:", error);
    } finally {
      setLeadDetailLoading(false);
    }
  }, []);

  if (!user) return null;

  const CallButton = ({ lead, task }: { lead?: Lead; task?: TaskRow }) => {
    const phoneNumber = lead?.phone || task?.leadPhone || "";
    return (
      <div className="flex items-center gap-2">
        <a 
          href={`tel:${phoneNumber}`} 
          onClick={() => start(task?.leadPhone || phoneNumber, phoneNumber, user.code)} 
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Phone size={16} />
          Call
        </a>
      </div>
    );
  };

  const LeadCard = ({ lead, task, showPriority = false }: { lead?: Lead; task?: TaskRow; showPriority?: boolean }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const phoneNumber = lead?.phone || task?.leadPhone || "";
    const toggleMenu = () => setMenuOpen((v) => !v);
    const closeMenu = () => setMenuOpen(false);
    return (
      <div className="group relative bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-lg">
        <div className="flex items-center justify-between p-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                {(lead?.name || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <div 
                  className="font-semibold text-gray-900 flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => openLeadDetail(phoneNumber)}
                  title="Click to view lead details"
                >
                  {lead?.name || "Unknown"}
                  {showPriority && <Star size={14} className="text-amber-500 fill-current" />}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={12} />
                  {phoneNumber}
                </div>
                {lead?.stage && (
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {lead.stage}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {lead?.source && (
              <div className="flex items-center gap-2 text-xs text-gray-500 ml-13">
                <MapPin size={12} />
                {lead.source}
              </div>
            )}
          </div>
          <div className="relative flex items-center gap-3">
            <CallButton lead={lead} task={task} />
            <button onClick={toggleMenu} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-10 w-44 bg-white border border-gray-200 rounded-lg shadow-xl py-1">
                <button
                  onClick={() => { closeMenu(); openOutcomeManually(task?.leadPhone || phoneNumber, phoneNumber); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <MessageCircle size={14} />
                  Log Call
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ icon: Icon, title, count, color = "blue" }: { icon: any; title: string; count: number; color?: "blue" | "amber" | "emerald" }) => {
    const colorClasses: Record<"blue" | "amber" | "emerald", string> = {
      blue: "from-blue-500 to-indigo-600",
      amber: "from-amber-500 to-orange-600",
      emerald: "from-emerald-500 to-teal-600"
    };

    return (
      <div className="flex items-center gap-3 mb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              dueCalls.map(({ task, lead }) => (
                <LeadCard key={task.id} lead={lead} task={task} showPriority={true} />
              ))
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
              followUps.map(({ task, lead }) => (
                <LeadCard key={task.id} lead={lead} task={task} />
              ))
            )}
          </div>
        </section>

        {/* New Leads Section */}
        <section className="mb-8">
          <SectionHeader icon={UserPlus} title="New Leads" count={newLeads.length} color="emerald" />
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Loading new leads...</p>
              </div>
            ) : newLeads.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <UserPlus size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No new leads</p>
                <p className="text-sm text-gray-400">New opportunities will appear here</p>
              </div>
            ) : (
              newLeads.map((lead) => (
                <LeadCard key={lead.phone} lead={lead} />
              ))
            )}
          </div>
        </section>

        {/* Outcome Dialog */}
        {showOutcome && outcomeFor && (
          <OutcomeDialog
            durationMs={outcomeFor.durationMs}
            leadPhone={leadPhone || ""}
            phone={phone || ""}
            onClose={() => setShowOutcome(false)}
            onSubmit={submitOutcome}
          />
        )}

        {/* Lead Detail Modal */}
        {showLeadDetail && selectedLead && (
          <LeadDetailModal
            lead={selectedLead}
            onClose={() => {
              setShowLeadDetail(false);
              setSelectedLead(null);
            }}
            onRefresh={load}
          />
        )}
      </div>
    </div>
  );
}

function OutcomeDialog({ durationMs, leadPhone, phone, onClose, onSubmit }: { durationMs: number; leadPhone: string; phone: string; onClose: () => void; onSubmit: (payload: any) => void }) {
  const [completed, setCompleted] = useState<boolean | null>(true);
  const [qualified, setQualified] = useState<boolean | null>(true);
  const [status, setStatus] = useState<string>("NEED_FOLLOW_UP");
  const [notes, setNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState<string>("");
  const [product, setProduct] = useState<string>("");

  const band = useMemo(() => {
    if (durationMs < 5 * 60_000) return { 
      label: "< 5 min", 
      cls: "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300",
      icon: <Clock size={14} />
    };
    if (durationMs < 10 * 60_000) return { 
      label: "< 10 min", 
      cls: "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300",
      icon: <Clock size={14} />
    };
    return { 
      label: "≥ 10 min", 
      cls: "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300",
      icon: <CheckCircle2 size={14} />
    };
  }, [durationMs]);

  const submit = useCallback(() => {
    const payload: any = { completed, qualified, status, notes };
    if (status === "NEED_FOLLOW_UP" && followUpAt) payload.followUp = { dueAt: followUpAt, product, name: "" };
    onSubmit(payload);
  }, [completed, qualified, status, notes, followUpAt, product, onSubmit]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Phone className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Call Outcome</h3>
                <p className="text-blue-100 text-sm">Record the results of your call</p>
              </div>
            </div>
            <div className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full ${band.cls}`}>
              {band.icon}
              {band.label}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-gray-50  text-black rounded-lg p-4 mb-6 flex items-center gap-3">
            <Phone size={16} className="text-gray-600" />
            <div className="text-sm">
              <span className="font-medium text-black">Lead:</span> {leadPhone} • 
              <span className="font-medium text-black ml-2">Phone:</span> {phone}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">Did the call complete?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer">
                  <input 
                    type="radio" 
                    checked={completed === true} 
                    onChange={() => setCompleted(true)}
                    className="w-4  h-4 text-green-600"
                  />
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span className="text-blue-600 font-medium">Yes</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer">
                  <input 
                    type="radio" 
                    checked={completed === false} 
                    onChange={() => setCompleted(false)}
                    className="w-4 h-4 text-red-600"
                  />
                  <div className="flex items-center gap-2">
                    <XCircle size={16} className="text-red-600" />
                    <span className="text-red-600 font-medium">No</span>
                  </div>
                </label>
              </div>
            </div>

            {completed && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">Is the lead qualified?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer">
                    <input 
                      type="radio" 
                      checked={qualified === true} 
                      onChange={() => setQualified(true)}
                      className="w-4 h-4 text-green-600"
                    />
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-600" />
                      <span className="text-green-600 font-medium">Yes</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer">
                    <input 
                      type="radio" 
                      checked={qualified === false} 
                      onChange={() => setQualified(false)}
                      className="w-4 h-4 text-red-600"
                    />
                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="text-red-600" />
                      <span className="text-red-600 font-medium">No</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {completed && qualified && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">Current Status</label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)} 
                  className="w-full text-blue-600 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="CONVERTED">✅ Converted</option>
                  <option value="DNP">🚫 DNP (Do Not Pickup)</option>
                  <option value="DNC">📞 DNC (Do Not Call)</option>
                  <option value="ASKED_TO_CALL_BACK">📞 Asked to Call Back</option>
                  <option value="INTERESTED">😊 Interested</option>
                  <option value="QUALIFIED">⭐ Qualified</option>
                  <option value="NIFC">📋 NIFC (Not Interested in Further Contact)</option>
                  <option value="DISQUALIFIED">❌ Disqualified</option>
                  <option value="PROSPECT">🔍 Prospect</option>
                  <option value="PAYMENT_INITIAL">💰 Payment Initial</option>
                  <option value="PAYMENT_DONE">💳 Payment Done</option>
                  <option value="SALES_CLOSED">🎯 Sales Closed</option>
                  <option value="CUSTOMER">👤 Customer</option>
                  <option value="NOT_CONTACTED">📱 Not Contacted</option>
                  <option value="SEND_WHATSAPP">💬 Send in WhatsApp</option>
                  <option value="NOT_INTERESTED">❌ Not interested</option>
                  <option value="NEED_FOLLOW_UP">📅 Need follow-up</option>
                </select>
              </div>
            )}

            {(!completed || (completed && !qualified)) && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">Remark</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  className="w-full text-blue-600 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  rows={4}
                  placeholder="Add your notes here..."
                />
              </div>
            )}

            {completed && qualified && status === "NEED_FOLLOW_UP" && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Calendar size={16} />
                  Follow-up Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product enquired</label>
                    <input 
                      value={product} 
                      onChange={(e) => setProduct(e.target.value)} 
                      className="w-full text-blue-600 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Resin Kit"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up at</label>
                    <input 
                      type="datetime-local" 
                      value={followUpAt} 
                      onChange={(e) => setFollowUpAt(e.target.value)} 
                      className="w-full text-blue-600 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    className="w-full text-blue-600 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    rows={3}
                    placeholder="Add follow-up notes..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <button 
              onClick={onClose} 
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={submit} 
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Save Outcome
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}