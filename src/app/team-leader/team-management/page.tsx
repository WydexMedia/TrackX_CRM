"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface User {
  code: string;
  name: string;
  email: string;
  role: string;
  assignedTo?: string;
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
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotingUser, setPromotingUser] = useState<string | null>(null);
  const [assigningUser, setAssigningUser] = useState<string | null>(null);
  const [demotingUser, setDemotingUser] = useState<string | null>(null);
  const [selectedJl, setSelectedJl] = useState<string>("");
  const [jlSelections, setJlSelections] = useState<Record<string, string>>({});
  const [unassigningUser, setUnassigningUser] = useState<string | null>(null);
  const [showDemoteConfirm, setShowDemoteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.email) {
        toast.error("User not found");
        return;
      }

      const response = await fetch(`/api/tl/team-management?userId=${encodeURIComponent(user.email)}`);
      if (response.ok) {
        const data = await response.json();
        setTeamData(data.teamData);
      } else {
        toast.error("Failed to fetch team data");
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to fetch team data");
    } finally {
      setLoading(false);
    }
  };

  const promoteToJL = async (salespersonCode: string) => {
    try {
      setPromotingUser(salespersonCode);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      const response = await fetch("/api/tl/team-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "promote_to_jl",
          targetUserId: salespersonCode,
          userId: user.email
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
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      const response = await fetch("/api/tl/team-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_to_jl",
          targetUserId: salespersonCode,
          jlId: jlCode,
          userId: user.email
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
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      const response = await fetch("/api/tl/team-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unassign_from_jl",
          targetUserId: salespersonCode,
          userId: user.email
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
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      const response = await fetch("/api/tl/team-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "demote_to_sales",
          targetUserId: jlCode,
          userId: user.email
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          <p className="mt-2 text-gray-600">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No team data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
              <p className="mt-2 text-gray-600">Manage your team hierarchy and assignments</p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
        </div>

        {/* Team Hierarchy Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Hierarchy Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-600">{teamData.juniorLeaders.length}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">Junior Leaders</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-green-600">{teamData.salesPersons.length}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">Sales Persons</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-purple-600">{teamData.allUsers.length}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">Total Team Members</p>
            </div>
          </div>
        </div>

        {/* Junior Leaders Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Junior Leaders</h2>
          {teamData.juniorLeaders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No Junior Leaders yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamData.juniorLeaders.map((jl) => (
                <div key={jl.code} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{jl.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      JL
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{jl.email}</p>
                  <p className="text-sm text-gray-500 mb-3">Team Members: {jl.teamMembers.length}</p>
                  
                  {/* Demote to Sales Button */}
                  {showDemoteConfirm === jl.code ? (
                    <div className="space-y-2">
                      <p className="text-xs text-red-600 font-medium">Are you sure?</p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => demoteToSales(jl.code)}
                          disabled={demotingUser === jl.code}
                          className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {demotingUser === jl.code ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-block h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" aria-hidden="true" />
                              Demoting...
                            </span>
                          ) : (
                            "Yes, Demote"
                          )}
                        </button>
                        <button
                          onClick={cancelDemote}
                          className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded-md font-medium hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => confirmDemote(jl.code)}
                      disabled={jl.teamMembers.length > 0}
                      className={`w-full px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                        jl.teamMembers.length > 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                      title={jl.teamMembers.length > 0 ? "Cannot demote JL with team members" : "Demote to Sales"}
                    >
                      Demote to Sales
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales Persons Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sales Persons</h2>
          {teamData.salesPersons.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No Sales Persons yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamData.salesPersons.map((salesperson) => (
                    <tr key={salesperson.code}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">{salesperson.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{salesperson.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {salesperson.assignedTo ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {teamData.juniorLeaders.find(jl => jl.code === salesperson.assignedTo)?.name || salesperson.assignedTo}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => promoteToJL(salesperson.code)}
                          disabled={promotingUser === salesperson.code}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {promotingUser === salesperson.code ? "Promoting..." : "Promote to JL"}
                        </button>
                        
                        {/* Assignment Controls */}
                        <div className="inline-flex items-center space-x-2">
                          {salesperson.assignedTo ? (
                            // Currently assigned - show reassignment options
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Reassign to:</span>
                              <select
                                value={jlSelections[salesperson.code] || ""}
                                onChange={(e) => setJlSelections(prev => ({ ...prev, [salesperson.code]: e.target.value }))}
                                className="px-2 py-1 border border-gray-300 rounded-md text-xs"
                              >
                                <option value="">Select new JL</option>
                                {teamData.juniorLeaders
                                  ?.filter(jl => jl.code !== salesperson.assignedTo)
                                  .map((jl) => (
                                    <option key={jl.code} value={jl.code}>
                                      {jl.name}
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={() => assignToJL(salesperson.code, jlSelections[salesperson.code] || "")}
                                disabled={!jlSelections[salesperson.code] || assigningUser === salesperson.code}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {assigningUser === salesperson.code ? "Reassigning..." : "Reassign"}
                              </button>
                              <button
                                onClick={() => unassignFromJL(salesperson.code)}
                                disabled={unassigningUser === salesperson.code}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {unassigningUser === salesperson.code ? "Unassigning..." : "Unassign"}
                              </button>
                            </div>
                          ) : (
                            // Not assigned - show assignment options
                            <div className="flex items-center space-x-2">
                              <select
                                value={jlSelections[salesperson.code] || ""}
                                onChange={(e) => setJlSelections(prev => ({ ...prev, [salesperson.code]: e.target.value }))}
                                className="px-2 text-black py-1 border border-gray-300 rounded-md text-xs"
                              >
                                <option value="">Select JL</option>
                                {teamData.juniorLeaders
                                  ?.filter(jl => jl.code !== salesperson.code)
                                  .map((jl) => (
                                    <option key={jl.code} value={jl.code}>
                                      {jl.name}
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={() => assignToJL(salesperson.code, jlSelections[salesperson.code] || "")}
                                disabled={!jlSelections[salesperson.code] || assigningUser === salesperson.code}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {assigningUser === salesperson.code ? "Assigning..." : "Assign"}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 