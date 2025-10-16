"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { authenticatedFetch } from "@/lib/tokenValidation";
import { 
  Target, 
  BarChart3, 
  RefreshCw, 
  FileText, 
  Phone, 
  TrendingUp, 
  Clock,
  User,
  Phone as PhoneIcon,
  FileText as FileTextIcon,
  CheckCircle,
  XCircle,
  Clock as ClockIcon
} from "lucide-react";

interface Lead {
  phone: string;
  name: string | null;
  email: string | null;
  address: string | null;
  alternateNumber: string | null;
  source: string | null;
  stage: string;
  ownerId: string | null;
  score: number | null;
  courseId: number | null;
  paidAmount: number | null;
  createdAt: string | null;
}

export default function LeadDetailPage() {
  const routeParams = useParams<{ phone: string }>();
  const phone = decodeURIComponent(String(routeParams.phone));
  const [lead, setLead] = useState<Lead | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [salesByCode, setSalesByCode] = useState<Record<string, { name: string; code: string }>>({});
  const [assignee, setAssignee] = useState<string>("");

  const [assigning, setAssigning] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [stageChangeNotes, setStageChangeNotes] = useState<string>("");
  const [stageNotesError, setStageNotesError] = useState<string>("");
  const [updatingStage, setUpdatingStage] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("");
  const [callNotes, setCallNotes] = useState<string>("");
  const [loggingCall, setLoggingCall] = useState(false);
  const [stages, setStages] = useState<Array<{ id: number; name: string; color: string }>>([]);
  const [courses, setCourses] = useState<Array<{ id: number; name: string; price: number; description: string | null }>>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [leadCourse, setLeadCourse] = useState<{ id: number; name: string; price: number; description: string | null } | null>(null);

  // Edit fields state
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState<string>("");
  const [savingName, setSavingName] = useState(false);
  
  const [editingEmail, setEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState<string>("");
  const [savingEmail, setSavingEmail] = useState(false);
  
  const [editingAddress, setEditingAddress] = useState(false);
  const [editedAddress, setEditedAddress] = useState<string>("");
  const [savingAddress, setSavingAddress] = useState(false);
  
  const [editingAlternateNumber, setEditingAlternateNumber] = useState(false);
  const [editedAlternateNumber, setEditedAlternateNumber] = useState<string>("");
  const [savingAlternateNumber, setSavingAlternateNumber] = useState(false);

  // Delete confirm modal state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Function to fetch user names from API
  const fetchUserNames = async () => {
    try {
      const response = await authenticatedFetch("/api/tl/users");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.users) {
          const nameMap = new Map<string, string>();
          Object.entries(data.users).forEach(([code, name]) => {
            nameMap.set(code, name as string);
          });
          setUserNames(nameMap);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user names:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Function to get current user from localStorage
  const getCurrentUser = () => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  // Function to resolve actor ID to user name
  const resolveActorName = (actorId: string) => {
    return userNames.get(actorId) || actorId;
  };

  // Function to handle lead reassignment
  const handleReassign = async () => {
    if (!selectedOwner || selectedOwner === lead?.ownerId) {
      toast.error("Please select a different owner");
      return;
    }
    
    try {
      setReassigning(true);
      const toastId = toast.loading("Reassigning lead...");
      
      const currentUser = getCurrentUser();
      const actorId = currentUser?.code || "system";
      
      const res = await authenticatedFetch(`/api/tl/leads/${encodeURIComponent(lead?.phone || '')}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ownerId: selectedOwner,
          actorId: actorId 
        })
      });
      
      if (res.ok) {
        // Update local state
        if (lead) lead.ownerId = selectedOwner;
        
        // Refresh data
        const d = await authenticatedFetch(`/api/tl/leads/${encodeURIComponent(phone)}`).then((r) => r.json());
        setLead(d.lead || null);
        setEvents(d.events || []);
        setTasks(d.tasks || []);
        
        toast.success("Lead reassigned successfully", { id: toastId });
        setSelectedOwner("");
      } else {
        toast.error("Failed to reassign lead", { id: toastId });
      }
    } catch (error) {
      console.error("Failed to reassign lead:", error);
      toast.error("Failed to reassign lead");
    } finally {
      setReassigning(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    authenticatedFetch(`/api/tl/leads/${encodeURIComponent(phone)}`)
      .then((r) => r.json())
      .then((d) => { 
        setLead(d.lead || null); 
        setEvents(d.events || []); 
        setTasks(d.tasks || []); 
        // Set course information if available
        setLeadCourse(d.course || null);
      })
      .finally(() => setLoading(false));
    
    // Fetch user names for actor resolution
    fetchUserNames();

    // Load stages
    authenticatedFetch("/api/tl/stages")
      .then((r) => r.json())
      .then((d) => {
        const stages = d?.stages || [];
        console.log('Loaded stages:', stages.map((s: any) => s.name));
        setStages(stages);
      })
      .catch(() => {});

    // Load courses
    authenticatedFetch("/api/tl/courses")
      .then((r) => r.json())
      .then((d) => setCourses(d?.courses || []))
      .catch(() => {});
  }, [phone]);

  useEffect(() => {
    authenticatedFetch("/api/users")
      .then((r) => r.json())
      .then((all) => {
        const onlySales = (Array.isArray(all) ? all : []).filter((u: any) => (u.role ?? 'sales') === "sales");
        const map: Record<string, { name: string; code: string }> = {};
        for (const u of onlySales) map[u.code] = { name: u.name, code: u.code };
        setSalesByCode(map);
        setAssignee((prev) => prev || (lead?.ownerId || ""));
      })
      .catch(() => {});
  }, [lead?.ownerId]);

  // Monitor events state changes
  useEffect(() => {
    console.log('Events state changed - new count:', events.length);
    console.log('Events types in state:', events.map(e => e.type));
  }, [events]);

  // Function to save edited name
  const saveEditedName = async () => {
    if (!lead || !editedName.trim()) return;
    
    try {
      setSavingName(true);
      const toastId = toast.loading("Saving name...");
      
      const currentUser = getCurrentUser();
      const actorId = currentUser?.code || "system";
      
      const res = await authenticatedFetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: editedName.trim(),
          actorId: actorId 
        })
      });
      
      if (res.ok) {
        // Update local state
        setLead(prev => prev ? { ...prev, name: editedName.trim() } : null);
        setEditingName(false);
        toast.success("Name updated successfully", { id: toastId });
      } else {
        toast.error("Failed to update name", { id: toastId });
      }
    } catch (error) {
      console.error("Failed to update name:", error);
      toast.error("Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  // Function to save edited email
  const saveEditedEmail = async () => {
    if (!lead) return;
    
    try {
      setSavingEmail(true);
      const toastId = toast.loading("Saving email...");
      
      const currentUser = getCurrentUser();
      const actorId = currentUser?.code || "system";
      
      const res = await authenticatedFetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: editedEmail.trim() || null,
          actorId: actorId 
        })
      });
      
      if (res.ok) {
        setLead(prev => prev ? { ...prev, email: editedEmail.trim() || null } : null);
        setEditingEmail(false);
        toast.success("Email updated successfully", { id: toastId });
      } else {
        toast.error("Failed to update email", { id: toastId });
      }
    } catch (error) {
      console.error("Failed to update email:", error);
      toast.error("Failed to update email");
    } finally {
      setSavingEmail(false);
    }
  };

  // Function to save edited address
  const saveEditedAddress = async () => {
    if (!lead) return;
    
    try {
      setSavingAddress(true);
      const toastId = toast.loading("Saving address...");
      
      const currentUser = getCurrentUser();
      const actorId = currentUser?.code || "system";
      
      const res = await authenticatedFetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          address: editedAddress.trim() || null,
          actorId: actorId 
        })
      });
      
      if (res.ok) {
        setLead(prev => prev ? { ...prev, address: editedAddress.trim() || null } : null);
        setEditingAddress(false);
        toast.success("Address updated successfully", { id: toastId });
      } else {
        toast.error("Failed to update address", { id: toastId });
      }
    } catch (error) {
      console.error("Failed to update address:", error);
      toast.error("Failed to update address");
    } finally {
      setSavingAddress(false);
    }
  };

  // Function to save edited alternate number
  const saveEditedAlternateNumber = async () => {
    if (!lead) return;
    
    try {
      setSavingAlternateNumber(true);
      const toastId = toast.loading("Saving alternate number...");
      
      const currentUser = getCurrentUser();
      const actorId = currentUser?.code || "system";
      
      const res = await authenticatedFetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          alternateNumber: editedAlternateNumber.trim() || null,
          actorId: actorId 
        })
      });
      
      if (res.ok) {
        setLead(prev => prev ? { ...prev, alternateNumber: editedAlternateNumber.trim() || null } : null);
        setEditingAlternateNumber(false);
        toast.success("Alternate number updated successfully", { id: toastId });
      } else {
        toast.error("Failed to update alternate number", { id: toastId });
      }
    } catch (error) {
      console.error("Failed to update alternate number:", error);
      toast.error("Failed to update alternate number");
    } finally {
      setSavingAlternateNumber(false);
    }
  };

  // Delete current lead using modal confirmation
  const performDeleteLead = async () => {
    if (!lead) return;
    try {
      const res = await authenticatedFetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");
      toast.success("Lead deleted");
      window.location.href = "/team-leader/leads";
    } catch {
      toast.error("Failed to delete lead");
    } finally {
      setConfirmDeleteOpen(false);
    }
  };

  const timeline = (() => {
    const items: Array<{ id: string | number; label: string; at?: string; meta?: string; type: string; data?: any; icon: any; color: string; notes?: string }> = [];
    
    console.log('Timeline generation - Total events:', events.length);
    console.log('Events types found:', events.map(e => e.type));
    
    if (lead) {
      items.push({
        id: "created",
        label: "Lead Created",
        at: lead.createdAt || undefined,
        meta: `Source: ${lead.source || "—"}`,
        type: "created",
        icon: Target,
        color: "emerald"
      });
    }
    
    // Filter and process only business-relevant events
    for (const e of events.slice().sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime())) {
      const type = String(e.type || "Event");
      
      // Skip technical backend events
      if (["CALL_STARTED", "CALL_ENDED"].includes(type)) {
        continue;
      }
      
      let label = type;
      let meta: string | undefined = undefined;
      let icon: any = FileText;
      let color = "blue";
      let notes: string | undefined = undefined;
      
      if (type === "STAGE_CHANGE") {
        console.log('Processing STAGE_CHANGE event:', e);
        const fromStage = e.data?.from || "Unknown";
        const toStage = e.data?.to || "Unknown";
        const actorId = e.data?.actorId || e.actorId || "system";
        const reason = e.data?.reason || "";
        const stageNotes = e.data?.stageNotes || "";
        const callStatus = e.data?.callStatus || "";
        
        if (actorId && actorId !== "system") {
          const actorName = resolveActorName(actorId);
          label = `${actorName} changed stage`;
          meta = `${fromStage} → ${toStage}`;
          
          // Add additional context if available
          if (reason) {
            meta += ` (${reason})`;
          }
          if (callStatus) {
            meta += ` - Call: ${callStatus}`;
          }
          
          // Store notes separately for clean display
          if (stageNotes) {
            notes = stageNotes;
          }
        } else {
          label = "Stage Changed";
          meta = `${fromStage} → ${toStage}`;
          if (reason) {
            meta += ` (${reason})`;
          }
          if (stageNotes) {
            notes = stageNotes;
          }
        }
        icon = BarChart3;
        color = "purple";
        console.log('STAGE_CHANGE processed - label:', label, 'meta:', meta, 'notes:', notes);
      }
      
      if (type === "ASSIGNED") {
        const fromOwnerCode = e.data?.from || "unassigned";
        const toOwnerCode = e.data?.to || "";
        const fromOwnerName = fromOwnerCode === "unassigned" ? "Unassigned" : (salesByCode[fromOwnerCode]?.name || fromOwnerCode);
        const toOwnerName = salesByCode[toOwnerCode]?.name || toOwnerCode;
        const actorId = e.data?.actorId || e.actorId || "system";
        
        if (actorId && actorId !== "system") {
          const actorName = resolveActorName(actorId);
          label = `${actorName} reassigned lead`;
          meta = `${fromOwnerName} → ${toOwnerName}`;
        } else {
          label = "Lead Reassigned";
          meta = `${fromOwnerName} → ${toOwnerName}`;
        }
        icon = RefreshCw;
        color = "blue";
      }
      
      if (type === "NOTE_ADDED") {
        label = "Note Added";
        meta = e.data?.note || "Note content";
        icon = FileText;
        color = "amber";
        notes = e.data?.note;
      }
      
      if (type === "CALL_LOGGED") {
        const status = e.data?.status || "Call completed";
        const note = e.data?.notes || e.data?.note || "";
        const callType = e.data?.callType || "";
        const callCompleted = e.data?.callCompleted || "";
        const actorId = e.actorId || "system";
        
        if (actorId && actorId !== "system") {
          const actorName = resolveActorName(actorId);
          label = `${actorName} logged call`;
          
          // Build comprehensive call metadata
          const callMeta = [];
          if (status) callMeta.push(`Status: ${status}`);
          if (callType) callMeta.push(`Type: ${callType}`);
          if (callCompleted) callMeta.push(`Completed: ${callCompleted}`);
          
          meta = callMeta.join(" • ");
          
          // Store notes separately
          if (note) {
            notes = note;
          }
        } else {
          label = "Call Logged";
          const callMeta = [];
          if (status) callMeta.push(`Status: ${status}`);
          if (callType) callMeta.push(`Type: ${callType}`);
          if (callCompleted) callMeta.push(`Completed: ${callCompleted}`);
          
          meta = callMeta.join(" • ");
          
          if (note) {
            notes = note;
          }
        }
        icon = Phone;
        color = "green";
      }
      
      if (type === "CALL_OUTCOME" || type === "CALL_LOGGED") {
        // Skip duplicate CALL_LOGGED events since we handle them above
        if (type === "CALL_LOGGED") continue;
        
        const status = e.data?.status || "Call completed";
        const note = e.data?.notes || e.data?.note || "";
        const actorId = e.actorId || "system";
        
        if (actorId && actorId !== "system") {
          const actorName = resolveActorName(actorId);
          label = `${actorName} logged call`;
          meta = `${status}`;
          
          if (note) {
            notes = note;
          }
        } else {
          label = "Call Logged";
          meta = `${status}`;
          
          if (note) {
            notes = note;
          }
        }
        icon = Phone;
        color = "green";
      }
      
      if (type === "LEAD_STATUS_CHANGED") {
        const stage = e.data?.stage || "updated";
        const actorId = e.actorId || "system";
        
        if (actorId && actorId !== "system") {
          const actorName = resolveActorName(actorId);
          label = `${actorName} updated status`;
          meta = `Stage: ${stage}`;
        } else {
          label = "Status Updated";
          meta = `Stage: ${stage}`;
        }
        icon = TrendingUp;
        color = "cyan";
      }
      
      // Only add events that have meaningful business value
      if (["ASSIGNED", "STAGE_CHANGE", "NOTE_ADDED", "CALL_LOGGED", "CALL_OUTCOME", "LEAD_STATUS_CHANGED"].includes(type)) {
        console.log('Adding event to timeline:', type, { label, meta, icon, color, notes });
        items.push({ id: e.id, label, at: e.at, meta, type, data: e.data, icon, color, notes });
      }
    }
    
    console.log('Timeline generation complete - Final items count:', items.length);
    console.log('Timeline items:', items.map(item => ({ type: item.type, label: item.label, meta: item.meta, notes: item.notes })));
    
    return items.reverse(); // Show latest first
  })();

  if (loading) return <div className="p-6">Loading…</div>;
  if (!lead) return <div className="p-6">Lead not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500"><Link href="/team-leader/leads" className="hover:underline">Leads</Link> / {lead?.phone}</div>
          <h1 className="text-2xl font-semibold">{lead?.name || lead?.phone}</h1>
                          <div className="text-sm text-slate-600">{lead?.email || "—"} • Source: {lead?.source || "—"} • Stage: {lead?.stage || "Not contacted"}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 bg-red-100 text-red-700 hover:bg-red-200"
          >
            Delete Lead
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <div className={`${confirmDeleteOpen ? '' : 'hidden'} fixed inset-0 z-50 flex items-center justify-center bg-black/40`}>
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
          <h3 className="text-lg font-semibold text-slate-900">Delete this lead?</h3>
          <p className="text-sm text-slate-600 mt-1">This action cannot be undone. You are about to delete {lead?.name || lead?.phone}.</p>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-sm cursor-pointer"
              onClick={() => setConfirmDeleteOpen(false)}
            >Cancel</button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm cursor-pointer"
              onClick={performDeleteLead}
            >Delete</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
            <button
              onClick={() => {
                const phoneNumber = lead?.phone?.replace(/\D/g, ''); // Remove non-digits
                const whatsappUrl = `https://wa.me/${phoneNumber}`;
                window.open(whatsappUrl, '_blank');
              }}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 bg-green-100 text-green-700 hover:bg-green-200"
              title="Open WhatsApp chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
              </svg>
              WhatsApp
            </button>
          </div>
          
          {timeline.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-600 mb-2">No activity yet</p>
              <p className="text-sm text-slate-500">This lead hasn't had any activity recorded yet.</p>
            </div>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {timeline.map((item, idx) => {
                  const isLast = idx === timeline.length - 1;
                  
                  // Define color schemes for different event types
  const getColorScheme = (color: string) => {
    switch (color) {
      case "emerald":
        return {
          bg: "bg-gradient-to-br from-primary to-primary/80",
          ring: "ring-primary/10",
          text: "text-primary",
          bgLight: "bg-primary/5",
          iconBg: "bg-primary/10"
        };
      case "blue":
        return {
          bg: "bg-gradient-to-br from-blue-600 to-blue-700",
          ring: "ring-blue-500/10",
          text: "text-blue-700",
          bgLight: "bg-blue-50/50",
          iconBg: "bg-blue-100"
        };
      case "purple":
        return {
          bg: "bg-gradient-to-br from-violet-600 to-violet-700",
          ring: "ring-violet-500/10",
          text: "text-violet-700",
          bgLight: "bg-violet-50/50",
          iconBg: "bg-violet-100"
        };
      case "amber":
        return {
          bg: "bg-gradient-to-br from-amber-600 to-amber-700",
          ring: "ring-amber-500/10",
          text: "text-amber-700",
          bgLight: "bg-amber-50/50",
          iconBg: "bg-amber-100"
        };
      case "green":
        return {
          bg: "bg-gradient-to-br from-emerald-600 to-emerald-700",
          ring: "ring-emerald-500/10",
          text: "text-emerald-700",
          bgLight: "bg-emerald-50/50",
          iconBg: "bg-emerald-100"
        };
      case "cyan":
        return {
          bg: "bg-gradient-to-br from-cyan-600 to-cyan-700",
          ring: "ring-cyan-500/10",
          text: "text-cyan-700",
          bgLight: "bg-cyan-50/50",
          iconBg: "bg-cyan-100"
        };
      default:
        return {
          bg: "bg-gradient-to-br from-slate-600 to-slate-700",
          ring: "ring-slate-500/10",
          text: "text-slate-700",
          bgLight: "bg-slate-50/50",
          iconBg: "bg-slate-100"
        };
    }
  };
                  
                  const colors = getColorScheme(item.color);
                  
                  return (
                    <li key={`${item.id}-${idx}`}>
                      <div className="relative pb-8">
                        {!isLast && (
                          <span className="absolute top-6 left-6 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                        )}
                        <div className="relative flex items-start space-x-4">
                          {/* Event Icon */}
                          <div className="relative flex-shrink-0">
                            <div className={`h-12 w-12 rounded-full ${colors.bg} flex items-center justify-center ring-8 ${colors.ring} shadow-md hover:shadow-lg transition-all duration-200`}>
                              <item.icon className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          
                          {/* Event Content */}
                          <div className="flex-1 min-w-0">
                            <div className="bg-white rounded-lg p-4 border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300/60 transition-all duration-200">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-2">
                                  <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
                                  {item.meta && (
                                    <div>
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${colors.text} ${colors.bgLight} border border-current/10`}>
                                        {item.meta}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Notes Display */}
                                  {item.notes && (
                                    <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-md mt-2">
                                      <div className="flex items-start gap-2">
                                        <div className="flex-shrink-0">
                                          <div className="w-6 h-6 bg-slate-200/60 rounded-full flex items-center justify-center">
                                            <FileTextIcon className="w-3 h-3 text-slate-600" />
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-slate-700 mb-0.5">Notes</p>
                                          <p className="text-xs text-slate-600 leading-relaxed">{item.notes}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {item.at && (
                                  <time className="flex-shrink-0 text-xs text-slate-500 font-medium">
                                    {new Date(item.at).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </time>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Lead Details</h2>
            </div>
           
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</dt>
                <dd className="mt-1">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter name..."
                        autoFocus
                      />
                      <button
                        onClick={saveEditedName}
                        disabled={savingName || !editedName.trim()}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {savingName ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false);
                          setEditedName(lead.name || "");
                        }}
                        className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        {lead.name || "Unknown"}
                      </span>
                      <button
                        onClick={() => {
                          setEditingName(true);
                          setEditedName(lead.name || "");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{lead.phone}</dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</dt>
                <dd className="mt-1">
                  {editingEmail ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={editedEmail}
                        onChange={(e) => setEditedEmail(e.target.value)}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter email..."
                        autoFocus
                      />
                      <button
                        onClick={saveEditedEmail}
                        disabled={savingEmail}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {savingEmail ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingEmail(false);
                          setEditedEmail(lead.email || "");
                        }}
                        className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        {lead.email || "No email"}
                      </span>
                      <button
                        onClick={() => {
                          setEditingEmail(true);
                          setEditedEmail(lead.email || "");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </dd>
              </div>
              
              {/* Course Information - only show if lead has a course */}
              {leadCourse && (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <dt className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Course Information</dt>
                  <dd className="mt-1 space-y-1">
                    <div className="text-sm font-semibold text-emerald-900">{leadCourse.name}</div>
                    <div className="text-xs text-emerald-700">
                      Price: ${(leadCourse.price / 100).toFixed(2)}
                      {lead.paidAmount && (
                        <span className="ml-2">
                          • Paid: ${(lead.paidAmount / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {leadCourse.description && (
                      <div className="text-xs text-emerald-600 mt-1">{leadCourse.description}</div>
                    )}
                  </dd>
                </div>
              )}
              
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Alternate Number</dt>
                <dd className="mt-1">
                  {editingAlternateNumber ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        value={editedAlternateNumber}
                        onChange={(e) => setEditedAlternateNumber(e.target.value)}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter alternate number..."
                        autoFocus
                      />
                      <button
                        onClick={saveEditedAlternateNumber}
                        disabled={savingAlternateNumber}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {savingAlternateNumber ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingAlternateNumber(false);
                          setEditedAlternateNumber(lead.alternateNumber || "");
                        }}
                        className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">
                        {lead.alternateNumber || "No alternate number"}
                      </span>
                      <button
                        onClick={() => {
                          setEditingAlternateNumber(true);
                          setEditedAlternateNumber(lead.alternateNumber || "");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </dd>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Address</dt>
                <dd className="mt-1">
                  {editingAddress ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editedAddress}
                        onChange={(e) => setEditedAddress(e.target.value)}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Enter address..."
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEditedAddress}
                          disabled={savingAddress}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {savingAddress ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingAddress(false);
                            setEditedAddress(lead.address || "");
                          }}
                          className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 whitespace-pre-line">
                        {lead.address || "No address"}
                      </span>
                      <button
                        onClick={() => {
                          setEditingAddress(true);
                          setEditedAddress(lead.address || "");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline flex-shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Owner</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{salesByCode[lead.ownerId || ""]?.name || lead.ownerId || "—"}</dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Stage</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    lead.stage === 'Qualified' || lead.stage === 'Interested' || lead.stage === 'Customer' ? 'text-green-800 bg-green-100 border border-green-200' :
                    lead.stage === 'To be nurtured' || lead.stage === 'Ask to call back' ? 'text-blue-800 bg-blue-100 border border-blue-200' :
                    lead.stage === 'Not interested' || lead.stage === 'Junk' || lead.stage === 'Attempt to contact' || lead.stage === 'Did not Connect' || lead.stage === 'Other Language' ? 'text-red-800 bg-red-100 border border-red-200' :
                    lead.stage === 'Not contacted' ? 'text-gray-800 bg-gray-100 border border-gray-200' :
                    'text-slate-800 bg-slate-100 border border-slate-200'
                  }`}>
                    {lead.stage || "Not contacted"}
                  </span>
                </dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Reassign Lead</dt>
                <dd className="mt-1">
                  <select
                    value={selectedOwner || lead.ownerId || ""}
                    onChange={(e) => setSelectedOwner(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Owner</option>
                    {Object.entries(salesByCode).map(([code, salesperson]) => (
                      <option key={code} value={code}>
                        {salesperson.name} ({code})
                      </option>
                    ))}
                  </select>
                  {selectedOwner && selectedOwner !== lead.ownerId && (
                    <button
                      onClick={handleReassign}
                      disabled={reassigning}
                      className="mt-2 w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {reassigning ? (
                        <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" aria-hidden="true" />
                      ) : null}
                      <span>{reassigning ? "Reassigning..." : "Reassign Lead"}</span>
                    </button>
                  )}
                </dd>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quick Stage Change</dt>
                <dd className="mt-1 space-y-2">
                  <select
                    value={selectedStage || ""}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select New Stage</option>
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.name}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Stage change reason/notes..."
                    className={`w-full border ${stageNotesError ? 'border-red-500' : 'border-slate-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none`}
                    rows={2}
                    required
                    value={stageChangeNotes}
                    onChange={(e) => { setStageChangeNotes(e.target.value); if (stageNotesError && e.target.value.trim()) setStageNotesError(""); }}
                  />
                  {stageNotesError && (
                    <div className="text-red-600 text-xs mt-1">{stageNotesError}</div>
                  )}
                  
                  {/* Course selection - only show when stage is "Customer" */}
                  {(() => {
                    console.log('Selected stage:', selectedStage);
                    console.log('Stage includes customer:', selectedStage && selectedStage.toLowerCase().includes("customer"));
                    return selectedStage && selectedStage.toLowerCase().includes("customer");
                  })() && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Course *</label>
                        <select
                          value={selectedCourse || ""}
                          onChange={(e) => setSelectedCourse(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select Course</option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.name} - ${(course.price / 100).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Paid amount field - only show when course is selected */}
                      {selectedCourse && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Paid Amount ($) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Enter paid amount"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                      )}
                    </>
                  )}
                  
                  <button
                    className="w-full cursor-pointer bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    onClick={async () => {
                      if (!selectedStage) {
                        toast.error("Please select a new stage.");
                        return;
                      }
                      if (!stageChangeNotes.trim()) {
                        setStageNotesError("Please provide a reason for the stage change");
                        toast.error("Please provide a reason for the stage change.");
                        return;
                      }

                      // Special handling for Customer stage - requires course and paid amount
                      if (selectedStage && selectedStage.toLowerCase().includes("customer")) {
                        if (!selectedCourse) {
                          toast.error("Please select a course for the customer.");
                          return;
                        }
                        if (!paidAmount || parseFloat(paidAmount) <= 0) {
                          toast.error("Please enter a valid paid amount.");
                          return;
                        }
                      }

                      try {
                        setUpdatingStage(true);
                        const toastId = toast.loading(selectedStage && selectedStage.toLowerCase().includes("customer") ? "Creating sale..." : "Updating stage...");
                        const currentUser = getCurrentUser();
                        const actorId = currentUser?.code || "system";

                        let res;
                        
                        if (selectedStage && selectedStage.toLowerCase().includes("customer")) {
                          // Use sales API for customer stage
                          res = await authenticatedFetch("/api/sales", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              leadPhone: lead.phone,
                              courseId: parseInt(selectedCourse),
                              paidAmount: parseFloat(paidAmount),
                              stageNotes: stageChangeNotes.trim(),
                              actorId: actorId
                            })
                          });
                        } else {
                          // Use regular lead update API for other stages
                          const requestBody: any = {
                            stage: selectedStage,
                            stageNotes: stageChangeNotes.trim(),
                            actorId: actorId
                          };

                          res = await authenticatedFetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(requestBody)
                          });
                        }

                        if (res.ok) {
                          const successMessage = selectedStage && selectedStage.toLowerCase().includes("customer") 
                            ? "Sale created successfully!" 
                            : "Stage updated successfully";
                          toast.success(successMessage, { id: toastId });
                          setStageNotesError("");
                          
                          // Refresh lead data
                          const d = await authenticatedFetch(`/api/tl/leads/${encodeURIComponent(phone)}`).then((r) => r.json());
                          
                          setLead(d.lead || null);
                          setEvents(d.events || []);
                          setTasks(d.tasks || []);
                          setLeadCourse(d.course || null);
                          setSelectedStage("");
                          setStageChangeNotes("");
                          setSelectedCourse("");
                          setPaidAmount("");
                        } else {
                          const errorMessage = selectedStage && selectedStage.toLowerCase().includes("customer") 
                            ? "Failed to create sale" 
                            : "Failed to update stage";
                          toast.error(errorMessage, { id: toastId });
                        }
                      } catch (error) {
                        console.error("Failed to update stage:", error);
                        toast.error("Failed to update stage");
                      } finally {
                        setUpdatingStage(false);
                      }
                    }}
                    disabled={!selectedStage || updatingStage}
                  >
                    {updatingStage ? (
                      <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" aria-hidden="true" />
                    ) : (
                      <span>
                        {selectedStage && selectedStage.toLowerCase().includes("customer") ? "Create Sale" : "Update Stage"}
                      </span>
                    )}
                  </button>
                </dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Score</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    (lead.score ?? 0) >= 80 ? 'text-green-800 bg-green-100' :
                    (lead.score ?? 0) >= 60 ? 'text-yellow-800 bg-yellow-100' :
                    'text-red-800 bg-red-100'
                  }`}>
                    {lead.score ?? 0}
                  </span>
                </dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}</dd>
              </div>
            </div>

          
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-medium text-slate-700">Add Note</h3>
              </div>
              <div className="space-y-3">
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="Add a note about this lead..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <button
                  className="w-full rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
                  disabled={!newNote.trim() || addingNote}
                  onClick={async () => {
                    try {
                      setAddingNote(true);
                      const toastId = toast.loading("Adding note...");
                      const res = await authenticatedFetch("/api/tl/leads/notes", { 
                        method: "POST", 
                        headers: { "Content-Type": "application/json" }, 
                        body: JSON.stringify({ 
                          phone: lead.phone, 
                          note: newNote.trim() 
                        }) 
                      });
                      if (res.ok) {
                        toast.success("Note added successfully", { id: toastId });
                        setNewNote("");
                        // Refresh events to show the new note
                        const d = await authenticatedFetch(`/api/tl/leads/${encodeURIComponent(phone)}`).then((r) => r.json());
                        setEvents(d.events || []);
                      } else {
                        toast.error("Failed to add note", { id: toastId });
                      }
                    } finally {
                      setAddingNote(false);
                    }
                  }}
                >
                  {addingNote && (
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" aria-hidden="true" />
                  )}
                  <span>{addingNote ? "Adding..." : "Add Note"}</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-medium text-slate-700">Tasks</h3>
              </div>
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-500">No tasks assigned</p>
                  </div>
                ) : (
                  tasks.map((t) => (
                    <div key={t.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                      <div className="font-medium text-sm text-slate-900">{t.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          t.status === 'completed' ? 'text-green-800 bg-green-100' :
                          t.status === 'in_progress' ? 'text-blue-800 bg-blue-100' :
                          'text-gray-800 bg-gray-100'
                        }`}>
                          {t.status}
                        </span>
                        {t.dueAt && (
                          <span className="text-xs text-slate-500">
                            Due: {new Date(t.dueAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}