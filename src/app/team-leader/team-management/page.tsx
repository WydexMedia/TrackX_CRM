"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// Clerk handles authentication automatically via cookies - no need for fetch
import { Eye, EyeOff, Settings, Users, Plus, Edit, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface User {
  id?: number; // Database ID
  code: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  assignedTo?: string;
  password?: string;
  target?: number;
}

interface JuniorLeader extends User {
  teamMembers: string[];
}

interface SalesPerson extends User {
  assignedTo?: string;
}

interface TeamData {
  allUsers: User[];
  juniorLeaders: JuniorLeader[];
  salesPersons: SalesPerson[];
}

export default function TeamManagementPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotingUser, setPromotingUser] = useState<string | null>(null);
  const [assigningUser, setAssigningUser] = useState<string | null>(null);
  const [demotingUser, setDemotingUser] = useState<string | null>(null);
  const [selectedJl, setSelectedJl] = useState<string>("");
  const [jlSelections, setJlSelections] = useState<Record<string, string>>({});
  const [unassigningUser, setUnassigningUser] = useState<string | null>(null);
  const [showDemoteConfirm, setShowDemoteConfirm] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<User[]>([]);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    target: 0
  });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    fetchTeamData();
    fetchCredentials();
  }, [isLoaded]);

  const fetchTeamData = async () => {
    try {
      // API gets user from Clerk authentication - no need for userId parameter
      const response = await fetch(`/api/tl/team-management`);
      if (response.ok) {
        const data = await response.json();
        // Ensure teamData is always an object with arrays, never null
        setTeamData(data.teamData || {
          allUsers: [],
          juniorLeaders: [],
          salesPersons: []
        });
      } else {
        const errorData = await response.json();
        console.error("Team data fetch error:", errorData);
        // Set empty team data on error so UI can still render
        setTeamData({
          allUsers: [],
          juniorLeaders: [],
          salesPersons: []
        });
        toast.error(errorData.error || "Failed to fetch team data");
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
      // Set empty team data on error so UI can still render
      setTeamData({
        allUsers: [],
        juniorLeaders: [],
        salesPersons: []
      });
      toast.error("Failed to fetch team data");
    } finally {
      setLoading(false);
    }
  };

  const fetchCredentials = async () => {
    try {
      // Clerk handles authentication via cookies automatically
      const response = await fetch("/api/users/credentials");
      if (response.ok) {
        const data = await response.json();
        setCredentials(data);
      }
    } catch (error) {
      console.error("Error fetching credentials:", error);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    const newVisiblePasswords = new Set(visiblePasswords);
    if (newVisiblePasswords.has(userId)) {
      newVisiblePasswords.delete(userId);
    } else {
      newVisiblePasswords.add(userId);
    }
    setVisiblePasswords(newVisiblePasswords);
  };

  const toggleAllPasswords = () => {
    if (visiblePasswords.size === credentials.length) {
      setVisiblePasswords(new Set());
    } else {
      setVisiblePasswords(new Set(credentials.map(user => user._id || user.code)));
    }
  };

  const promoteToJL = async (salespersonCode: string) => {
    try {
      setPromotingUser(salespersonCode);
      
      const response = await fetch("/api/tl/team-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "promote_to_jl",
          targetUserId: salespersonCode
        })
      });

      if (response.ok) {
        toast.success("User promoted to Junior Leader successfully");
        fetchTeamData(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to promote user");
      }
    } catch (error) {
      console.error("Error promoting user:", error);
      toast.error("Failed to promote user");
    } finally {
      setPromotingUser(null);
    }
  };

  const assignToJL = async (salespersonCode: string, jlCode: string) => {
    try {
      setAssigningUser(salespersonCode);
      
      const response = await fetch("/api/tl/team-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_to_jl",
          targetUserId: salespersonCode,
          jlId: jlCode
        })
      });

      if (response.ok) {
        toast.success("User assigned to Junior Leader successfully");
        fetchTeamData(); // Refresh data
        // Clear the selection for this specific salesperson
        setJlSelections(prev => ({ ...prev, [salespersonCode]: "" }));
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to assign user");
      }
    } catch (error) {
      console.error("Error assigning user:", error);
      toast.error("Failed to assign user");
    } finally {
      setAssigningUser(null);
    }
  };

  const unassignFromJL = async (salespersonCode: string) => {
    try {
      setUnassigningUser(salespersonCode);
      
      const response = await fetch("/api/tl/team-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unassign_from_jl",
          targetUserId: salespersonCode
        })
      });

      if (response.ok) {
        toast.success("User unassigned successfully");
        fetchTeamData(); // Refresh data
        // Clear the selection for this specific salesperson
        setJlSelections(prev => ({ ...prev, [salespersonCode]: "" }));
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to unassign user");
      }
    } catch (error) {
      console.error("Error unassigning user:", error);
      toast.error("Failed to unassign user");
    } finally {
      setUnassigningUser(null);
    }
  };

  const demoteToSales = async (jlCode: string) => {
    try {
      setDemotingUser(jlCode);
      
      const response = await fetch("/api/tl/team-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "demote_to_sales",
          targetUserId: jlCode
        })
      });

      if (response.ok) {
        toast.success("User demoted to sales successfully");
        fetchTeamData(); // Refresh data
        setShowDemoteConfirm(null); // Hide confirmation
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to demote user");
      }
    } catch (error) {
      console.error("Error demoting user:", error);
      toast.error("Failed to demote user");
    } finally {
      setDemotingUser(null);
    }
  };

  const confirmDemote = (jlCode: string) => {
    setShowDemoteConfirm(jlCode);
  };

  const cancelDemote = () => {
    setShowDemoteConfirm(null);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    try {
      // Clerk handles authentication via cookies automatically
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(result.message || "Team member invited successfully!", {
          duration: 6000, // Show for 6 seconds to read the message
        });
        
        // Show additional info if invitation was sent
        if (result.invitationId) {
          console.log('Invitation details:', result.invitationDetails);
          console.log('Troubleshooting steps:', result.troubleshooting);
        }
        
        setShowAddUser(false);
        setNewUser({ name: "", email: "", target: 0 });
        fetchTeamData();
        fetchCredentials();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create user");
      }
    } catch (error) {
      toast.error("Failed to create user");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdatingUser(true);
    try {
      // Clerk handles authentication via cookies automatically
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editingUser),
      });

      if (res.ok) {
        toast.success("User updated successfully");
        setEditingUser(null);
        setShowEditUser(false);
        fetchTeamData();
        fetchCredentials();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update user");
      }
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    setIsDeletingUser(userId);
    try {
      // Clerk handles authentication via cookies automatically
      const res = await fetch(`/api/users?id=${userId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast.success("User deleted successfully");
        fetchTeamData();
        fetchCredentials();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete user");
      }
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setIsDeletingUser(null);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="w-80 border border-slate-200/60 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="inline-block h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-slate-700 font-medium">Loading team data...</p>
            <p className="text-xs text-slate-500 mt-2">Please wait</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initialize empty team data if null to allow UI to render
  const displayTeamData = teamData || {
    allUsers: [],
    juniorLeaders: [],
    salesPersons: []
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-6">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
              <p className="mt-1 text-sm text-slate-600">Manage your team hierarchy and role assignments</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowCredentials(true)}
                variant="outline"
                size="sm"
                className="gap-2 border-slate-200 hover:bg-slate-50"
              >
                <Settings className="w-4 h-4" />
                View Credentials
              </Button>
              <Button
                onClick={() => setShowAddUser(true)}
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Add Member
              </Button>
            </div>
          </div>
        </div>

        {/* Team Hierarchy Overview */}
        <Card className="mb-8 border border-slate-200/60 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-200/60">
            <CardTitle className="text-lg text-slate-900">Team Hierarchy Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 rounded-xl w-16 h-16 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <span className="text-2xl font-bold text-blue-600">{displayTeamData.juniorLeaders.length}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">Junior Leaders</p>
                <p className="text-xs text-slate-500 mt-1">Team supervisors</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-xl w-16 h-16 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <span className="text-2xl font-bold text-green-600">{displayTeamData.salesPersons.length}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">Sales Persons</p>
                <p className="text-xs text-slate-500 mt-1">Active agents</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-xl w-16 h-16 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <span className="text-2xl font-bold text-purple-600">{displayTeamData.allUsers.length}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">Total Team Members</p>
                <p className="text-xs text-slate-500 mt-1">Entire team</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Junior Leaders Section */}
        <Card className="mb-8 border border-slate-200/60 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-200/60">
            <CardTitle className="text-lg text-slate-900">Junior Leaders</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {displayTeamData.juniorLeaders.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No Junior Leaders yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayTeamData.juniorLeaders.map((jl) => (
                  <Card key={jl.code} className="border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-900">{jl.name}</h3>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">JL</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{jl.email}</p>
                      <p className="text-sm text-slate-500 mb-3">Team Members: <span className="font-semibold">{jl.teamMembers.length}</span></p>
                  
                      {/* Demote to Sales Button */}
                      {showDemoteConfirm === jl.code ? (
                        <div className="space-y-2">
                          <p className="text-xs text-red-600 font-medium">Are you sure?</p>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => demoteToSales(jl.code)}
                              disabled={demotingUser === jl.code}
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                            >
                              {demotingUser === jl.code ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" aria-hidden="true" />
                                  Demoting...
                                </span>
                              ) : (
                                "Yes, Demote"
                              )}
                            </Button>
                            <Button
                              onClick={cancelDemote}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => confirmDemote(jl.code)}
                          disabled={jl.teamMembers.length > 0}
                          variant={jl.teamMembers.length > 0 ? "outline" : "destructive"}
                          size="sm"
                          className="w-full"
                          title={jl.teamMembers.length > 0 ? "Cannot demote JL with team members" : "Demote to Sales"}
                        >
                          Demote to Sales
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Persons Section */}
        <Card className="border border-slate-200/60 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-900">Sales Persons</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 h-9 border-slate-200"
                  />
                </div>
                <div className="text-sm text-slate-600 font-medium">
                  {displayTeamData.salesPersons.filter(sp => 
                    sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    sp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    sp.code.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length} of {displayTeamData.salesPersons.length} members
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {displayTeamData.salesPersons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-4">No Sales Persons yet</p>
                <Button
                  onClick={() => setShowAddUser(true)}
                  size="sm"
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Team Member
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Name</TH>
                      <TH>Email</TH>
                      <TH>Target</TH>
                      <TH>Assigned To</TH>
                      <TH>Role Management</TH>
                      <TH>Member Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {displayTeamData.salesPersons
                      .filter(sp => 
                        sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        sp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        sp.code.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((salesperson) => (
                      <TR key={salesperson.code}>
                        <TD>
                          <div className="text-sm font-medium text-gray-900">{salesperson.name}</div>
                        </TD>
                        <TD>
                          <div className="text-sm text-slate-900">{salesperson.email}</div>
                        </TD>
                        <TD>
                          <div className="text-sm font-semibold text-slate-900">
                            ₹{(salesperson.target || 0).toLocaleString()}
                          </div>
                        </TD>
                        <TD>
                          {salesperson.assignedTo ? (
                            <Badge variant="secondary">
                              {displayTeamData.juniorLeaders.find(jl => jl.code === salesperson.assignedTo)?.name || salesperson.assignedTo}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Unassigned</Badge>
                          )}
                        </TD>
                        <TD>
                          <div className="flex items-center space-x-2 flex-wrap gap-2">
                            <Button
                              onClick={() => promoteToJL(salesperson.code)}
                              disabled={promotingUser === salesperson.code}
                              size="sm"
                              variant="outline"
                              className="border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              {promotingUser === salesperson.code ? "Promoting..." : "Promote to JL"}
                            </Button>
                            
                            {/* Assignment Controls */}
                            {salesperson.assignedTo ? (
                              // Currently assigned - show reassignment options
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">Reassign to:</span>
                                <select
                                  value={jlSelections[salesperson.code] || ""}
                                  onChange={(e) => setJlSelections(prev => ({ ...prev, [salesperson.code]: e.target.value }))}
                                  className="w-32 h-8 text-xs px-2 py-1 border border-gray-300 rounded-md"
                                >
                                  <option value="">Select new JL</option>
                                  {displayTeamData.juniorLeaders
                                    ?.filter(jl => jl.code !== salesperson.assignedTo)
                                    .map((jl) => (
                                      <option key={jl.code} value={jl.code}>
                                        {jl.name}
                                      </option>
                                    ))}
                                </select>
                                <Button
                                  onClick={() => assignToJL(salesperson.code, jlSelections[salesperson.code] || "")}
                                  disabled={!jlSelections[salesperson.code] || assigningUser === salesperson.code}
                                  variant="default"
                                  size="sm"
                                >
                                  {assigningUser === salesperson.code ? "Reassigning..." : "Reassign"}
                                </Button>
                                <Button
                                  onClick={() => unassignFromJL(salesperson.code)}
                                  disabled={unassigningUser === salesperson.code}
                                  variant="destructive"
                                  size="sm"
                                >
                                  {unassigningUser === salesperson.code ? "Unassigning..." : "Unassign"}
                                </Button>
                              </div>
                            ) : (
                              // Not assigned - show assignment options
                              <div className="flex items-center space-x-2">
                                <select
                                  value={jlSelections[salesperson.code] || ""}
                                  onChange={(e) => setJlSelections(prev => ({ ...prev, [salesperson.code]: e.target.value }))}
                                  className="w-32 h-8 text-xs px-2 py-1 border border-gray-300 rounded-md"
                                >
                                  <option value="">Select JL</option>
                                  {displayTeamData.juniorLeaders
                                    ?.filter(jl => jl.code !== salesperson.code)
                                    .map((jl) => (
                                      <option key={jl.code} value={jl.code}>
                                        {jl.name}
                                      </option>
                                    ))}
                                </select>
                                <Button
                                  onClick={() => assignToJL(salesperson.code, jlSelections[salesperson.code] || "")}
                                  disabled={!jlSelections[salesperson.code] || assigningUser === salesperson.code}
                                  variant="default"
                                  size="sm"
                                >
                                  {assigningUser === salesperson.code ? "Assigning..." : "Assign"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </TD>
                        <TD>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const userToEdit = displayTeamData.allUsers.find(u => u.code === salesperson.code);
                                if (userToEdit) {
                                  setEditingUser(userToEdit);
                                  setShowEditUser(true);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(salesperson.id ? String(salesperson.id) : (salesperson.code || ''))}
                              disabled={isDeletingUser === (salesperson.id ? String(salesperson.id) : salesperson.code)}
                              className={`${isDeletingUser === (salesperson.id ? String(salesperson.id) : salesperson.code)
                                  ? 'text-slate-400 cursor-not-allowed'
                                  : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                                }`}
                            >
                              {isDeletingUser === (salesperson.id ? String(salesperson.id) : salesperson.code) ? (
                                <div className="flex items-center space-x-1">
                                  <div className="animate-spin h-3 w-3 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                                  <span>Deleting...</span>
                                </div>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </>
                              )}
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add User Modal */}
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg text-slate-900">Add New Team Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <Input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter full name"
                  className="border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <Input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter email address"
                  className="border-slate-200"
                  autoComplete="email"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> An invitation email will be sent to the team member. They will set their password when they accept the invitation.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target (₹)</label>
                <Input
                  type="number"
                  required
                  // value={newUser.target}
                  onChange={(e) =>
                    setNewUser({ ...newUser, target: parseInt(e.target.value)  })
                  }
                  placeholder="Enter target amount"
                  className="border-slate-200"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="submit"
                  disabled={isAddingUser}
                  className="flex-1"
                >
                  {isAddingUser ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Adding...</span>
                    </div>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Member
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddUser(false)}
                  disabled={isAddingUser}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={showEditUser} onOpenChange={(open) => !open && setEditingUser(null) || setShowEditUser(open)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg text-slate-900">Edit Team Member</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <Input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    placeholder="Enter full name"
                    className="border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                  <Input
                    type="text"
                    required
                    value={editingUser.code}
                    onChange={(e) => setEditingUser({ ...editingUser, code: e.target.value })}
                    placeholder="Enter user code"
                    className="border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <Input
                    type="email"
                    required
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="Enter email address"
                    className="border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target (₹)</label>
                  <Input
                    type="number"
                    required
                    value={editingUser.target }
                    onChange={(e) => setEditingUser({ ...editingUser, target: parseInt(e.target.value)  })}
                    placeholder="Enter target amount"
                    className="border-slate-200"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isUpdatingUser}
                    className="flex-1"
                  >
                    {isUpdatingUser ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Update Member
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingUser(null);
                      setShowEditUser(false);
                    }}
                    disabled={isUpdatingUser}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Credentials Modal */}
        <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-lg text-slate-900">Team Credentials</DialogTitle>
              <div className="flex items-center space-x-4 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllPasswords}
                  className="gap-2"
                >
                  {visiblePasswords.size === credentials.length ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Hide All
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Show All
                    </>
                  )}
                </Button>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto">
              <Card className="mb-4 border border-slate-200/60">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-600 mb-2">
                      <strong>Note:</strong> These are the login credentials for all team members. 
                      Passwords are hidden by default for security. Click the eye icon to reveal passwords.
                    </p>
                    <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      <strong>💡 Clerk Invitations:</strong> Team members who were added via invitation will set their own password when accepting the invitation. Their password field may be empty until they accept.
                    </p>
                  </CardContent>
              </Card>
              
              <div className="grid gap-4">
                {credentials.map((user) => (
                  <Card key={user._id || user.code} className="border border-slate-200/60 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 h-12 w-12">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-lg font-medium text-white">
                                  {(user.name || '').split(' ').map(n => n[0]).join('').toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-slate-900">{user.name}</h3>
                              <p className="text-sm text-slate-500">{user.code}</p>
                              <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-900">Login ID</div>
                            <div className="text-sm text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded">
                              {user.email}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-900">Password</div>
                            <div className="flex items-center space-x-2">
                              <div className="text-sm text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded min-w-[120px]">
                                {visiblePasswords.has(user._id || user.code) ? (
                                  user.password ? (
                                    user.password
                                  ) : (
                                    <span className="text-blue-600 italic">Set via invitation</span>
                                  )
                                ) : '••••••'}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePasswordVisibility(user._id || user.code)}
                                className="p-1 h-8 w-8"
                                title={visiblePasswords.has(user._id || user.code) ? 'Hide password' : 'Show password'}
                              >
                                {visiblePasswords.has(user._id || user.code) ? (
                                  <EyeOff className="w-4 h-4 text-slate-500" />
                                ) : (
                                  <Eye className="w-4 h-4 text-slate-500" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {credentials.length === 0 && (
                <Card className="border border-slate-200/60">
                  <CardContent className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No team members found</h3>
                    <p className="mt-1 text-sm text-slate-500">Add team members to view their credentials.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 