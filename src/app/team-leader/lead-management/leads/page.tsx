"use client";

import { useEffect, useMemo, useState } from "react";
import { AddLeadModal, ImportLeadsModal } from "./AddLeadModals";
import { ListCreateModal } from "./ListCreateModal";
import toast from "react-hot-toast";
import { authenticatedFetch } from "@/lib/tokenValidation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  Cylinder,
  Trash
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
  const [pageSize, setPageSize] = useState(25);
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
  
  // Saved Lists
  const [lists, setLists] = useState<Array<{ id: number; name: string }>>([]);
  const [showCreateList, setShowCreateList] = useState(false);
  const [deletingListId, setDeletingListId] = useState<number | null>(null);
  const [confirmDeleteListOpen, setConfirmDeleteListOpen] = useState(false);
  
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
    owner: "",
    stage: "",
    source: "",
    activityDateFrom: "",
    activityDateTo: "",
  });
  
  // Bulk actions
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("Follow up");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  // Bulk: add to list
  const [addToListId, setAddToListId] = useState<string>("");
  
  // Bulk: update stage
  const [bulkStage, setBulkStage] = useState<string>("");
  const [updatingStage, setUpdatingStage] = useState(false);

  // Predefined list views with Lucide icons
  const defaultViews: ListView[] = [
    { id: "all", name: "All Leads", icon: Clipboard, filters: {} },
    { id: "unassigned", name: "Unassigned", icon: RotateCcw, filters: { owner: "unassigned" } },
    { id: "not-contacted", name: "Not Contacted", icon: Phone, filters: { stage: "Not contacted" } },
    { id: "qualified", name: "Qualified", icon: CheckCircle, filters: { stage: "Qualified" } },
    { id: "interested", name: "Interested", icon: Lightbulb, filters: { stage: "Interested" } },
    { id: "follow-up", name: "Follow Up", icon: Clock, filters: { needFollowup: true } },
    { id: "recent", name: "Recent (7 days)", icon: Sparkles, filters: { dateRange: "last7days" } },
    { id: "customers", name: "Customers", icon: Crown, filters: { stage: "Customer" } },
  
  ];

  const allViews = [...defaultViews, ...customViews];
  // Interpret list-<id> views as a filter by list id
  const isListView = currentView.startsWith("list-");
  const listIdParam = isListView ? currentView.replace("list-", "") : undefined;
  const currentViewData = allViews.find(v => v.id === currentView) || defaultViews[0];
  const viewTitle = isListView ? (lists.find(l => String(l.id) === listIdParam)?.name || "List") : currentViewData.name;
  const ViewIcon = isListView ? Pin : currentViewData.icon;

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

    // If viewing a saved list, pass listId
    if (isListView && listIdParam) {
      sp.set("listId", listIdParam);
      console.log("Setting listId filter:", listIdParam);
    }
    
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
      if (advancedFilters.owner) sp.set("owner", advancedFilters.owner);
      if (advancedFilters.stage) sp.set("stage", advancedFilters.stage);
      if (advancedFilters.source) sp.set("source", advancedFilters.source);
      if (advancedFilters.activityDateFrom) sp.set("activityDateFrom", advancedFilters.activityDateFrom);
      if (advancedFilters.activityDateTo) sp.set("activityDateTo", advancedFilters.activityDateTo);
    }
    
    sp.set("limit", String(pageSize));
    sp.set("offset", String((page - 1) * pageSize));
    console.log("API params:", sp.toString());
    return sp.toString();
  }, [q, currentView, currentViewData, page, showAdvancedFilters, advancedFilters, isListView, listIdParam]);

  useEffect(() => {
    setLoading(true);
    authenticatedFetch(`/api/tl/leads?${params}`)
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
    
    authenticatedFetch("/api/users")
      .then((r) => r.json())
      .then((all) => {
        const onlySales = (Array.isArray(all) ? all : []).filter((u: any) => (u.role ?? 'sales') === "sales");
        setSales(onlySales.map((u: any) => ({ code: u.code, name: u.name })));
      })
      .catch(() => {});

    // Load saved lists
    authenticatedFetch("/api/tl/lists")
      .then((r) => r.json())
      .then((d) => setLists(d?.rows || []))
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
      const res = await authenticatedFetch("/api/tl/leads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phones }) });
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

  const performBulkStageUpdate = async () => {
    if (phones.length === 0 || !bulkStage) return;
    try {
      setUpdatingStage(true);
      const actorId = getActorId();
      const res = await authenticatedFetch("/api/tl/leads", { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          phones, 
          stage: bulkStage,
          actorId 
        }) 
      });
      if (res.ok) {
        toast.success(`Updated stage for ${phones.length} lead(s) to "${bulkStage}"`);
        setSelected({});
        setBulkStage("");
        refreshData();
      } else {
        toast.error("Stage update failed");
      }
    } catch {
      toast.error("Stage update failed");
    } finally {
      setUpdatingStage(false);
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
      
      const res = await authenticatedFetch("/api/tl/queue", { 
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
    authenticatedFetch(`/api/tl/leads?${params}`).then((r) => r.json()).then((d) => {
      setRows(d.rows || []);
      setTotal(d.total || 0);
    });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  const createCustomView = () => {
    if (!newViewName.trim()) {
      toast.error("Please enter a view name");
      return;
    }
    
    const newView: ListView = {
      id: `custom-${Date.now()}`,
      name: newViewName,
      icon: Cylinder,
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
      owner: "",
      stage: "",
      source: "",
      activityDateFrom: "",
      activityDateTo: "",
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
    if (advancedFilters.owner) count++;
    if (advancedFilters.stage) count++;
    if (advancedFilters.source) count++;
    if (advancedFilters.activityDateFrom || advancedFilters.activityDateTo) count++;
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
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Collapsible Sidebar with List Views */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-72'} bg-gradient-to-b from-slate-50 to-white border-r border-slate-200/60 flex flex-col transition-all duration-300 shadow-sm`}>
        <div className="p-4 border-b border-slate-200/60">
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-slate-900">Lead Lists</h1>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreateList(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                    <p className="font-medium">Create New List</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            <div className="flex gap-1">
              {!sidebarCollapsed && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={showAdvancedFilters ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      >
                        <Filter className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                      <p className="font-medium">Advanced Filters</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateView(true)}
                      >
                        <Cylinder className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                      <p className="font-medium">Create custom view</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  >
                    {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                  <p className="font-medium">{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {/* Advanced Filters Toggle */}
          {!sidebarCollapsed && showAdvancedFilters && getActiveAdvancedFilterCount() > 0 && (
            <div className="mb-3 flex items-center justify-between bg-primary/10 px-3 py-2 rounded-lg border border-primary/20">
              <span className="text-xs text-primary font-medium">
                {getActiveAdvancedFilterCount()} advanced filter{getActiveAdvancedFilterCount() > 1 ? 's' : ''} active
              </span>
              <button
                onClick={clearAdvancedFilters}
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                Clear
              </button>
            </div>
          )}
          
          {/* Search */}
          {!sidebarCollapsed && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <Input
                className="pl-10"
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
            {lists.length > 0 && !sidebarCollapsed && (
              <div className="mb-3">
                <div className="text-xs uppercase tracking-wide text-gray-500 px-2 mb-1">My Lists</div>
                <div className="space-y-1">
                  {lists.map((l) => (
                    <div
                      key={`list-${l.id}`}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${
                        currentView === `list-${l.id}`
                          ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Button
                        variant="ghost"
                        className="flex items-center gap-3 flex-1 text-left justify-start"
                        onClick={() => {
                          setCurrentView(`list-${l.id}`);
                          setSelected({});
                          setPage(1);
                        }}
                      >
                        <Pin className="w-4 h-4" />
                        <span className="font-medium">{l.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600"
                        onClick={() => {
                          setDeletingListId(l.id);
                          setConfirmDeleteListOpen(true);
                        }}
                        aria-label="Delete list"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1">
              {allViews.map((view) => {
                const IconComponent = view.icon;
                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={view.id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={currentView === view.id ? "default" : "ghost"}
                          size="sm"
                          onClick={() => {
                            setCurrentView(view.id);
                            setPage(1);
                            setSelected({});
                          }}
                          className="w-full justify-center"
                        >
                          <IconComponent className="w-4 h-4 flex-shrink-0" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                        <p className="font-medium">{view.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return (
                  <Button
                    key={view.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCurrentView(view.id);
                      setPage(1);
                      setSelected({});
                    }}
                    className={`w-full justify-between ${
                      currentView === view.id
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-medium">{view.name}</span>
                    </div>
                    {view.count !== undefined && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        {view.count}
                      </Badge>
                    )}
                  </Button>
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
                    <Button 
                      className="w-full"
                      onClick={() => setShowAdd(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                    <p className="font-medium">Add Lead</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary"
                      className="w-full"
                      onClick={() => setShowImport(true)}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg">
                    <p className="font-medium">Import</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Button 
                  className="w-full"
                  onClick={() => setShowAdd(true)}
                >
                  <Plus className="w-5 h-5" />
                  Add Lead
                </Button>
                <Button 
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowImport(true)}
                >
                  <Upload className="w-5 h-5" />
                  Import
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="bg-white border-b border-slate-200/60 p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {/* Created Date Range */}
              <select
                value={advancedFilters.dateRange}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Created: All Time</option>
                <option value="today">Created: Today</option>
                <option value="yesterday">Created: Yesterday</option>
                <option value="last7days">Created: Last 7 days</option>
                <option value="last30days">Created: Last 30 days</option>
                <option value="thismonth">Created: This month</option>
                <option value="lastmonth">Created: Last month</option>
              </select>

              {/* Owner Filter */}
              <select
                value={advancedFilters.owner}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, owner: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Owners</option>
                <option value="unassigned">Unassigned</option>
                {sales.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>

              {/* Stage Filter */}
              <select
                value={advancedFilters.stage}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, stage: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Stages</option>
                <option value="Not contacted">Not contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Not interested">Not interested</option>
                <option value="Interested">Interested</option>
                <option value="To be nurtured">To be nurtured</option>
                <option value="Junk">Junk</option>
                <option value="Ask to call back">Ask to call back</option>
                <option value="Attempt to contact">Attempt to contact</option>
                <option value="Did not Connect">Did not Connect</option>
                <option value="Customer">Customer</option>
                <option value="Other Language">Other Language</option>
              </select>

              {/* Source Filter */}
              <input
                type="text"
                placeholder="Source (e.g. Website, META, Google)"
                value={advancedFilters.source}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, source: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              {/* Last Activity */}
              <select
                value={advancedFilters.lastActivity}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, lastActivity: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Last Activity: Any</option>
                <option value="today">Activity: Today</option>
                <option value="last3days">Activity: Last 3 days</option>
                <option value="lastweek">Activity: Last week</option>
                <option value="lastmonth">Activity: Last month</option>
                <option value="noactivity">No Activity</option>
              </select>

              {/* Activity Date Range - From */}
              <input
                type="date"
                placeholder="Activity From"
                value={advancedFilters.activityDateFrom}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, activityDateFrom: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                title="Activity From Date"
              />

              {/* Activity Date Range - To */}
              <input
                type="date"
                placeholder="Activity To"
                value={advancedFilters.activityDateTo}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, activityDateTo: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                title="Activity To Date"
              />

              {/* Score Range
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
              </div> */}

              {/* Email Domain
              <input
                type="text"
                placeholder="Email domain (e.g. gmail.com)"
                value={advancedFilters.emailDomain}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, emailDomain: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              /> */}

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
        <div className="bg-white border-b border-slate-200/60 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <ViewIcon className="w-5 h-5 text-primary" />
                {viewTitle}
                {isListView && (
                  <span className="text-sm text-gray-500 font-normal">
                    (List View)
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? "Loading..." : `${total} leads`}
                {isListView && listIdParam && (
                  <span className="text-xs text-gray-400 ml-2">
                    • Filtered by list
                  </span>
                )}
              </p>
            </div>

            {/* Bulk Actions */}
            {phones.length > 0 && (
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                <span className="text-sm text-primary font-medium">
                  {phones.length} selected
                </span>
                <div className="flex gap-1">
                  {lists.length > 0 && (
                    <>
                      <select
                        className="text-xs border border-primary/30 rounded px-2 py-1 focus:ring-1 focus:ring-primary"
                        value={addToListId}
                        onChange={(e) => setAddToListId(e.target.value)}
                      >
                        <option value="">Add to list...</option>
                        {lists.map((l) => (
                          <option key={l.id} value={String(l.id)}>{l.name}</option>
                        ))}
                      </select>
                      <button
                        className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary/90 disabled:opacity-50"
                        disabled={!addToListId}
                        onClick={async () => {
                          try {
                            const res = await authenticatedFetch("/api/tl/lists", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ listId: Number(addToListId), phones }),
                            });
                            if (res.ok) {
                              const selectedList = lists.find(l => String(l.id) === addToListId);
                              toast.success(`Added ${phones.length} lead(s) to "${selectedList?.name || 'list'}"`);
                              setSelected({});
                              setAddToListId("");
                            } else {
                              toast.error("Failed to add to list");
                            }
                          } catch {
                            toast.error("Failed to add to list");
                          }
                        }}
                      >
                        Add
                      </button>
                    </>
                  )}
                  <select
                    className="text-xs border border-primary/30 rounded px-2 py-1 focus:ring-1 focus:ring-primary"
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
                  <select
                    className="text-xs border border-primary/30 rounded px-2 py-1 focus:ring-1 focus:ring-primary"
                    value={bulkStage}
                    onChange={(e) => setBulkStage(e.target.value)}
                  >
                    <option value="">Change stage...</option>
                    <option value="Not contacted">Not contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Not interested">Not interested</option>
                    <option value="Interested">Interested</option>
                    <option value="To be nurtured">To be nurtured</option>
                    <option value="Junk">Junk</option>
                    <option value="Ask to call back">Ask to call back</option>
                    <option value="Attempt to contact">Attempt to contact</option>
                    <option value="Did not Connect">Did not Connect</option>
                    <option value="Customer">Customer</option>
                    <option value="Other Language">Other Language</option>
                  </select>
                  <button
                    className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:opacity-50"
                    disabled={!bulkStage || updatingStage}
                    onClick={performBulkStageUpdate}
                  >
                    {updatingStage ? "Updating..." : "Update"}
                  </button>
                  <button
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    onClick={() => setCreateTaskOpen(true)}
                  >
                    Task
                  </button>
                  <button
                    className="text-xs bg-rose-600 text-white px-3 py-1 rounded hover:bg-rose-700"
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
            <Table>
              <THead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 border-b border-slate-200">
                <TR>
                  <TH className="w-12">
                    <input 
                      type="checkbox"
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                      onChange={(e) => {
                        const next: Record<string, boolean> = {};
                        if (e.target.checked) rows.forEach((r) => (next[r.phone] = true));
                        setSelected(next);
                      }} 
                    />
                  </TH>
                  <TH className="text-xs font-semibold text-slate-700">Lead</TH>
                  <TH className="text-xs font-semibold text-slate-700">Stage</TH>
                  <TH className="text-xs font-semibold text-slate-700">Owner</TH>
                  <TH className="text-xs font-semibold text-slate-700">Source</TH>
                  <TH className="text-xs font-semibold text-slate-700">Score</TH>
                  <TH className="text-xs font-semibold text-slate-700">Last Activity</TH>
                  <TH className="text-xs font-semibold text-slate-700">Created</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR>
                    <TD className="text-center text-slate-500" colSpan={8}>
                      <div className="flex items-center justify-center gap-2 py-8">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin"></div>
                        <span className="text-sm">Loading leads...</span>
                      </div>
                    </TD>
                  </TR>
                ) : rows.length === 0 ? (
                  <TR>
                    <TD className="text-center text-slate-500" colSpan={8}>
                      <div className="flex flex-col items-center gap-3 py-12">
                        <Clipboard className="w-12 h-12 text-slate-300" />
                        <div className="text-sm font-medium">No leads found in this view</div>
                        <Button 
                          variant="outline"
                          className="text-primary hover:bg-primary hover:text-white text-sm border-primary/30"
                          onClick={() => setShowAdd(true)}
                        >
                          Add your first lead
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ) : (
                  rows.map((lead) => (
                    <TR key={lead.phone} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                      <TD>
                        <input 
                          type="checkbox"
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                          checked={!!selected[lead.phone]} 
                          onChange={(e) => setSelected({ ...selected, [lead.phone]: e.target.checked })} 
                        />
                      </TD>
                      <TD>
                        <div className="flex flex-col gap-0.5">
                          <a 
                            href={`/team-leader/lead-management/leads/${encodeURIComponent(lead.phone)}`} 
                            className="font-medium text-sm text-primary hover:text-primary/80 hover:underline"
                          >
                            {lead.name || "Unknown"}
                          </a>
                          <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                            <span className="font-mono">{lead.phone}</span>
                            {lead.email && <span className="text-slate-400">• {lead.email}</span>}
                            {lead.callCount !== undefined && lead.callCount > 0 && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-slate-300">
                                {lead.callCount} calls
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className={`${getStageColor(lead.stage)}`}>
                              {lead.stage || "Not contacted"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="bg-gray-100 border border-gray-200 text-gray-800 shadow-lg"
                          >
                            <p className="font-medium">{lead.stage || "Not contacted"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TD>
                      <TD className="text-slate-600 text-sm">
                        {(sales.find((s) => s.code === lead.ownerId)?.name) || lead.ownerId || "—"}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-1.5">
                          {getSourceIcon(lead.source || "")}
                          <span className="text-slate-600 text-sm">{lead.source || "—"}</span>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-medium text-slate-700">{lead.score ?? 0}</span>
                          {(lead.score ?? 0) >= 80 && <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />}
                        </div>
                      </TD>
                      <TD className="text-slate-500 text-xs">
                        {lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleDateString() : "—"}
                      </TD>
                      <TD className="text-slate-500 text-xs">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="bg-white border-t border-slate-200/60 px-6 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600 font-medium">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600">Show:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-xs text-slate-600">per page</span>
                </div>
                {total > pageSize && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="border-slate-300"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * pageSize >= total}
                      onClick={() => setPage(p => p + 1)}
                      className="border-slate-300"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Custom View Modal */}
      <Dialog open={showCreateView} onOpenChange={setShowCreateView}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">View Name</label>
              <Input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Enter view name..."
              />
            </div>
            <p className="text-sm text-gray-600">
              This will create a view with the current filters: {currentViewData.name}
              {showAdvancedFilters && getActiveAdvancedFilterCount() > 0 && ` + ${getActiveAdvancedFilterCount()} advanced filter(s)`}
            </p>
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateView(false);
                setNewViewName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={createCustomView}>
              Create View
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete selected leads?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">This action cannot be undone. You are about to delete {phones.length} lead(s).</p>
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={performBulkDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete List confirmation modal */}
      <Dialog open={confirmDeleteListOpen} onOpenChange={(open) => {
        setConfirmDeleteListOpen(open);
        if (!open) setDeletingListId(null);
      }}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this list?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">This will remove the list and its items. Leads remain intact.</p>
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDeleteListOpen(false);
                setDeletingListId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deletingListId) return;
                try {
                  const res = await fetch('/api/tl/lists', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ listId: deletingListId }),
                  });
                  if (!res.ok) throw new Error('Failed');
                  toast.success('List deleted');
                  setLists(prev => prev.filter(l => l.id !== deletingListId));
                  if (currentView === `list-${deletingListId}`) {
                    setCurrentView('all');
                  }
                } catch {
                  toast.error('Failed to delete list');
                } finally {
                  setConfirmDeleteListOpen(false);
                  setDeletingListId(null);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task modal */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Create Tasks</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Create tasks for {phones.length} selected lead(s).</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
              <Input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
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
            <Button
              variant="outline"
              onClick={() => {
                setCreateTaskOpen(false);
                setTaskTitle("Follow up");
                setTaskAssignee("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={performCreateTasks}
              disabled={creatingTask || !taskTitle.trim() || !taskAssignee}
            >
              {creatingTask ? "Creating..." : "Create Tasks"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddLeadModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={refreshData}
        onListCreated={(l) => setLists((prev) => [...prev, l])}
      />
      <ImportLeadsModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={refreshData}
        onListCreated={(l) => setLists((prev) => [...prev, l])}
      />

      <ListCreateModal
        open={showCreateList}
        onClose={() => setShowCreateList(false)}
        onCreated={(l) => setLists((prev) => [...prev, l])}
      />
    </div>
  </TooltipProvider>
  );
}



