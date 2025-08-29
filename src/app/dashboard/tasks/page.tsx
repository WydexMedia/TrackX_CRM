"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { 
  Clock, 
  Users, 
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
  Funnel
} from "lucide-react";

function getUser() {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

type Lead = { phone: string; name?: string | null; source?: string | null; stage?: string | null };
type TaskRow = { id: number; leadPhone: string; title: string; status: string; type?: string | null; dueAt?: string | null; priority?: string | null; ownerId?: string | null };

// Lead details modal component
function LeadDetailsModal({ 
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
  const [events, setEvents] = useState<any[]>([]);

  // Available stages - customized for business needs
  const availableStages = [
    "Not contacted",
    "Qualified",
    "Not interested",
    "Interested",
    "To be nurtured",
    "Junk",
    "Ask to call back",
    "Did not Pickup",
    "Did not Connect",
    "Customer",
    "Other Language"
  ];

  useEffect(() => {
    if (lead && isOpen) {
      setStage(lead.stage || "");
      setNeedFollowup("no");
      setFollowupDate("");
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
        setEvents(data.events || []);
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
        actorId: getUser()?.code || "system"
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
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
          <h2 className="text-xl font-bold text-gray-900">Lead Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-105"
          >
            <X size={20} className="text-red-500 hover:text-red-600" />
          </button>
        </div>

        {/* Lead Information */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50/70 backdrop-blur-sm rounded-lg border border-gray-200/30 hover:bg-gray-50/90 transition-all duration-200">
                <UserPlus size={16} className="text-gray-500" />
                <span className="text-gray-900">{lead.name || "Not provided"}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50/70 backdrop-blur-sm rounded-lg border border-gray-200/30 hover:bg-gray-50/90 transition-all duration-200">
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
                              <div className="flex items-center gap-2 p-3 bg-gray-50/70 backdrop-blur-sm rounded-lg border border-gray-200/30 hover:bg-gray-50/90 transition-all duration-200">
                <Mail size={16} className="text-gray-500" />
                <span className="text-gray-900">{leadDetails.email}</span>
              </div>
              </div>
            )}

            {lead.source && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Source</label>
                              <div className="flex items-center gap-2 p-3 bg-gray-50/70 backdrop-blur-sm rounded-lg border border-gray-200/30 hover:bg-gray-50/90 transition-all duration-200">
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
                  <input
                    type="date"
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    className="w-full p-3 text-black border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200 hover:border-gray-400/70"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={stageNotes}
                  onChange={(e) => setStageNotes(e.target.value)}
                  placeholder="Add notes about this status change..."
                  rows={3}
                  className="w-full text-black p-3 border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200 hover:border-gray-400/70 resize-none"
                />
              </div>

            </div>

            <button
              onClick={handleStatusUpdate}
              disabled={!stage || isLoading || (needFollowup === "yes" && !followupDate)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
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
            </button>
          </div>

          {/* Activity Timeline */}
          {/* {events.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Activity size={20} className="text-green-600" />
                Activity Timeline
              </h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {events.map((event, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50/70 backdrop-blur-sm rounded-lg border border-gray-200/30 hover:bg-gray-50/90 transition-all duration-200">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mt-2 flex-shrink-0 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {event.type === "STAGE_CHANGE" && "Stage Changed"}
                          {event.type === "ASSIGNED" && "Lead Assigned"}
                          {event.type === "CREATED" && "Lead Created"}
                          {event.type === "CALL_COMPLETED" && "Call Completed"}
                          {event.type === "NOTE_ADDED" && "Note Added"}
                          {!["STAGE_CHANGE", "ASSIGNED", "CREATED", "CALL_COMPLETED", "NOTE_ADDED"].includes(event.type) && event.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.at).toLocaleString()}
                        </span>
                      </div>
                      
                      {event.data?.message && (
                        <p className="text-sm text-gray-600">{event.data.message}</p>
                      )}
                      
                      {event.data?.stageNotes && (
                        <p className="text-sm text-gray-500 italic mt-1">
                          "{event.data.stageNotes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )} */}
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
  const [specialTasks, setSpecialTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Refs for scrolling to different sections
  const leadsSectionRef = useRef<HTMLDivElement>(null);
  const followUpsSectionRef = useRef<HTMLDivElement>(null);
  const specialTasksSectionRef = useRef<HTMLDivElement>(null);
  
  // Modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  


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
      "Did not Pickup": "Did not Pickup",
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

  const ownerId = user?.code || "";
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

  // Function to scroll to special tasks section
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

  const openLeadModal = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const closeLeadModal = () => {
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
                <p 
                  className="text-3xl font-bold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                  onClick={() => {
                    setLeadStatusFilter("all");
                    scrollToSpecialTasksSection();
                  }}
                  title="Click to show all leads and scroll to special tasks section"
                >
                  {specialTasks.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ListTodo size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Not Contacted</p>
                <p 
                  className="text-3xl font-bold text-red-600 cursor-pointer hover:text-red-700 transition-colors"
                  onClick={() => {
                    setLeadStatusFilter("Not contacted");
                    scrollToLeadsSection();
                  }}
                  title="Click to show Not contacted leads and scroll to leads section"
                >
                  {newLeads.filter(lead => lead.stage === "Not contacted").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <UserPlus size={24} className="text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Follow-ups</p>
                <p 
                  className="text-3xl font-bold text-amber-600 cursor-pointer hover:text-amber-700 transition-colors"
                  onClick={() => {
                    setLeadStatusFilter("all");
                    scrollToFollowUpsSection();
                  }}
                  title="Click to show all leads and scroll to follow-ups section"
                >
                  {followUps.length}
                </p>
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
                <p 
                  className="text-3xl font-bold text-emerald-600 cursor-pointer hover:text-emerald-700 transition-colors"
                  onClick={() => {
                    setLeadStatusFilter("all");
                    scrollToLeadsSection();
                  }}
                  title="Click to show all leads and scroll to leads section"
                >
                  {newLeads.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <UserPlus size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Special Tasks Section */}
        <section className="mb-8" ref={specialTasksSectionRef}>
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
                  <option value="Did not Pickup">Did not Pickup</option>
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
                      <div className="flex items-start space-x-3 sm:space-x-4">
                        <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-sm flex-shrink-0">
                          <UserPlus size={16} className="text-emerald-700 sm:w-5 sm:h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => openLeadModal(lead)}
                            className="text-left w-full"
                          >
                            <h4 className="font-bold text-gray-900 text-base sm:text-lg mb-2 sm:mb-1 hover:text-emerald-700 transition-colors cursor-pointer break-words">
                              {lead.name || lead.phone}
                            </h4>
                          </button>
                          <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600">
                            {lead.phone && (
                              <a 
                                href={`tel:${lead.phone}`} 
                                onClick={() => handleCallInitiated(lead)}
                                className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors font-medium text-xs"
                              >
                                <Phone size={12} />
                                {lead.phone}
                              </a>
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
                      <div className="flex justify-center sm:justify-end">
                        <span className={`text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-bold border ${
                          !lead.stage || lead.stage === "Not contacted" 
                            ? "text-gray-600 bg-gray-100 border-gray-200"
                            : lead.stage === "Qualified" || lead.stage === "Interested" || lead.stage === "To be nurtured" || lead.stage === "Ask to call back"
                            ? "text-blue-600 bg-blue-100 border-blue-200"
                            : lead.stage === "Customer"
                            ? "text-green-600 bg-green-100 border-green-200"
                            : lead.stage === "Not interested" || lead.stage === "Junk" || lead.stage === "Did not Pickup" || lead.stage === "Did not Connect" || lead.stage === "Other Language"
                            ? "text-red-600 bg-red-100 border-red-200"
                            : "text-amber-600 bg-amber-100 border-amber-200"
                        }`}>
                          {!lead.stage || lead.stage === "Not contacted" ? "Not Contacted" : formatStatusText(lead.stage)}
                        </span>
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
                    <button
                      onClick={() => setLeadStatusFilter("all")}
                      className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                      Show All Leads
                    </button>
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
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    
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
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                              currentPage === pageNum
                                ? "bg-emerald-600 text-white"
                                : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Lead Details Modal */}
      <LeadDetailsModal
        lead={selectedLead}
        isOpen={isModalOpen}
        onClose={closeLeadModal}
        onStatusUpdate={load}
        onCallInitiated={handleCallInitiated}
      />
    </div>
  );
}
