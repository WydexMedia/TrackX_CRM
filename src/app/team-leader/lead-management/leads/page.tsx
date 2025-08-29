"use client";

import { useEffect, useMemo, useState } from "react";
import { AddLeadModal, ImportLeadsModal } from "./AddLeadModals";
import toast from "react-hot-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { 
  Clipboard, 
  RotateCcw, 
  Phone, 
  CheckCircle, 
  Lightbulb, 
  Clock, 
  Sparkles, 
  Mail, 
  Crown, 
  Facebook, 
  Search, 
  Star,
  Filter,
  Plus,
  Upload,
  ChevronLeft,
  ChevronRight,
  Pin,
  Users,
  Globe,
  FileText
} from "lucide-react";

interface LeadRow {
  phone: string;
  name: string | null;
  email: string | null;
  source: string | null;
  utm: Record<string, string> | null;
  stage: string;
  ownerId: string | null;
  score: number | null;
  lastActivityAt: string | null;
  createdAt: string | null;
  callCount?: number;
}

interface ListView {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  filters: {
    stage?: string;
    owner?: string;
    source?: string;
    needFollowup?: boolean;
    hasEmail?: boolean;
    lastActivity?: string;
    dateRange?: string;
    scoreMin?: string;
    scoreMax?: string;
  };
  count?: number;
}

