"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { 
  Clock, 
  Users, 
  User, 
  UserPlus, 
  ArrowLeft, 
  Calendar,
  CheckCircle2,
  ListTodo,
  X,
  Edit3,
  Save,
  Phone,
  Mail,
  MapPin,
  Target,
  Activity,
  Funnel,
  PhoneCall,
  CheckCircle,
  Heart,
  Star,
  RotateCcw,
  MoreVertical,
  BarChart3,
  RefreshCw,
  FileText,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function getUser() {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

type Lead = { phone: string; name?: string | null; source?: string | null; stage?: string | null };
type TaskRow = { id: number; leadPhone: string; title: string; status: string; type?: string | null; dueAt?: string | null; priority?: string | null; ownerId?: string | null };

// Comprehensive Lead Card Modal - Full details view with beautiful timeline
function ComprehensiveLeadModal({ 
  lead, 
  isOpen, 
  onClose 
}: { 
  lead: Lead | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [leadDetails, setLeadDetails] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (lead && isOpen) {
      fetchLeadDetails();
      fetchUserNames();
    }
  }, [lead, isOpen]);

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
    }
  };

  const fetchLeadDetails = async () => {
    if (!lead?.phone) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`);
      if (response.ok) {
        const data = await response.json();
        setLeadDetails(data.lead);
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch lead details:", error);
    } finally {
      setLoading(false);
    }
  };

  const resolveActorName = (actorId: string) => {
    return userNames.get(actorId) || actorId;
  };

  // Build beautiful timeline like team leader page
  const timeline = (() => {
    const items: Array<{ 
      id: string | number; 
      label: string; 
      at?: string; 
      meta?: string; 
      type: string; 
      data?: any; 
      icon: any; 
      color: string; 
      notes?: string 
    }> = [];
    
    if (leadDetails) {
      items.push({
        id: "created",
        label: "Lead Created",
        at: leadDetails.createdAt || undefined,
        meta: `Source: ${lead?.source || "—"}`,
        type: "created",
        icon: Target,
        color: "emerald"
      });
    }
    
    // Process events
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
        const fromStage = e.data?.from || "Unknown";
        const toStage = e.data?.to || "Unknown";
        const actorId = e.data?.actorId || e.actorId || "system";
        const reason = e.data?.reason || "";
        const stageNotes = e.data?.stageNotes || "";
        
        if (actorId && actorId !== "system") {
          const actorName = resolveActorName(actorId);
          label = `${actorName} changed stage`;
          meta = `${fromStage} → ${toStage}`;
          
          if (reason) {
            meta += ` (${reason})`;
          }
          
          if (stageNotes) {
            notes = stageNotes;
          }
        } else {
          label = "Stage Changed";
          meta = `${fromStage} → ${toStage}`;
          if (stageNotes) {
            notes = stageNotes;
          }
        }
        icon = BarChart3;
        color = "purple";
      }
      
      if (type === "ASSIGNED") {
        const fromOwnerCode = e.data?.from || "unassigned";
        const toOwnerCode = e.data?.to || "";
        const fromOwnerName = fromOwnerCode === "unassigned" ? "Unassigned" : fromOwnerCode;
        const toOwnerName = toOwnerCode;
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
        const actorId = e.actorId || "system";
        
        if (actorId && actorId !== "system") {
          const actorName = resolveActorName(actorId);
          label = `${actorName} logged call`;
          meta = `Status: ${status}`;
          
          if (note) {
            notes = note;
          }
        } else {
          label = "Call Logged";
          meta = `Status: ${status}`;
          
          if (note) {
            notes = note;
          }
        }
        icon = Phone;
        color = "green";
      }
      
      // Only add business-relevant events
      if (["ASSIGNED", "STAGE_CHANGE", "NOTE_ADDED", "CALL_LOGGED"].includes(type)) {
        items.push({ id: e.id, label, at: e.at, meta, type, data: e.data, icon, color, notes });
      }
    }
    
    return items.reverse(); // Show latest first
  })();

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

  if (!isOpen || !lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">{lead.name || lead.phone}</DialogTitle>
          <div className="text-sm text-slate-600">
            {lead?.phone} • Source: {lead?.source || "—"} • Stage: {lead?.stage || "Not contacted"}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Activity Timeline Header */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <Clock className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  onClick={() => {
                    window.location.href = `tel:${lead?.phone}`;
                  }}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button
                  onClick={() => {
                    const phoneNumber = lead?.phone?.replace(/\D/g, '');
                    const whatsappUrl = `https://wa.me/${phoneNumber}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  size="sm"
                  className="bg-[#25D366] hover:bg-[#20BA5A] text-white"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
                  </svg>
                  WhatsApp
                </Button>
              </div>
            </div>

            {/* Beautiful Timeline */}
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
                                              <FileText className="w-3 h-3 text-slate-600" />
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
        )}
      </DialogContent>
    </Dialog>
  );
}

