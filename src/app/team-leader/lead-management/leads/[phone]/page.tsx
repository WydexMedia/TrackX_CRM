"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface Lead {
  phone: string;
  name: string | null;
  email: string | null;
  source: string | null;
  stage: string;
  ownerId: string | null;
  score: number | null;
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
  const [updatingStage, setUpdatingStage] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("");
  const [callNotes, setCallNotes] = useState<string>("");
  const [loggingCall, setLoggingCall] = useState(false);

  // Function to fetch user names from API
  const fetchUserNames = async () => {
    try {
      const response = await fetch("/api/tl/users");
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
      
      const res = await fetch(`/api/tl/leads/${encodeURIComponent(lead?.phone || '')}`, {
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
        const d = await fetch(`/api/tl/leads/${encodeURIComponent(phone)}`).then((r) => r.json());
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
    fetch(`/api/tl/leads/${encodeURIComponent(phone)}`)
      .then((r) => r.json())
      .then((d) => { setLead(d.lead || null); setEvents(d.events || []); setTasks(d.tasks || []); })
      .finally(() => setLoading(false));
    
    // Fetch user names for actor resolution
    fetchUserNames();
  }, [phone]);

  useEffect(() => {
    fetch("/api/users")
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

  const timeline = (() => {
    const items: Array<{ id: string | number; label: string; at?: string; meta?: string; type: string; data?: any; icon: string; color: string }> = [];
    
    console.log('Timeline generation - Total events:', events.length);
    console.log('Events types found:', events.map(e => e.type));
    
    if (lead) {
      items.push({
        id: "created",
        label: "Lead Created",
        at: lead.createdAt || undefined,
        meta: `Source: ${lead.source || "—"}`,
        type: "created",
        icon: "🎯",
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
      let icon = "📝";
      let color = "blue";
      
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
          if (stageNotes) {
            meta += ` - ${stageNotes}`;
          }
        } else {
          label = "Stage Changed";
          meta = `${fromStage} → ${toStage}`;
          if (reason) {
            meta += ` (${reason})`;
          }
        }
        icon = "📊";
        color = "purple";
        console.log('STAGE_CHANGE processed - label:', label, 'meta:', meta);
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
        icon = "🔄";
        color = "blue";
      }
      
      if (type === "NOTE_ADDED") {
        label = "Note Added";
        meta = e.data?.note || "Note content";
        icon = "📝";
        color = "amber";
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
          if (note) callMeta.push(`Notes: ${note}`);
          
          meta = callMeta.join(" • ");
        } else {
          label = "Call Logged";
          const callMeta = [];
          if (status) callMeta.push(`Status: ${status}`);
          if (callType) callMeta.push(`Type: ${callType}`);
          if (callCompleted) callMeta.push(`Completed: ${callCompleted}`);
          if (note) callMeta.push(`Notes: ${note}`);
          
          meta = callMeta.join(" • ");
        }
        icon = "📞";
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
          meta = `${status}${note ? ` - ${note}` : ""}`;
        } else {
          label = "Call Logged";
          meta = `${status}${note ? ` - ${note}` : ""}`;
        }
        icon = "📞";
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
        icon = "📈";
        color = "cyan";
      }
      
      // Only add events that have meaningful business value
      if (["ASSIGNED", "STAGE_CHANGE", "NOTE_ADDED", "CALL_LOGGED", "CALL_OUTCOME", "LEAD_STATUS_CHANGED"].includes(type)) {
        console.log('Adding event to timeline:', type, { label, meta, icon, color });
        items.push({ id: e.id, label, at: e.at, meta, type, data: e.data, icon, color });
      }
    }
    
    console.log('Timeline generation complete - Final items count:', items.length);
    console.log('Timeline items:', items.map(item => ({ type: item.type, label: item.label, meta: item.meta })));
    
    return items.reverse(); // Show latest first
  })();

  if (loading) return <div className="p-6">Loading…</div>;
  if (!lead) return <div className="p-6">Lead not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500"><Link href="/team-leader/lead-management/leads" className="hover:underline">Leads</Link> / {lead?.phone}</div>
          <h1 className="text-2xl font-semibold">{lead?.name || lead?.phone}</h1>
          <div className="text-sm text-slate-600">{lead?.email || "—"} • Source: {lead?.source || "—"} • Stage: {lead?.stage || "NEW"}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
          </div>
          
          {timeline.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-sm text-slate-500">No activity yet</p>
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
                          bg: "bg-emerald-500",
                          ring: "ring-emerald-100",
                          text: "text-emerald-700",
                          bgLight: "bg-emerald-50"
                        };
                      case "blue":
                        return {
                          bg: "bg-blue-500",
                          ring: "ring-blue-100",
                          text: "text-blue-700",
                          bgLight: "bg-blue-50"
                        };
                      case "purple":
                        return {
                          bg: "bg-purple-500",
                          ring: "ring-purple-100",
                          text: "text-purple-700",
                          bgLight: "bg-purple-50"
                        };
                      case "amber":
                        return {
                          bg: "bg-amber-500",
                          ring: "ring-amber-100",
                          text: "text-amber-700",
                          bgLight: "bg-amber-50"
                        };
                      case "green":
                        return {
                          bg: "bg-green-500",
                          ring: "ring-green-100",
                          text: "text-green-700",
                          bgLight: "bg-green-50"
                        };
                      case "cyan":
                        return {
                          bg: "bg-cyan-500",
                          ring: "ring-cyan-100",
                          text: "text-cyan-700",
                          bgLight: "bg-cyan-50"
                        };
                      default:
                        return {
                          bg: "bg-slate-500",
                          ring: "ring-slate-100",
                          text: "text-slate-700",
                          bgLight: "bg-slate-50"
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
                          <div className={`relative flex-shrink-0 ${colors.bgLight} rounded-full p-1`}>
                            <div className={`h-12 w-12 rounded-full ${colors.bg} flex items-center justify-center ring-4 ${colors.ring} shadow-sm`}>
                              <span className="text-lg">{item.icon}</span>
                            </div>
                          </div>
                          
                          {/* Event Content */}
                          <div className="flex-1 min-w-0">
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="text-sm font-semibold text-slate-900 leading-5">{item.label}</h3>
                                  {item.meta && (
                                    <div className="mt-2">
                                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${colors.text} ${colors.bgLight} border border-current/20`}>
                                        {item.meta}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {item.at && (
                                  <time className="flex-shrink-0 ml-4 text-xs text-slate-500 font-medium bg-slate-50 px-2 py-1 rounded-md">
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
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900">Lead Details</h2>
            </div>
            <Link
              href={`/call-form?leadPhone=${encodeURIComponent(lead.phone)}`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Log Call
            </Link>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{lead.phone}</dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Owner</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{salesByCode[lead.ownerId || ""]?.name || lead.ownerId || "—"}</dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Stage</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    lead.stage === 'CONVERTED' || lead.stage === 'CUSTOMER' || lead.stage === 'SALES_CLOSED' ? 'text-green-800 bg-green-100 border border-green-200' :
                    lead.stage === 'INTERESTED' || lead.stage === 'QUALIFIED' || lead.stage === 'PROSPECT' ? 'text-blue-800 bg-blue-100 border border-blue-200' :
                    lead.stage === 'PAYMENT_INITIAL' || lead.stage === 'PAYMENT_DONE' ? 'text-yellow-800 bg-yellow-100 border border-yellow-200' :
                    lead.stage === 'FOLLOW_UP' ? 'text-purple-800 bg-purple-100 border border-purple-200' :
                    lead.stage === 'DNP' || lead.stage === 'DNC' || lead.stage === 'DISQUALIFIED' || lead.stage === 'NOT_INTERESTED' ? 'text-red-800 bg-red-100 border border-red-200' :
                    lead.stage === 'NIFC' || lead.stage === 'NOT_CONTACTED' ? 'text-gray-800 bg-gray-100 border border-gray-200' :
                    'text-slate-800 bg-slate-100 border border-slate-200'
                  }`}>
                    {lead.stage || "NEW"}
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
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="INTERESTED">INTERESTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="PROSPECT">PROSPECT</option>
                    <option value="FOLLOW_UP">FOLLOW_UP</option>
                    <option value="PAYMENT_INITIAL">PAYMENT_INITIAL</option>
                    <option value="PAYMENT_DONE">PAYMENT_DONE</option>
                    <option value="CONVERTED">CONVERTED</option>
                    <option value="CUSTOMER">CUSTOMER</option>
                    <option value="SALES_CLOSED">SALES_CLOSED</option>
                    <option value="NOT_INTERESTED">NOT_INTERESTED</option>
                    <option value="DNP">DNP</option>
                    <option value="DNC">DNC</option>
                    <option value="DISQUALIFIED">DISQUALIFIED</option>
                    <option value="NIFC">NIFC</option>
                    <option value="NOT_CONTACTED">NOT_CONTACTED</option>
                  </select>
                  <textarea
                    placeholder="Stage change reason/notes..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={2}
                    value={stageChangeNotes}
                    onChange={(e) => setStageChangeNotes(e.target.value)}
                  />
                  <button
                    className="w-full bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    onClick={async () => {
                      if (!selectedStage) {
                        toast.error("Please select a new stage.");
                        return;
                      }
                      if (!stageChangeNotes.trim()) {
                        toast.error("Please provide a reason for the stage change.");
                        return;
                      }

                      try {
                        setUpdatingStage(true);
                        const toastId = toast.loading("Updating stage...");
                        const currentUser = getCurrentUser();
                        const actorId = currentUser?.code || "system";

                        const res = await fetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            stage: selectedStage,
                            stageNotes: stageChangeNotes.trim(),
                            actorId: actorId
                          })
                        });

                        if (res.ok) {
                          toast.success("Stage updated successfully", { id: toastId });
                          
                          // Refresh lead data
                          console.log('Refreshing data after stage update...');
                          const d = await fetch(`/api/tl/leads/${encodeURIComponent(phone)}`).then((r) => r.json());
                          console.log('Quick stage change - refreshed data:', d);
                          console.log('Events count after refresh:', d.events?.length || 0);
                          console.log('Latest events:', d.events?.slice(0, 3));
                          
                          // Check if the new STAGE_CHANGE event is in the refreshed data
                          const stageChangeEvents = d.events?.filter((e: any) => e.type === 'STAGE_CHANGE') || [];
                          console.log('STAGE_CHANGE events found:', stageChangeEvents);
                          
                          setLead(d.lead || null);
                          setEvents(d.events || []);
                          setTasks(d.tasks || []);
                          setSelectedStage("");
                          setStageChangeNotes("");
                          
                          console.log('State updated - events count:', d.events?.length || 0);
                          console.log('New events array set to state');
                        } else {
                          toast.error("Failed to update stage", { id: toastId });
                        }
                      } catch (error) {
                        console.error("Failed to update stage:", error);
                        toast.error("Failed to update stage");
                      } finally {
                        setUpdatingStage(false);
                      }
                    }}
                    disabled={!selectedStage || !stageChangeNotes.trim() || updatingStage}
                  >
                    {updatingStage ? (
                      <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" aria-hidden="true" />
                    ) : (
                      <span>Update Stage</span>
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
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
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
                      const res = await fetch("/api/tl/leads/notes", { 
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
                        const d = await fetch(`/api/tl/leads/${encodeURIComponent(phone)}`).then((r) => r.json());
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
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <h3 className="text-sm font-medium text-slate-700">Quick Call Log</h3>
              </div>
              <div className="space-y-3">
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={callStatus || lead.ownerId || ""}
                  onChange={(e) => setCallStatus(e.target.value)}
                >
                  <option value="">Select Call Status</option>
                  <option value="QUALIFIED">QUALIFIED</option>
                  <option value="CONNECTED_TO_WHATSAPP">CONNECTED TO WHATSAPP</option>
                  <option value="DNP">DNP</option>
                  <option value="POSITIVE">POSITIVE</option>
                  <option value="NATC">NATC</option>
                  <option value="NOT_INTERESTED">NOT INTERESTED</option>
                </select>
                <textarea
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="Call notes..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                />
                <button
                  className="w-full rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
                  disabled={!callStatus || !callNotes.trim() || loggingCall}
                  onClick={async () => {
                    try {
                      setLoggingCall(true);
                      const toastId = toast.loading("Logging call...");
                      const currentUser = getCurrentUser();
                      const actorId = currentUser?.code || "system";
                      
                      const res = await fetch("/api/calls", { 
                        method: "POST", 
                        headers: { "Content-Type": "application/json" }, 
                        body: JSON.stringify({ 
                          leadPhone: lead.phone,
                          callStatus: callStatus,
                          notes: callNotes.trim(),
                          callType: "followup",
                          callCompleted: "yes",
                          ogaName: currentUser?.name || "system",
                          currentStage: lead.stage,
                          stageChanged: false
                        }) 
                      });
                      if (res.ok) {
                        toast.success("Call logged successfully", { id: toastId });
                        setCallStatus("");
                        setCallNotes("");
                        // Refresh events to show the new call
                        const d = await fetch(`/api/tl/leads/${encodeURIComponent(phone)}`).then((r) => r.json());
                        setEvents(d.events || []);
                      } else {
                        toast.error("Failed to log call", { id: toastId });
                      }
                    } finally {
                      setLoggingCall(false);
                    }
                  }}
                >
                  {loggingCall && (
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" aria-hidden="true" />
                  )}
                  <span>{loggingCall ? "Logging..." : "Log Call"}</span>
                </button>
                
                <div className="text-center">
                  <Link
                    href={`/call-form?leadPhone=${encodeURIComponent(lead.phone)}`}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Use full call form with stage changes →
                  </Link>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
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