export default function LeadsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [sales, setSales] = useState<Array<{ code: string; name: string }>>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [assignee, setAssignee] = useState<string>("");
  const [autoAssigning, setAutoAssigning] = useState(false);
  
  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // List view management
  const [currentView, setCurrentView] = useState<string>("all");
  const [showCreateView, setShowCreateView] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [customViews, setCustomViews] = useState<ListView[]>([]);
  
  // Advanced filtering (restored)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    dateRange: "",
    scoreMin: "",
    scoreMax: "",
    priority: "",
    campaign: "",
    tags: "",
    lastActivity: "",
    slaStatus: "",
    needFollowup: "",
    hasEmail: "",
    emailDomain: "",
    excludeEarlyStages: false,
    sortByCallCount: false,
    callCountMin: "",
    callCountMax: "",
  });
  
  // Bulk actions
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("Follow up");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  // Predefined list views with Lucide icons
  const defaultViews: ListView[] = [
    { id: "all", name: "All Leads", icon: Clipboard, filters: {} },
    { id: "unassigned", name: "Unassigned", icon: RotateCcw, filters: { owner: "unassigned" } },
    { id: "not-contacted", name: "Not Contacted", icon: Phone, filters: { stage: "Not contacted" } },
    { id: "qualified", name: "Qualified", icon: CheckCircle, filters: { stage: "Qualified" } },
    { id: "interested", name: "Interested", icon: Lightbulb, filters: { stage: "Interested" } },
    { id: "follow-up", name: "Follow Up", icon: Clock, filters: { needFollowup: true } },
    { id: "recent", name: "Recent (7 days)", icon: Sparkles, filters: { dateRange: "last7days" } },
    { id: "no-email", name: "No Email", icon: Mail, filters: { hasEmail: false } },
    { id: "customers", name: "Customers", icon: Crown, filters: { stage: "Customer" } },
  
  ];

  const allViews = [...defaultViews, ...customViews];
  const currentViewData = allViews.find(v => v.id === currentView) || defaultViews[0];

  const params = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    
    // Apply current view filters
    const filters = currentViewData.filters;
    if (filters.stage) sp.set("stage", filters.stage);
    if (filters.owner) sp.set("owner", filters.owner);
    if (filters.source) sp.set("source", filters.source);
    if (filters.needFollowup !== undefined) sp.set("needFollowup", String(filters.needFollowup));
    if (filters.hasEmail !== undefined) sp.set("hasEmail", String(filters.hasEmail));
    if (filters.lastActivity) sp.set("lastActivity", filters.lastActivity);
    if (filters.dateRange) sp.set("dateRange", filters.dateRange);
    if (filters.scoreMin) sp.set("scoreMin", filters.scoreMin);
    if (filters.scoreMax) sp.set("scoreMax", filters.scoreMax);
    
    // Apply advanced filters when enabled
    if (showAdvancedFilters) {
      if (advancedFilters.dateRange) sp.set("dateRange", advancedFilters.dateRange);
      if (advancedFilters.scoreMin) sp.set("scoreMin", advancedFilters.scoreMin);
      if (advancedFilters.scoreMax) sp.set("scoreMax", advancedFilters.scoreMax);
      if (advancedFilters.lastActivity) sp.set("lastActivity", advancedFilters.lastActivity);
      if (advancedFilters.needFollowup) sp.set("needFollowup", advancedFilters.needFollowup);
      if (advancedFilters.hasEmail) sp.set("hasEmail", advancedFilters.hasEmail);
      if (advancedFilters.emailDomain) sp.set("emailDomain", advancedFilters.emailDomain);
      if (advancedFilters.excludeEarlyStages) sp.set("excludeEarlyStages", "true");
      if (advancedFilters.sortByCallCount) sp.set("sortByCallCount", "true");
      if (advancedFilters.callCountMin) sp.set("callCountMin", advancedFilters.callCountMin);
      if (advancedFilters.callCountMax) sp.set("callCountMax", advancedFilters.callCountMax);
    }
    
    sp.set("limit", String(pageSize));
    sp.set("offset", String((page - 1) * pageSize));
    return sp.toString();
  }, [q, currentView, currentViewData, page, showAdvancedFilters, advancedFilters]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tl/leads?${params}`)
      .then((r) => r.json())
      .then((d) => { 
        setRows(d.rows || []); 
        setTotal(d.total || 0); 
      })
      .finally(() => setLoading(false));
  }, [params]);

  // Load salesperson list and preselect if owner is present in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const preOwner = sp.get("owner");
      if (preOwner) {
        // Find and set the appropriate view
        const ownerView = allViews.find(v => v.filters.owner === preOwner);
        if (ownerView) {
          setCurrentView(ownerView.id);
        } else {
          // Create a temporary custom view for this owner
          const ownerName = sales.find(s => s.code === preOwner)?.name || preOwner;
          setAdvancedFilters(prev => ({ ...prev, owner: preOwner }));
          setShowAdvancedFilters(true);
        }
      }
    }
    
    fetch("/api/users")
      .then((r) => r.json())
      .then((all) => {
        const onlySales = (Array.isArray(all) ? all : []).filter((u: any) => (u.role ?? 'sales') === "sales");
        setSales(onlySales.map((u: any) => ({ code: u.code, name: u.name })));
      })
      .catch(() => {});
  }, []);

  const phones = Object.keys(selected).filter((k) => selected[k]);

  const getActorId = () => {
    if (typeof window === 'undefined') return undefined;
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return parsed?.code as string | undefined;
    } catch {
      return undefined;
    }
  };

  const performBulkDelete = async () => {
    if (phones.length === 0) return;
    try {
      const res = await fetch("/api/tl/leads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phones }) });
      if (!res.ok) throw new Error("Failed to delete leads");
      toast.success("Deleted selected leads");
      setSelected({});
      refreshData();
    } catch {
      toast.error("Failed to delete leads");
    } finally {
      setConfirmDeleteOpen(false);
    }
  };

  const performCreateTasks = async () => {
    if (!taskTitle.trim() || !taskAssignee) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      setCreatingTask(true);
      const dueAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      
      const res = await fetch("/api/tl/queue", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          action: "bulkTask", 
          phones, 
          title: taskTitle,
          dueAt,
          ownerId: taskAssignee 
        }) 
      });
      
      if (res.ok) {
        const selectedAssignee = sales.find(s => s.code === taskAssignee);
        toast.success(`Tasks created and assigned to ${selectedAssignee?.name || taskAssignee}`);
        setSelected({});
        setCreateTaskOpen(false);
        setTaskTitle("Follow up");
        setTaskAssignee("");
        refreshData();
      } else {
        toast.error("Failed to create tasks");
      }
    } catch {
      toast.error("Failed to create tasks");
    } finally {
      setCreatingTask(false);
    }
  };

  const refreshData = () => {
    fetch(`/api/tl/leads?${params}`).then((r) => r.json()).then((d) => {
      setRows(d.rows || []);
      setTotal(d.total || 0);
    });
  };

  const createCustomView = () => {
    if (!newViewName.trim()) {
      toast.error("Please enter a view name");
      return;
    }
    
    const newView: ListView = {
      id: `custom-${Date.now()}`,
      name: newViewName,
      icon: Pin,
      filters: { 
        ...currentViewData.filters,
        ...(showAdvancedFilters ? {
          dateRange: advancedFilters.dateRange,
          scoreMin: advancedFilters.scoreMin,
          scoreMax: advancedFilters.scoreMax,
          lastActivity: advancedFilters.lastActivity,
        } : {})
      },
    };
    
    setCustomViews([...customViews, newView]);
    setCurrentView(newView.id);
    setShowCreateView(false);
    setNewViewName("");
    toast.success("Custom view created");
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      dateRange: "",
      scoreMin: "",
      scoreMax: "",
      priority: "",
      campaign: "",
      tags: "",
      lastActivity: "",
      slaStatus: "",
      needFollowup: "",
      hasEmail: "",
      emailDomain: "",
      excludeEarlyStages: false,
      sortByCallCount: false,
      callCountMin: "",
      callCountMax: "",
    });
  };

  const getActiveAdvancedFilterCount = () => {
    let count = 0;
    if (advancedFilters.dateRange) count++;
    if (advancedFilters.scoreMin || advancedFilters.scoreMax) count++;
    if (advancedFilters.priority) count++;
    if (advancedFilters.campaign) count++;
    if (advancedFilters.tags) count++;
    if (advancedFilters.lastActivity) count++;
    if (advancedFilters.slaStatus) count++;
    if (advancedFilters.needFollowup) count++;
    if (advancedFilters.hasEmail) count++;
    if (advancedFilters.emailDomain) count++;
    if (advancedFilters.excludeEarlyStages) count++;
    if (advancedFilters.callCountMin || advancedFilters.callCountMax) count++;
    return count;
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Customer": return "bg-green-100 text-green-800";
      case "Qualified": return "bg-blue-100 text-blue-800";
      case "Interested": return "bg-purple-100 text-purple-800";
      case "Not interested": return "bg-red-100 text-red-800";
      case "To be nurtured": return "bg-yellow-100 text-yellow-800";
      case "Not contacted": return "bg-gray-100 text-gray-800";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "META": return <Facebook className="w-4 h-4" />;
      case "GOOGLE": return <Search className="w-4 h-4" />;
      case "CSV": return <FileText className="w-4 h-4" />;
      case "WEBSITE": return <Globe className="w-4 h-4" />;
      case "REFERRAL": return <Users className="w-4 h-4" />;
      default: return <Clipboard className="w-4 h-4" />;
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "Customer": return <Crown className="w-4 h-4" />;
      case "Qualified": return <CheckCircle className="w-4 h-4" />;
      case "Interested": return <Lightbulb className="w-4 h-4" />;
      case "Not interested": return <Phone className="w-4 h-4" style={{ transform: 'rotate(135deg)' }} />;
      case "To be nurtured": return <Clock className="w-4 h-4" />;
      case "Not contacted": return <Phone className="w-4 h-4" />;
      default: return <Clipboard className="w-4 h-4" />;
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-gray-50">
      {/* Collapsible Sidebar with List Views */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed && (
              <h1 className="text-xl font-semibold text-gray-900">Lead Lists</h1>
            )}
            <div className="flex gap-1">
              {!sidebarCollapsed && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`p-2 rounded-lg text-sm ${showAdvancedFilters ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                      >
                        <Filter className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                      <p className="font-medium">Advanced Filters</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowCreateView(true)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                      <p className="font-medium">Create custom view</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                  <p className="font-medium">{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {/* Advanced Filters Toggle */}
          {!sidebarCollapsed && showAdvancedFilters && getActiveAdvancedFilterCount() > 0 && (
            <div className="mb-3 flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
              <span className="text-sm text-blue-700 font-medium">
                {getActiveAdvancedFilterCount()} advanced filter{getActiveAdvancedFilterCount() > 1 ? 's' : ''} active
              </span>
              <button
                onClick={clearAdvancedFilters}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            </div>
          )}
          
          {/* Search */}
          {!sidebarCollapsed && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search leads..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* List Views */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="space-y-1">
              {allViews.map((view) => {
                const IconComponent = view.icon;
                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={view.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            setCurrentView(view.id);
                            setPage(1);
                            setSelected({});
                          }}
                          className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2'} text-sm rounded-lg transition-colors ${
                            currentView === view.id
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className={`flex items-center ${sidebarCollapsed ? '' : 'gap-3'}`}>
                            <IconComponent className="w-4 h-4 flex-shrink-0" />
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                        <p className="font-medium">{view.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return (
                  <button
                    key={view.id}
                    onClick={() => {
                      setCurrentView(view.id);
                      setPage(1);
                      setSelected({});
                    }}
                    className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2'} text-sm rounded-lg transition-colors ${
                      currentView === view.id
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`flex items-center ${sidebarCollapsed ? '' : 'gap-3'}`}>
                      <IconComponent className="w-5 h-5 flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="font-medium">{view.name}</span>
                      )}
                    </div>
                    {!sidebarCollapsed && view.count !== undefined && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {view.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-2">
            {sidebarCollapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className={`w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-center gap-2'}`}
                      onClick={() => setShowAdd(true)}
                    >
                      <span className="inline-flex text-white">
                        <Plus className="w-4 h-4 stroke-white" strokeWidth={2.5} />
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                    <p className="font-medium">Add Lead</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className={`w-full bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-center gap-2'}`}
                      onClick={() => setShowImport(true)}
                    >
                      <span className="inline-flex text-white">
                        <Upload className="w-4 h-4 stroke-white" strokeWidth={2.5} />
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                    <p className="font-medium">Import</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <button 
                  className={`w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-center gap-2'}`}
                  onClick={() => setShowAdd(true)}
                >
                  <span className="inline-flex text-white">
                    <Plus className="w-5 h-5 stroke-white" strokeWidth={2.5} />
                  </span>
                  {!sidebarCollapsed && "Add Lead"}
                </button>
                <button 
                  className={`w-full bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-center gap-2'}`}
                  onClick={() => setShowImport(true)}
                >
                  <span className="inline-flex text-white">
                    <Upload className="w-5 h-5 stroke-white" strokeWidth={2.5} />
                  </span>
                  {!sidebarCollapsed && "Import"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {/* Date Range */}
              <select
                value={advancedFilters.dateRange}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7days">Last 7 days</option>
                <option value="last30days">Last 30 days</option>
                <option value="thismonth">This month</option>
                <option value="lastmonth">Last month</option>
              </select>

              {/* Score Range */}
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Min Score"
                  value={advancedFilters.scoreMin}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, scoreMin: e.target.value }))}
                  className="w-1/2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max Score"
                  value={advancedFilters.scoreMax}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, scoreMax: e.target.value }))}
                  className="w-1/2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Email Domain */}
              <input
                type="text"
                placeholder="Email domain (e.g. gmail.com)"
                value={advancedFilters.emailDomain}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, emailDomain: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              {/* Call Count Range */}
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Min Calls"
                  value={advancedFilters.callCountMin}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, callCountMin: e.target.value }))}
                  className="w-1/2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max Calls"
                  value={advancedFilters.callCountMax}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, callCountMax: e.target.value }))}
                  className="w-1/2 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={advancedFilters.excludeEarlyStages}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, excludeEarlyStages: e.target.checked }))}
                />
                Exclude early stages
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={advancedFilters.sortByCallCount}
                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, sortByCallCount: e.target.checked }))}
                />
                Sort by call count
              </label>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <currentViewData.icon className="w-6 h-6" />
                {currentViewData.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? "Loading..." : `${total} leads`}
              </p>
            </div>

            {/* Bulk Actions */}
            {phones.length > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                <span className="text-sm text-blue-700 font-medium">
                  {phones.length} selected
                </span>
                <div className="flex gap-1">
                  <select
                    className="text-xs border border-blue-200 rounded px-2 py-1"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">Assign to...</option>
                    {sales.map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                    disabled={!assignee}
                    onClick={async () => {
                      const actorId = getActorId();
                      const res = await fetch("/api/tl/queue", { 
                        method: "POST", 
                        headers: { "Content-Type": "application/json" }, 
                        body: JSON.stringify({ action: "assign", phones, ownerId: assignee, actorId }) 
                      });
                      if (res.ok) {
                        toast.success(`Assigned ${phones.length} lead(s)`);
                        setSelected({});
                        refreshData();
                      } else {
                        toast.error("Assignment failed");
                      }
                    }}
                  >
                    Assign
                  </button>
                  {/* Auto-Assign Button - RESTORED */}
                  <button
                    className="text-xs bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1"
                    disabled={phones.length === 0 || autoAssigning}
                    onClick={async () => {
                      try {
                        setAutoAssigning(true);
                        const actorId = getActorId();
                        const res = await fetch("/api/tl/queue", { 
                          method: "POST", 
                          headers: { "Content-Type": "application/json" }, 
                          body: JSON.stringify({ action: "autoAssign", phones, actorId }) 
                        });
                        if (res.ok) {
                          const data = await res.json();
                          toast.success(`Auto-assigned ${phones.length} lead(s) via ${data.rule}`);
                        } else {
                          toast.error("Auto-assign failed");
                        }
                        setSelected({});
                        refreshData();
                      } finally {
                        setAutoAssigning(false);
                      }
                    }}
                  >
                    {autoAssigning && (
                      <span className="inline-block h-3 w-3 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                    )}
                    Auto
                  </button>
                  <button
                    className="text-xs bg-cyan-600 text-white px-3 py-1 rounded hover:bg-cyan-700"
                    onClick={() => setCreateTaskOpen(true)}
                  >
                    Task
                  </button>
                  <button
                    className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <div className="bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        const next: Record<string, boolean> = {};
                        if (e.target.checked) rows.forEach((r) => (next[r.phone] = true));
                        setSelected(next);
                      }} 
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Lead</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Stage</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Owner</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Score</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Last Activity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                        Loading leads...
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                      <div className="flex flex-col items-center gap-2">
                        <Clipboard className="w-12 h-12 text-gray-300" />
                        <div>No leads found in this view</div>
                        <button 
                          className="text-blue-600 hover:text-blue-700 text-sm"
                          onClick={() => setShowAdd(true)}
                        >
                          Add your first lead
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((lead) => (
                    <tr key={lead.phone} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          checked={!!selected[lead.phone]} 
                          onChange={(e) => setSelected({ ...selected, [lead.phone]: e.target.checked })} 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <a 
                            href={`/team-leader/lead-management/leads/${encodeURIComponent(lead.phone)}`} 
                            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {lead.name || "Unknown"}
                          </a>
                          <div className="text-xs text-gray-500 space-x-2">
                            <span>{lead.phone}</span>
                            {lead.email && <span>• {lead.email}</span>}
                            {lead.callCount !== undefined && lead.callCount > 0 && (
                              <span className="bg-gray-100 text-gray-600 px-1 rounded">
                                {lead.callCount} calls
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStageColor(lead.stage)}`}>
                              {lead.stage || "Not contacted"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg"
                          >
                            <p className="font-medium">{lead.stage || "Not contacted"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {(sales.find((s) => s.code === lead.ownerId)?.name) || lead.ownerId || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {getSourceIcon(lead.source || "")}
                          <span className="text-gray-600">{lead.source || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm">{lead.score ?? 0}</span>
                          {(lead.score ?? 0) >= 80 && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="bg-white border-t border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  disabled={page * pageSize >= total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Custom View Modal */}
      {showCreateView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Custom View</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">View Name</label>
                <input
                  type="text"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter view name..."
                />
              </div>
              <p className="text-sm text-gray-600">
                This will create a view with the current filters: {currentViewData.name}
                {showAdvancedFilters && getActiveAdvancedFilterCount() > 0 && ` + ${getActiveAdvancedFilterCount()} advanced filter(s)`}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                onClick={() => {
                  setShowCreateView(false);
                  setNewViewName("");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={createCustomView}
              >
                Create View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900">Delete selected leads?</h3>
            <p className="text-sm text-gray-600 mt-1">This action cannot be undone. You are about to delete {phones.length} lead(s).</p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={performBulkDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task modal */}
      {createTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900">Create Tasks</h3>
            <p className="text-sm text-gray-600 mt-1">Create tasks for {phones.length} selected lead(s).</p>
            
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Enter task title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="">Select assignee...</option>
                  {sales.map((s) => (
                    <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                onClick={() => {
                  setCreateTaskOpen(false);
                  setTaskTitle("Follow up");
                  setTaskAssignee("");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                onClick={performCreateTasks}
                disabled={creatingTask || !taskTitle.trim() || !taskAssignee}
              >
                {creatingTask ? "Creating..." : "Create Tasks"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddLeadModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={refreshData}
      />
      <ImportLeadsModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={refreshData}
      />
    </div>
  </TooltipProvider>
  );
}