// Activity logging modal component - Original full version with all features
function ActivityLogModal({ 
  lead, 
  isOpen, 
  onClose, 
  onStatusUpdate,
  onCallInitiated
}: { 
  lead: Lead | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onStatusUpdate: () => void; 
  onCallInitiated: (lead: Lead) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState(lead?.stage || "");
  const [stageNotes, setStageNotes] = useState("");
  const [needFollowup, setNeedFollowup] = useState("no");
  const [followupDate, setFollowupDate] = useState("");
  const [leadDetails, setLeadDetails] = useState<any>(null);

  // Available stages - customized for business needs
  const availableStages = [
    "Not contacted",
    "Qualified",
    "Not interested",
    "Interested",
    "To be nurtured",
    "Junk",
    "Ask to call back",
    "Attempt to contact",
    "Did not Connect",
    "Customer",
    "Other Language"
  ];

  useEffect(() => {
    if (lead && isOpen) {
      setStage(lead.stage || "");
      setNeedFollowup("no");
      setFollowupDate("");
      setStageNotes("");
      fetchLeadDetails();
    }
  }, [lead, isOpen]);

  const fetchLeadDetails = async () => {
    if (!lead?.phone) return;
    
    try {
      const response = await fetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`);
      if (response.ok) {
        const data = await response.json();
        setLeadDetails(data.lead);
      }
    } catch (error) {
      console.error("Failed to fetch lead details:", error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!lead?.phone || !stage) return;
    
    setIsLoading(true);
    try {
      const updateData: any = {
        stage,
        stageNotes: stageNotes.trim() || undefined,
        actorId: getUser()?.email || getUser()?.code || "system"
      };

      // Add followup information if needed
      if (needFollowup === "yes" && followupDate) {
        updateData.needFollowup = true;
        updateData.followupDate = followupDate;
        updateData.followupNotes = stageNotes.trim() || undefined;
      } else {
        updateData.needFollowup = false;
        updateData.followupDate = null;
        updateData.followupNotes = null;
      }

      const response = await fetch(`/api/tl/leads/${encodeURIComponent(lead.phone)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        toast.success("Lead status updated successfully!");
        onStatusUpdate(); // Refresh the parent component
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update lead status");
      }
    } catch (error) {
      toast.error("Failed to update lead status");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Activity - {lead.name || lead.phone}</DialogTitle>
        </DialogHeader>
        
        {/* WhatsApp Button */}
        <div className="flex justify-end pb-4 border-b">
          <Button
              onClick={() => {
              const phoneNumber = lead?.phone?.replace(/\D/g, '');
                const whatsappUrl = `https://wa.me/${phoneNumber}`;
                window.open(whatsappUrl, '_blank');
              }}
            size="sm"
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white"
              title="Open WhatsApp chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
              </svg>
              WhatsApp
          </Button>
        </div>

        {/* Lead Information */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                <UserPlus size={16} className="text-gray-500" />
                <span className="text-gray-900">{lead.name || "Not provided"}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                <Phone size={16} className="text-gray-500" />
                <a 
                  href={`tel:${lead.phone}`}
                  onClick={() => onCallInitiated(lead)}
                  className="text-gray-900 font-mono hover:text-blue-600 cursor-pointer transition-colors"
                  title="Click to call this number"
                >
                  {lead.phone}
                </a>
              </div>
            </div>

            {leadDetails?.email && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                <Mail size={16} className="text-gray-500" />
                <span className="text-gray-900">{leadDetails.email}</span>
              </div>
              </div>
            )}

            {lead.source && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Source</label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                <MapPin size={16} className="text-gray-500" />
                <span className="text-gray-900">{lead.source}</span>
              </div>
              </div>
            )}
          </div>

          {/* Status Update Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Edit3 size={20} className="text-blue-600" />
              Update Status
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full p-3 text-black border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200 hover:border-gray-400/70"
                >
                  <option value="">Select a stage</option>
                  {availableStages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Need Followup?
                </label>
                <select
                  value={needFollowup}
                  onChange={(e) => setNeedFollowup(e.target.value)}
                  className="w-full p-3 text-black border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200 hover:border-gray-400/70"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              {needFollowup === "yes" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Followup Date
                  </label>
                  <Input
                    type="date"
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <Textarea
                  value={stageNotes}
                  onChange={(e) => setStageNotes(e.target.value)}
                  placeholder="Add notes about this status change..."
                  rows={3}
                  className="resize-none"
                />
              </div>

            </div>

            <Button
              onClick={handleStatusUpdate}
              disabled={!stage || isLoading || (needFollowup === "yes" && !followupDate)}
              className="w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Updating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Update Status
                </>
              )}
            </Button>
          </div>
                      </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TasksPage() {
  const [user, setUser] = useState<any>(null);
  const [dueCalls, setDueCalls] = useState<Array<{ task: TaskRow; lead: Lead }>>([]);
  const [followUps, setFollowUps] = useState<Array<{ task: TaskRow; lead: Lead }>>([]);
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [specialTasks, setSpecialTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Refs for scrolling to different sections
  const leadsSectionRef = useRef<HTMLDivElement>(null);
  const followUpsSectionRef = useRef<HTMLDivElement>(null);
  const specialTasksSectionRef = useRef<HTMLDivElement>(null);
  
  // Modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isComprehensiveModalOpen, setIsComprehensiveModalOpen] = useState(false);
  const [leadsModalOpen, setLeadsModalOpen] = useState(false);
  const [modalLeads, setModalLeads] = useState<Lead[]>([]);
  const [modalTitle, setModalTitle] = useState("");
  const [followUpsModalOpen, setFollowUpsModalOpen] = useState(false);
  const [specialTasksModalOpen, setSpecialTasksModalOpen] = useState(false);

  // Function to open leads modal with filtered leads
  const openLeadsModal = (stage: string, title: string) => {
    const filteredLeads = newLeads.filter((lead: Lead) => lead.stage === stage);
    setModalLeads(filteredLeads);
    setModalTitle(title);
    setLeadsModalOpen(true);
  };

  // Filter state for leads
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("all");

  // Pagination state for leads
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage] = useState(10);

  // Helper function to format status text properly
  const formatStatusText = (status: string) => {
    if (!status) return "";
    
    // Handle special cases
    const statusMap: Record<string, string> = {
      "Not contacted": "Not Contacted",
      "Qualified": "Qualified",
      "Not interested": "Not Interested",
      "Interested": "Interested",
      "To be nurtured": "To be Nurtured",
      "Junk": "Junk",
      "Ask to call back": "Ask to Call Back",
      "Attempt to contact": "Attempt to contact",
      "Did not Connect": "Did not Connect",
      "Customer": "Customer",
      "Other Language": "Other Language"
    };
    
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Get filtered and paginated leads
  const getFilteredLeads = () => {
    const filtered = newLeads.filter(lead => 
      leadStatusFilter === "all" || lead.stage === leadStatusFilter
    );
    return filtered;
  };

  const getPaginatedLeads = () => {
    const filtered = getFilteredLeads();
    const startIndex = (currentPage - 1) * leadsPerPage;
    const endIndex = startIndex + leadsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const totalFilteredLeads = getFilteredLeads().length;
  const totalPages = Math.ceil(totalFilteredLeads / leadsPerPage);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [leadStatusFilter]);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      window.location.href = "/login";
      return;
    }
    setUser(u);
  }, []);

  // Listen for page visibility changes to detect when user returns from a call
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to the page, check if there's a called lead
        const storedCalledLead = sessionStorage.getItem('calledLead');
        if (storedCalledLead) {
          try {
            const lead = JSON.parse(storedCalledLead);
            // Show modal after a short delay
            setTimeout(() => {
              setSelectedLead(lead);
              setIsModalOpen(true);
              // Clear the stored lead after showing modal
              sessionStorage.removeItem('calledLead');
            }, 500); // Reduced delay for better responsiveness
          } catch (error) {
            console.error('Failed to parse stored called lead:', error);
            sessionStorage.removeItem('calledLead');
          }
        }
      }
    };

    // Check if there's a called lead in sessionStorage on page load
    const storedCalledLead = sessionStorage.getItem('calledLead');
    if (storedCalledLead) {
      try {
        const lead = JSON.parse(storedCalledLead);
        // Show modal after a delay
        setTimeout(() => {
          setSelectedLead(lead);
          setIsModalOpen(true);
          // Clear the stored lead after showing modal
          sessionStorage.removeItem('calledLead');
        }, 1000); // 1 second delay on page load
      } catch (error) {
        console.error('Failed to parse stored called lead:', error);
        sessionStorage.removeItem('calledLead');
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Remove dependency array to run only once

  const ownerIdEmail = user?.email || "";
  const ownerIdCode = user?.code || "";
  const ownerId = ownerIdEmail || ownerIdCode;
  const ownerName = user?.name || "";

  // Function to scroll to leads section
  const scrollToLeadsSection = () => {
    leadsSectionRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
    
    // Add a subtle highlight effect
    if (leadsSectionRef.current) {
      leadsSectionRef.current.style.transition = 'all 0.3s ease';
      leadsSectionRef.current.style.transform = 'scale(1.02)';
      leadsSectionRef.current.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      
      setTimeout(() => {
        if (leadsSectionRef.current) {
          leadsSectionRef.current.style.transform = 'scale(1)';
          leadsSectionRef.current.style.boxShadow = '';
        }
      }, 300);
    }
  };

  // Function to scroll to follow-ups section
  const scrollToFollowUpsSection = () => {
    followUpsSectionRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
    
    // Add a subtle highlight effect
    if (followUpsSectionRef.current) {
      followUpsSectionRef.current.style.transition = 'all 0.3s ease';
      followUpsSectionRef.current.style.transform = 'scale(1.02)';
      followUpsSectionRef.current.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      
      setTimeout(() => {
        if (followUpsSectionRef.current) {
          followUpsSectionRef.current.style.transform = 'scale(1)';
          followUpsSectionRef.current.style.boxShadow = '';
        }
      }, 300);
    }
  };

  // Function to scroll to tasks section
  const scrollToSpecialTasksSection = () => {
    specialTasksSectionRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
    
    // Add a subtle highlight effect
    if (specialTasksSectionRef.current) {
      specialTasksSectionRef.current.style.transition = 'all 0.3s ease';
      specialTasksSectionRef.current.style.transform = 'scale(1.02)';
      specialTasksSectionRef.current.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      
      setTimeout(() => {
        if (specialTasksSectionRef.current) {
          specialTasksSectionRef.current.style.transform = 'scale(1)';
          specialTasksSectionRef.current.style.boxShadow = '';
        }
      }, 300);
    }
  };

  // Function to handle call initiation
  const handleCallInitiated = (lead: Lead) => {
    // Store the called lead in sessionStorage
    sessionStorage.setItem('calledLead', JSON.stringify(lead));
  };



  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    const qsEmail = ownerIdEmail ? `ownerId=${encodeURIComponent(ownerIdEmail)}&ownerName=${encodeURIComponent(ownerName)}` : "";
    const qsCode = ownerIdCode && ownerIdCode !== ownerIdEmail ? `ownerId=${encodeURIComponent(ownerIdCode)}&ownerName=${encodeURIComponent(ownerName)}` : "";

    // Build fetches for due-calls and today (email + code if available)
    const dueCallsFetches: Promise<any>[] = [];
    const todayFetches: Promise<any>[] = [];
    const tlTasksFetches: Promise<any>[] = [];

    if (qsEmail) {
      dueCallsFetches.push(fetch(`/api/tasks/due-calls?${qsEmail}`).then((r) => r.json()));
      todayFetches.push(fetch(`/api/tasks/today?${qsEmail}`).then((r) => r.json()));
      tlTasksFetches.push(fetch(`/api/tl/tasks?ownerId=${encodeURIComponent(ownerIdEmail)}`).then((r) => r.json()));
    }
    if (qsCode) {
      dueCallsFetches.push(fetch(`/api/tasks/due-calls?${qsCode}`).then((r) => r.json()));
      todayFetches.push(fetch(`/api/tasks/today?${qsCode}`).then((r) => r.json()));
      tlTasksFetches.push(fetch(`/api/tl/tasks?ownerId=${encodeURIComponent(ownerIdCode)}`).then((r) => r.json()));
    }

    // Execute in parallel
    const [dueResults, todayResults, tlTaskResults] = await Promise.all([
      Promise.all(dueCallsFetches),
      Promise.all(todayFetches),
      Promise.all(tlTasksFetches),
    ]);

    // Merge and dedupe by task.id for due calls and follow-ups
    const mergedDue: Array<{ task: TaskRow; lead: Lead }> = [];
    const dueSeen = new Set<number>();
    for (const res of dueResults) {
      const rows = Array.isArray(res?.rows) ? res.rows : [];
      for (const row of rows) {
        const id = row?.task?.id;
        if (typeof id === "number" && !dueSeen.has(id)) {
          dueSeen.add(id);
          mergedDue.push(row);
        }
      }
    }
    setDueCalls(mergedDue);

    const mergedFollowUps: Array<{ task: TaskRow; lead: Lead }> = [];
    const fuSeen = new Set<number>();
    let mergedNewLeads: Lead[] = [];
    for (const res of todayResults) {
      const followUps = Array.isArray(res?.followUps) ? res.followUps : [];
      const newLeadsPart = Array.isArray(res?.newLeads) ? res.newLeads : [];
      for (const row of followUps) {
        const id = row?.task?.id;
        if (typeof id === "number" && !fuSeen.has(id)) {
          fuSeen.add(id);
          mergedFollowUps.push(row);
        }
      }
      // Merge leads by phone
      const phoneSeen = new Set(mergedNewLeads.map((l) => l.phone));
      for (const lead of newLeadsPart) {
        if (!phoneSeen.has(lead.phone)) {
          phoneSeen.add(lead.phone);
          mergedNewLeads.push(lead);
        }
      }
    }
    setFollowUps(mergedFollowUps);

    // tl/tasks merged and filter tasks for current user (match either email or code)
    let allTlRows: any[] = [];
    for (const res of tlTaskResults) {
      const rows = Array.isArray(res?.rows) ? res.rows : [];
      allTlRows = allTlRows.concat(rows);
    }
    const special = allTlRows.filter((task: any) =>
      (task.ownerId === ownerIdEmail || task.ownerId === ownerIdCode) && task.type === "OTHER" && task.status === "OPEN"
    );
    setSpecialTasks(special);

    // If no new leads yet, try tl/leads with both identifiers
    if ((!Array.isArray(mergedNewLeads) || mergedNewLeads.length === 0) && (ownerIdEmail || ownerIdCode)) {
      try {
        const leadFetches: Promise<any>[] = [];
        if (ownerIdEmail) leadFetches.push(fetch(`/api/tl/leads?owner=${encodeURIComponent(ownerIdEmail)}&limit=200`).then((r) => r.json()));
        if (ownerIdCode && ownerIdCode !== ownerIdEmail) leadFetches.push(fetch(`/api/tl/leads?owner=${encodeURIComponent(ownerIdCode)}&limit=200`).then((r) => r.json()));
        const leadResults = await Promise.all(leadFetches);
        let combined: Lead[] = [];
        for (const r of leadResults) {
          const rows = Array.isArray(r?.rows) ? r.rows : [];
          const seen = new Set(combined.map((l) => l.phone));
          for (const l of rows) {
            if (!seen.has(l.phone)) {
              seen.add(l.phone);
              combined.push(l);
            }
          }
        }
        mergedNewLeads = combined;
      } catch {}
    }
    setNewLeads(mergedNewLeads);
    setLoading(false);
  }, [ownerId, ownerIdEmail, ownerIdCode, ownerName]);

  useEffect(() => { load(); }, [load]);

  const openLeadModal = (lead: Lead) => {
    setSelectedLead(lead);
    setIsComprehensiveModalOpen(true); // Open comprehensive modal
  };

  const closeLeadModal = () => {
    setIsComprehensiveModalOpen(false);
    setSelectedLead(null);
  };
  
  const openActivityLog = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true); // Open activity log modal
  };

  const closeActivityLog = () => {
    setIsModalOpen(false);
    setSelectedLead(null);
  };

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
          <Button
            asChild
            variant="outline"
            className="flex items-center gap-2"
          >
            <a href="/dashboard">
            <ArrowLeft size={16} />
            Back to Dashboard
          </a>
          </Button>
        </div>
{/* Stats Cards */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setSpecialTasksModalOpen(true)}>
            <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks</p>
                  <p className="text-3xl font-bold text-blue-600">
                  {specialTasks.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Star size={24} className="text-blue-600" />
              </div>
            </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => openLeadsModal("Not contacted", "Not Contacted Leads")}>
            <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Not Contacted</p>
                  <p className="text-3xl font-bold text-emerald-600">
                  {newLeads.filter(lead => lead.stage === "Not contacted").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Clock size={24} className="text-red-600" />
              </div>
            </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setFollowUpsModalOpen(true)}>
            <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Follow-ups</p>
                  <p className="text-3xl font-bold text-amber-600">
                  {followUps.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <RotateCcw size={24} className="text-amber-600" />
              </div>
            </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => openLeadsModal("Ask to call back", "Ask to Call Back Leads")}>
            <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ask to call back</p>
                  <p className="text-3xl font-bold text-emerald-600">
                 {newLeads.filter(lead => lead.stage === "Ask to call back").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <PhoneCall size={24} className="text-emerald-600" />
              </div>
            </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => openLeadsModal("Qualified", "Qualified Leads")}>
            <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Qualified</p>
                  <p className="text-3xl font-bold text-emerald-600">
                  {newLeads.filter(lead => lead.stage === "Qualified").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-xl transition-shadow" onClick={() => openLeadsModal("Interested", "Interested Leads")}>
            <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Interested</p>
                  <p className="text-3xl font-bold text-emerald-600">
                 {newLeads.filter(lead => lead.stage === "Interested").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Heart size={24} className="text-purple-600" />
              </div>
            </div>
            </CardContent>
          </Card>
        </div>

        

        {/* Tasks Section */}
        <section className="mb-8" ref={specialTasksSectionRef}>
          <SectionHeader icon={ListTodo} title="Tasks" count={specialTasks.length} color="blue" />
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                <CheckCircle2 size={20} className="text-blue-600 mr-2" />
                Tasks
              </h4>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading tasks...</p>
                </div>
              ) : specialTasks.length === 0 ? (
                <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-600">
                  No tasks assigned yet.
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
                        <Button
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
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Complete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Due Calls Section
        <section className="mb-8">
          <SectionHeader icon={Clock} title="Due Calls (Yesterday)" count={dueCalls.length} color="blue" />
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-red-200 p-8 text-center shadow-lg">
                <div className="animate-spin w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-red-700 font-semibold">Loading due calls...</p>
                <p className="text-red-600/80 text-sm mt-2">Checking overdue items</p>
              </div>
            ) : dueCalls.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-emerald-200 p-12 text-center shadow-lg">
                <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <CheckCircle2 size={32} className="text-emerald-700" />
                </div>
                <h3 className="text-gray-800 font-bold text-lg mb-2">All caught up!</h3>
                <p className="text-gray-600">Great job staying on top of your calls</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dueCalls.map(({ task, lead }) => (
                  <div key={task.id} className="group bg-white/95 backdrop-blur-sm rounded-2xl border border-red-100 p-6 shadow-lg hover:shadow-xl hover:border-red-300 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-full w-12 h-12 flex items-center justify-center shadow-sm">
                          <Clock size={20} className="text-red-700" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg mb-1">{task.title || 'Call'}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <button
                              onClick={() => openLeadModal(lead)}
                              className="text-left"
                            >
                              <span className="font-medium hover:text-red-700 transition-colors cursor-pointer">
                                {lead?.name || lead?.phone || 'Lead'}
                              </span>
                            </button>
                            {lead?.phone && (
                              <a href={`/team-leader/lead-management/leads/${encodeURIComponent(lead.phone)}`} 
                                 className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors font-medium">
                                <Phone size={12} />
                                {lead.phone}
                              </a>
                            )}
                          </div>
                          {task.dueAt && (
                            <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                              <Clock size={12} />
                              Due: {new Date(task.dueAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-red-600 bg-red-100 px-3 py-1.5 rounded-full font-bold border border-red-200">
                        Overdue
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section> */}

        {/* Follow-ups Section */}
        <section className="mb-8" ref={followUpsSectionRef}>
          <SectionHeader icon={Calendar} title="Today's Follow-ups" count={followUps.length} color="amber" />
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200 p-8 text-center shadow-lg">
                <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-amber-700 font-semibold">Loading follow-ups...</p>
                <p className="text-amber-600/80 text-sm mt-2">Checking today's schedule</p>
              </div>
            ) : followUps.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-12 text-center shadow-lg">
                <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Calendar size={32} className="text-amber-700" />
                </div>
                <h3 className="text-gray-800 font-bold text-lg mb-2">No follow-ups scheduled</h3>
                <p className="text-gray-600">Your schedule is clear for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {followUps.map(({ task, lead }) => (
                  <div key={task.id} className="group bg-white/95 backdrop-blur-sm rounded-2xl border border-amber-100 p-6 shadow-lg hover:shadow-xl hover:border-amber-300 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-full w-12 h-12 flex items-center justify-center shadow-sm">
                          <Calendar size={20} className="text-amber-700" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg mb-1">{task.title || 'Follow-up'}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <button
                              onClick={() => openLeadModal(lead)}
                              className="text-left"
                            >
                              <span className="font-medium hover:text-amber-700 transition-colors cursor-pointer">
                                {lead?.name || lead?.phone || 'Lead'}
                              </span>
                            </button>
                            {lead?.phone && (
                              <a href={`/team-leader/lead-management/leads/${encodeURIComponent(lead.phone)}`} 
                                 className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors font-medium">
                                <Phone size={12} />
                                {lead.phone}
                              </a>
                            )}
                          </div>
                          {task.dueAt && (
                            <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                              <Calendar size={12} />
                              Due: {new Date(task.dueAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-amber-600 bg-amber-100 px-3 py-1.5 rounded-full font-bold border border-amber-200">
                        Today
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* New Leads Section */}
        <section className="mb-8" ref={leadsSectionRef}>
          <SectionHeader icon={UserPlus} title="New Leads" count={newLeads.length} color="emerald" />
          
          {/* Filter Controls */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  className="px-3 py-2 text-black border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full sm:w-auto"
                >
                  <option value="all">All Statuses</option>
                  <option value="Not contacted">Not contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Not interested">Not Interested</option>
                  <option value="Interested">Interested</option>
                  <option value="To be nurtured">To be Nurtured</option>
                  <option value="Junk">Junk</option>
                  <option value="Ask to call back">Ask to Call Back</option>
                  <option value="Attempt to contact">Attempt to contact</option>
                  <option value="Did not Connect">Did not Connect</option>
                  <option value="Customer">Customer</option>
                  <option value="Other Language">Other Language</option>
                </select>
              </div>
              <div className="text-sm text-gray-600 text-center sm:text-right">
                Showing {totalFilteredLeads} of {newLeads.length} leads
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-200 p-8 text-center shadow-lg">
                <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-emerald-700 font-semibold">Loading new leads...</p>
                <p className="text-emerald-600/80 text-sm mt-2">Fetching your assigned opportunities</p>
              </div>
            ) : getPaginatedLeads().length === 0 ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-12 text-center shadow-lg">
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <UserPlus size={32} className="text-gray-700" />
                </div>
                <h3 className="text-gray-800 font-bold text-lg mb-2">No leads assigned yet</h3>
                <p className="text-gray-600">New opportunities will appear here when assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getPaginatedLeads().map((lead) => (
                  <div key={lead.phone} className="group bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100 p-4 sm:p-6 shadow-lg hover:shadow-xl hover:border-emerald-300 transition-all duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div 
                        className="flex items-start space-x-3 sm:space-x-4 flex-1 cursor-pointer"
                        onClick={() => openLeadModal(lead)}
                      >
                        <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-sm flex-shrink-0">
                          <UserPlus size={16} className="text-emerald-700 sm:w-5 sm:h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-base sm:text-lg mb-2 sm:mb-1 hover:text-emerald-700 transition-colors break-words">
                              {lead.name || lead.phone}
                            </h4>
                          <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600">
                            {lead.phone && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1 bg-blue-100 text-blue-700 rounded-full font-medium text-xs">
                                <Phone size={12} />
                                {lead.phone}
                              </span>
                            )}
                            {lead.source && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1 bg-purple-100 text-purple-700 rounded-full font-medium text-xs">
                                <Funnel size={12} />
                                {lead.source}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-center sm:justify-end">
                        <span className={`text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold border ${
                          !lead.stage || lead.stage === "Not contacted" 
                            ? "text-gray-600 bg-gray-100 border-gray-200"
                            : lead.stage === "Qualified" || lead.stage === "Interested" || lead.stage === "To be nurtured" || lead.stage === "Ask to call back"
                            ? "text-blue-600 bg-blue-100 border-blue-200"
                            : lead.stage === "Customer"
                            ? "text-green-600 bg-green-100 border-green-200"
                            : lead.stage === "Not interested" || lead.stage === "Junk" || lead.stage === "Attempt to contact" || lead.stage === "Did not Connect" || lead.stage === "Other Language"
                            ? "text-red-600 bg-red-100 border-red-200"
                            : "text-amber-600 bg-amber-100 border-amber-200"
                        }`}>
                          {!lead.stage || lead.stage === "Not contacted" ? "Not Contacted" : formatStatusText(lead.stage)}
                        </span>
                        
                        {/* Three-dot menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                openActivityLog(lead);
                              }}
                            >
                              <Edit3 size={14} className="mr-2" />
                              Log Activity
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* No results message when filter returns empty */}
                {getFilteredLeads().length === 0 && leadStatusFilter !== "all" && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-8 text-center shadow-lg">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-inner">
                      <Target size={24} className="text-gray-600" />
                    </div>
                    <h3 className="text-gray-800 font-bold text-lg mb-2">No leads found</h3>
                    <p className="text-gray-600">No leads match the selected status filter</p>
                    <Button
                      onClick={() => setLeadStatusFilter("all")}
                      className="mt-3 bg-emerald-600 hover:bg-emerald-700"
                      size="sm"
                    >
                      Show All Leads
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-gray-600 text-center sm:text-left">
                    Page {currentPage} of {totalPages} • Showing {((currentPage - 1) * leadsPerPage) + 1} to {Math.min(currentPage * leadsPerPage, totalFilteredLeads)} of {totalFilteredLeads} leads
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className={currentPage === pageNum ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Comprehensive Lead Card Modal - Opened when clicking on lead */}
      <ComprehensiveLeadModal
        lead={selectedLead}
        isOpen={isComprehensiveModalOpen}
        onClose={closeLeadModal}
      />

      {/* Activity Log Modal - Opened from three-dot menu */}
      <ActivityLogModal
        lead={selectedLead}
        isOpen={isModalOpen}
        onClose={closeActivityLog}
        onStatusUpdate={load}
        onCallInitiated={handleCallInitiated}
      />

      {/* Leads List Modal */}
      <Dialog open={leadsModalOpen} onOpenChange={setLeadsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>

            {/* Leads List */}
          <div className="space-y-3">
              {modalLeads.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No leads found for this stage.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modalLeads.map((lead) => (
                    <div key={lead.phone} className="group bg-white/95 backdrop-blur-sm rounded-2xl border border-emerald-100 p-4 shadow-lg hover:shadow-xl hover:border-emerald-300 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-start space-x-4 flex-1 cursor-pointer"
                              onClick={() => {
                                setSelectedLead(lead);
                            setIsComprehensiveModalOpen(true);
                                setLeadsModalOpen(false);
                              }}
                        >
                          <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full w-12 h-12 flex items-center justify-center shadow-sm flex-shrink-0">
                            <UserPlus size={16} className="text-emerald-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-lg mb-1 hover:text-emerald-700 transition-colors">
                                {lead.name || lead.phone}
                              </h4>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium text-xs">
                                <Phone size={12} />
                                {lead.phone}
                              </span>
                              {lead.source && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium text-xs">
                                  <Funnel size={12} />
                                  {lead.source}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              const phoneNumber = lead.phone?.replace(/\D/g, '');
                              const whatsappUrl = `https://wa.me/${phoneNumber}`;
                              window.open(whatsappUrl, '_blank');
                            }}
                            variant="ghost"
                            size="sm"
                            className="bg-green-100 text-green-700 hover:bg-green-200"
                            title="Open WhatsApp"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </DialogContent>
      </Dialog>

      {/* Follow-ups Modal */}
      <Dialog open={followUpsModalOpen} onOpenChange={setFollowUpsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Follow-up Tasks</DialogTitle>
          </DialogHeader>

            {/* Follow-ups List */}
          <div className="space-y-3">
              {followUps.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No follow-up tasks found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followUps.map((item) => (
                    <div key={item.task.id} className="group bg-white/95 backdrop-blur-sm rounded-2xl border border-amber-100 p-4 shadow-lg hover:shadow-xl hover:border-amber-300 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-start space-x-4 flex-1 cursor-pointer"
                              onClick={() => {
                                setSelectedLead(item.lead);
                            setIsComprehensiveModalOpen(true);
                                setFollowUpsModalOpen(false);
                              }}
                        >
                          <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-full w-12 h-12 flex items-center justify-center shadow-sm flex-shrink-0">
                            <Clock size={16} className="text-amber-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-lg mb-1 hover:text-amber-700 transition-colors">
                                {item.lead.name || item.lead.phone}
                              </h4>
                            <p className="text-sm text-gray-600 mb-2">{item.task.title}</p>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                              <a 
                                href={`tel:${item.lead.phone}`} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCallInitiated(item.lead);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors font-medium text-xs"
                              >
                                <Phone size={12} />
                                {item.lead.phone}
                              </a>
                              {item.task.dueAt && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium text-xs">
                                  <Clock size={12} />
                                  Due: {new Date(item.task.dueAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              const phoneNumber = item.lead.phone?.replace(/\D/g, '');
                              const whatsappUrl = `https://wa.me/${phoneNumber}`;
                              window.open(whatsappUrl, '_blank');
                            }}
                            variant="ghost"
                            size="sm"
                            className="bg-green-100 text-green-700 hover:bg-green-200"
                            title="Open WhatsApp"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </DialogContent>
      </Dialog>

      {/* Tasks Modal */}
      <Dialog open={specialTasksModalOpen} onOpenChange={setSpecialTasksModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tasks</DialogTitle>
          </DialogHeader>

            {/* Tasks List */}
          <div className="space-y-3">
              {specialTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No tasks found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {specialTasks.map((task) => (
                    <div key={task.id} className="group bg-white/95 backdrop-blur-sm rounded-2xl border border-blue-100 p-4 shadow-lg hover:shadow-xl hover:border-blue-300 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full w-12 h-12 flex items-center justify-center shadow-sm flex-shrink-0">
                            <ListTodo size={16} className="text-blue-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-lg mb-1">
                              {task.title}
                            </h4>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                              {task.type && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium text-xs">
                                  <Target size={12} />
                                  {task.type}
                                </span>
                              )}
                              {task.priority && (
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-medium text-xs ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  <Star size={12} />
                                  {task.priority}
                                </span>
                              )}
                              {task.dueAt && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium text-xs">
                                  <Clock size={12} />
                                  Due: {new Date(task.dueAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
