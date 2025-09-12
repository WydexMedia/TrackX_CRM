"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from 'react-hot-toast';
import Link from "next/link";
import TenantLogo from "@/components/TenantLogo";
import { useTenant } from "@/hooks/useTenant";

interface User {
  _id: string;
  name: string;
  code: string;
  email: string;
  role: string;
  target: number;
  password?: string;
}

interface Analytics {
  _id: string;
  name: string;
  code: string;
  email: string;
  target: number;
  achievedTarget: number;
  pendingTarget: number;
  todayCollection: number;
  lastMonthCollection: number;
  daysPending: number;
  totalSales: number;
  todaySales: number;
  thisMonthSales: number;
}

interface Call {
  _id: string;
  ogaName: string;
  callCompleted: string;
  callType: string;
  callStatus: string;
  notes: string;
  createdAt: string;
}

interface CallPerformance {
  ogaName: string;
  totalCalls: number;
  completedCalls: number;
  convertedCalls: number;
  conversionPercentage: number;
}

interface TeamLeader {
  _id?: string;
  name: string;
  code: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  about?: string;
}

function getTeamLeader() {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export default function TeamLeaderPage() {
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [credentials, setCredentials] = useState<User[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [callPerformance, setCallPerformance] = useState<CallPerformance[]>([]);
  const [teamLeader, setTeamLeader] = useState<TeamLeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    code: "",
    email: "",
    password: "",
    target: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof Analytics>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const [showKPIModal, setShowKPIModal] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<any>(null);
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [loadingKPI, setLoadingKPI] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showCallDetailsModal, setShowCallDetailsModal] = useState(false);
  const [selectedCallPerson, setSelectedCallPerson] = useState<string | null>(null);
  const [callDetails, setCallDetails] = useState<Call[]>([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState("institute");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    about: "",
    subdomain: ""
  });
  const router = useRouter();
  const { subdomain } = useTenant();

  useEffect(() => {
    const authenticateUser = async () => {
      // First check if we have a sessionId parameter (from redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('sessionId');
      
      if (sessionId) {
        try {
          // Validate the session and get user data
          const response = await fetch('/api/users/validate-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          
          if (response.ok) {
            const userData = await response.json();
            localStorage.setItem("user", JSON.stringify(userData));
            
            // Clean up the URL by removing the sessionId parameter
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('sessionId');
            window.history.replaceState({}, '', newUrl.toString());
            
            if (userData.role === 'teamleader') {
              setTeamLeader(userData);
              fetchData();
              return;
            }
          }
        } catch (error) {
          console.error('Session validation failed:', error);
        }
      }
      
      // Fallback to localStorage check
      const user = getTeamLeader();
      if (!user || user.role !== 'teamleader') {
        router.push("/login");
        return;
      }
      setTeamLeader(user);
      fetchData();
    };

    authenticateUser();
  }, [router]);

  // Initialize profile data when teamLeader changes
  useEffect(() => {
    if (teamLeader) {
      setProfileData({
        name: teamLeader.name || "",
        email: teamLeader.email || "",
        phone: teamLeader.phone || "",
        address: teamLeader.address || "",
        about: teamLeader.about || "",
        subdomain: subdomain ? `https://${subdomain}.nurturecrm.in` : ""
      });
    }
  }, [teamLeader, subdomain]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProfileDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.profile-dropdown')) {
          setShowProfileDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  const fetchData = async () => {
    try {
      const [analyticsRes, usersRes, credentialsRes, callsRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/users"),
        fetch("/api/users/credentials"),
        fetch("/api/calls")
      ]);

      if (analyticsRes.ok && usersRes.ok && credentialsRes.ok && callsRes.ok) {
        const analyticsData = await analyticsRes.json();
        const usersData = await usersRes.json();
        const credentialsData = await credentialsRes.json();
        const callsData = await callsRes.json();
        
        setAnalytics(analyticsData);
        setUsers(usersData.filter((user: User) => user.role !== 'teamleader'));
        setCredentials(credentialsData);
        setCalls(callsData);
        
        // Calculate call performance metrics
        const performanceMap = new Map<string, CallPerformance>();
        
        callsData.forEach((call: Call) => {
          // Skip NATC calls from total count
          if (call.callStatus === 'NATC') {
            return;
          }
          
          const existing = performanceMap.get(call.ogaName) || {
            ogaName: call.ogaName,
            totalCalls: 0,
            completedCalls: 0,
            convertedCalls: 0,
            conversionPercentage: 0
          };
          
          existing.totalCalls += 1;
          
          // Count QUALIFIED, CONNECTED_TO_WHATSAPP, and POSITIVE as completed calls
          if (call.callStatus === 'QUALIFIED' || call.callStatus === 'CONNECTED_TO_WHATSAPP' || call.callStatus === 'POSITIVE') {
            existing.completedCalls += 1;
          }
          
          // Only count POSITIVE as converted calls
          if (call.callStatus === 'POSITIVE') {
            existing.convertedCalls += 1;
          }
          
          performanceMap.set(call.ogaName, existing);
        });
        
        // Calculate conversion percentages
        const performanceArray = Array.from(performanceMap.values()).map(perf => ({
          ...perf,
          conversionPercentage: perf.completedCalls > 0 ? 
            ((perf.convertedCalls / perf.completedCalls) * 100) : 0
        }));
        
        setCallPerformance(performanceArray);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = async () => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const parsed = stored ? JSON.parse(stored) : null;
      const sessionId = parsed?.sessionId;
      
      if (sessionId) {
        console.log('🔐 Logging out with sessionId:', sessionId);
        try {
          // Wait for the logout API to complete
          const response = await fetch('/api/users/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          
          const result = await response.json();
          if (response.ok && result.success) {
            console.log('✅ Session successfully revoked');
          } else {
            console.warn('⚠️ Logout API warning:', result.error || 'Unknown error');
          }
        } catch (error) {
          console.error('❌ Error calling logout API:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error in logout handler:', error);
    }
    
    // Clean up local storage and navigate after API call
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Make API call to save profile data
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: teamLeader?._id,
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          address: profileData.address,
          about: profileData.about
        }),
      });

      if (response.ok) {
        toast.success("Profile updated successfully");
        setIsEditingProfile(false);
        
        // Update teamLeader state with new data
        if (teamLeader) {
          const updatedTeamLeader = {
            ...teamLeader,
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
            address: profileData.address,
            about: profileData.about
          };
          setTeamLeader(updatedTeamLeader);
          
          // Update localStorage as well
          localStorage.setItem("user", JSON.stringify(updatedTeamLeader));
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update profile");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }
    
    try {
      // Make API call to change password
      const response = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: teamLeader?._id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
      });

      if (response.ok) {
        toast.success("Password changed successfully");
        setActiveProfileTab("institute");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to change password");
      }
    } catch (error) {
      toast.error("Failed to change password");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        toast.success("User created successfully");
        setShowAddUser(false);
        setNewUser({ name: "", code: "", email: "", password: "", target: 0 });
        fetchData();
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
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser),
      });

      if (res.ok) {
        toast.success("User updated successfully");
        setEditingUser(null);
        fetchData();
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
    if (!confirm("Are you sure you want to delete this user?")) return;

    setIsDeletingUser(userId);
    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("User deleted successfully");
        fetchData();
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

  const handleSort = (column: keyof Analytics) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleSalesPersonClick = async (salesPerson: any) => {
    setSelectedSalesPerson(salesPerson);
    setShowKPIModal(true);
    setLoadingKPI(true);
    
    try {
      // Fetch both daily reports and sales data
      const [dailyReportsResponse, salesResponse] = await Promise.all([
        fetch('/api/daily-reports'),
        fetch('/api/sales')
      ]);
      
      const dailyReportsData = await dailyReportsResponse.json();
      const salesData = await salesResponse.json();
      
      if (dailyReportsData.error) {
        throw new Error(dailyReportsData.error);
      }
      
      // Filter sales data for the selected sales person
      const salesPersonSales = salesData.filter((sale: any) => 
        sale.ogaName?.toLowerCase() === salesPerson.name.toLowerCase()
      );
      
      // Create a map of daily sales amounts
      const dailySalesMap = new Map();
      const dailySalesCountMap = new Map();
      
      salesPersonSales.forEach((sale: any) => {
        if (sale.createdAt) {
          const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
          const existingAmount = dailySalesMap.get(saleDate) || 0;
          const existingCount = dailySalesCountMap.get(saleDate) || 0;
          dailySalesMap.set(saleDate, existingAmount + (sale.amount || 0));
          dailySalesCountMap.set(saleDate, existingCount + 1);
        }
      });
      
      // Get all unique dates from both daily reports and sales data
      const allDates = new Set();
      
      // Add dates from daily reports
      dailyReportsData.reports.forEach((report: any) => {
        if (report.salespersons.some((sp: any) => 
          sp.name.toLowerCase() === salesPerson.name.toLowerCase()
        )) {
          allDates.add(new Date(report.date).toISOString().split('T')[0]);
        }
      });
      
      // Add dates from sales data
      salesPersonSales.forEach((sale: any) => {
        if (sale.createdAt) {
          allDates.add(new Date(sale.createdAt).toISOString().split('T')[0]);
        }
      });
      
                    // Create comprehensive daily data
       const comprehensiveData = Array.from(allDates).map((dateStr) => {
         const date = new Date(dateStr as string);
         const dailyAmount = dailySalesMap.get(dateStr as string) || 0;
        const salesCount = dailySalesCountMap.get(dateStr) || 0;
        
        // Find corresponding daily report data
        const dailyReport = dailyReportsData.reports.find((report: any) => {
          const reportDate = new Date(report.date).toISOString().split('T')[0];
          return reportDate === dateStr && report.salespersons.some((sp: any) => 
            sp.name.toLowerCase() === salesPerson.name.toLowerCase()
          );
        });
        
        const salesPersonData = dailyReport?.salespersons.find((sp: any) => 
          sp.name.toLowerCase() === salesPerson.name.toLowerCase()
        );
        
        return {
          _id: dailyReport?._id || `sales_${dateStr}`,
          date: date.toISOString(),
          dailyAmount: dailyAmount,
          salesCount: salesCount,
          leadsAssigned: salesPersonData?.prospects || 0,
          salesConverted: salesCount,
          // Use sales data for more accurate conversion calculation
          conversionRate: salesPersonData?.prospects > 0 ? ((salesCount / salesPersonData.prospects) * 100).toFixed(1) : 0
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending
      
      setKpiData(comprehensiveData);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      toast.error('Failed to load KPI data');
    } finally {
      setLoadingKPI(false);
    }
  };

  const filterDataByDateRange = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return kpiData;
    }
    
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    return kpiData.filter((report) => {
      const reportDate = new Date(report.date);
      return reportDate >= startDate && reportDate <= endDate;
    });
  };

  const filteredKpiData = filterDataByDateRange();

  // Calculate total sales for the filtered date range
  const calculateFilteredSales = () => {
    if (filteredKpiData.length === 0) {
      return selectedSalesPerson?.todaySales || 0;
    }
    
    // Count days with actual sales activity (dailyAmount > 0)
    return filteredKpiData.filter(report => (report.dailyAmount || 0) > 0).length;
  };

  const filteredSales = calculateFilteredSales();

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
      setVisiblePasswords(new Set(credentials.map(user => user._id)));
    }
  };

  const handleCallPersonClick = (ogaName: string) => {
    setSelectedCallPerson(ogaName);
    setShowCallDetailsModal(true);
    
    // Filter calls for the selected sales person, including NATC calls for display
    const personCalls = calls.filter(call => call.ogaName === ogaName);
    setCallDetails(personCalls);
  };

  const filteredAndSortedAnalytics = analytics
    .filter(user =>
      (user.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.code?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

  // Sort analytics by achieved target for top performers
  const topPerformers = [...analytics].sort((a, b) => b.achievedTarget - a.achievedTarget);

  const totalTarget = analytics.reduce((sum, user) => sum + user.target, 0);
  const totalAchieved = analytics.reduce((sum, user) => sum + user.achievedTarget, 0);
  const totalPending = analytics.reduce((sum, user) => sum + user.pendingTarget, 0);
  const totalTodayCollection = analytics.reduce((sum, user) => sum + user.todayCollection, 0);
  const totalSales = analytics.reduce((sum, user) => sum + user.totalSales, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <div className="h-8 bg-gray-200 rounded-lg w-64 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-12 bg-gray-200 rounded-lg w-40 animate-pulse"></div>
                <div className="h-12 bg-gray-200 rounded-lg w-20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Search Bar Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="h-10 bg-gray-200 rounded-md animate-pulse"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[...Array(8)].map((_, i) => (
                      <th key={i} className="px-6 py-3 text-left">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(8)].map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {[...Array(8)].map((_, colIndex) => (
                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!teamLeader) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

    {/* Standard Header */}
    <div className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Navigation Bar */}
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            {/* Logo Section */}
            <div className="flex items-center space-x-3">
              {subdomain && (
                <TenantLogo 
                  subdomain={subdomain} 
                  className="w-10 h-10 rounded-lg shadow-sm"
                  fallbackText={subdomain.toUpperCase().slice(0, 2)}
                />
              )}
              
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            
            {/* Title Section */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Team Analytics Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Welcome back, <span className="font-semibold text-blue-600">{teamLeader.name}</span>
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCredentials(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
              title="View Credentials"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className="text-sm font-medium">Credentials</span>
            </button>
            
            <button
              onClick={() => setShowAddUser(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm font-medium">Add Member</span>
            </button>
            
            {/* Profile Dropdown */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="bg-gray-100 cursor-pointer hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors duration-200"
                title="Profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{teamLeader?.name}</p>
                      <p className="text-xs text-gray-500">{teamLeader?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowEditProfile(true);
                        setShowProfileDropdown(false);
                      }}
                      className="w-full cursor-pointer text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg transition-colors duration-200"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-gray-200 pt-4 pb-6">
          <nav className="flex space-x-8">
            <Link href="/leaderboard">
              <div className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Sales Leaderboard
              </div>
            </Link>
            
            <Link href="/team-leader/lead-management">
              <div className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm6 0a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
                Lead Management
              </div>
            </Link>

            <Link href="/team-leader/team-management">
              <div className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Team Management
              </div>
            </Link>
          </nav>
        </div>
      </div>
    </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Performers Stage */}
        <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-2xl shadow-2xl mb-8 overflow-hidden relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-400 rounded-full"></div>
            <div className="absolute top-32 right-20 w-24 h-24 bg-purple-400 rounded-full"></div>
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-blue-400 rounded-full"></div>
          </div>

          <div className="relative z-10 p-8">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-2">🏆 Top Performers</h2>
              <p className="text-purple-200 text-lg">This Month's Champions</p>
            </div>

            <div className="flex justify-center items-end space-x-4 md:space-x-8 lg:space-x-12">
              {/* 2nd Place */}
              {topPerformers.length > 1 && (
                <div className="flex flex-col items-center transform translate-y-4">
                  <div className="relative">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-lg border-4 border-gray-200">
                      <span className="text-2xl md:text-3xl font-bold text-gray-700">🥈</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <div className="text-white font-semibold text-sm md:text-base">{topPerformers[1].name}</div>
                    <div className="text-purple-200 text-xs md:text-sm">₹{topPerformers[1].achievedTarget.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topPerformers.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-200 animate-pulse">
                      <span className="text-3xl md:text-4xl">👑</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">1</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <div className="text-white font-bold text-lg md:text-xl">{topPerformers[0].name}</div>
                    <div className="text-yellow-200 text-sm md:text-base font-semibold">₹{topPerformers[0].achievedTarget.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topPerformers.length > 2 && (
                <div className="flex flex-col items-center transform translate-y-8">
                  <div className="relative">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-orange-300 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-4 border-orange-200">
                      <span className="text-xl md:text-2xl font-bold text-orange-700">🥉</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">3</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <div className="text-white font-semibold text-sm md:text-base">{topPerformers[2].name}</div>
                    <div className="text-orange-200 text-xs md:text-sm">₹{topPerformers[2].achievedTarget.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Stage Platform */}
            <div className="mt-8 flex justify-center">
              <div className="w-80 h-4 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-full shadow-lg"></div>
            </div>
          </div>
        </div>
        

          {/* Standard Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Target</p>
                <p className="text-2xl font-bold text-gray-900">₹{totalTarget.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Achieved</p>
                <p className="text-2xl font-bold text-gray-900">₹{totalAchieved.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">₹{totalPending.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Collection</p>
                <p className="text-2xl font-bold text-gray-900">₹{totalTodayCollection.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Standard Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, code, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredAndSortedAnalytics.length} of {analytics.length} team members
            </div>
          </div>
        </div>

        {/* Standard Analytics Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Team Performance Analytics</h3>
            <p className="text-sm text-gray-500 mt-1">Overview of your sales team's performance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      Sales Person
                      {sortBy === "name" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("target")}
                  >
                    <div className="flex items-center gap-2">
                      Target
                      {sortBy === "target" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("achievedTarget")}
                  >
                    <div className="flex items-center gap-2">
                      Achieved
                      {sortBy === "achievedTarget" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("pendingTarget")}
                  >
                    <div className="flex items-center gap-2">
                      Pending
                      {sortBy === "pendingTarget" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("todayCollection")}
                  >
                    <div className="flex items-center gap-2">
                      Today's Collection
                      {sortBy === "todayCollection" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("lastMonthCollection")}
                  >
                    <div className="flex items-center gap-2">
                      Last Month
                      {sortBy === "lastMonthCollection" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("daysPending")}
                  >
                    <div className="flex items-center gap-2">
                      Days Remaining
                      {sortBy === "daysPending" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("totalSales")}
                  >
                    <div className="flex items-center gap-2">
                      Total Sales
                      {sortBy === "totalSales" && (
                        <svg className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedAnalytics.map((user, index) => {
                  const achievementPercentage = user.target > 0 ? (user.achievedTarget / user.target) * 100 : 0;
                  const daysRemaining = user.daysPending;
                  const isUrgent = daysRemaining <= 7 && daysRemaining > 0;

                  return (
                    <tr key={user._id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {(user.name || '').split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div 
                              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => handleSalesPersonClick(user)}
                            >
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">{user.code}</div>
                            <div className="text-xs text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">₹{user.target.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">₹{user.achievedTarget.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{achievementPercentage.toFixed(1)}% achieved</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(achievementPercentage, 100)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-orange-600">₹{user.pendingTarget.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-600">₹{user.todayCollection.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{user.todaySales} sales today</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">₹{user.lastMonthCollection.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${isUrgent ? 'text-orange-600' : 'text-gray-900'}`}>
                          {daysRemaining} days
                        </div>
                        {isUrgent && (
                          <div className="text-xs text-orange-500">Urgent</div>
                        )}
                        {daysRemaining === 0 && (
                          <div className="text-xs text-red-500">Month ends today</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{user.totalSales}</div>
                        <div className="text-xs text-gray-500">{user.thisMonthSales} this month</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const u = users.find(u => u._id === user._id);
                              if (u) {
                                setEditingUser({
                                  _id: u._id,
                                  name: u.name,
                                  code: u.code,
                                  email: u.email,
                                  role: u.role,
                                  target: typeof u.target === 'number' ? u.target : 0
                                });
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            disabled={isDeletingUser === user._id}
                            className={`font-medium ${isDeletingUser === user._id
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-red-600 hover:text-red-900'
                              }`}
                          >
                            {isDeletingUser === user._id ? (
                              <div className="flex items-center space-x-1">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Deleting...</span>
                              </div>
                            ) : (
                              'Delete'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredAndSortedAnalytics.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No team members found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new sales person.</p>
          </div>
        )}
      </div>

      {/* Call Performance Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Call Performance Overview</h3>
            <p className="text-sm text-gray-600 mt-1">Track call completion and conversion rates for all sales people</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales Person
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Converted Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {callPerformance.length > 0 ? (
                  callPerformance.map((performance, index) => (
                    <tr key={performance.ogaName} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {(performance.ogaName || '').split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div 
                              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors"
                              onClick={() => handleCallPersonClick(performance.ogaName)}
                            >
                              {performance.ogaName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{performance.totalCalls}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-600">{performance.completedCalls}</div>
                        <div className="text-xs text-gray-500">
                          {performance.totalCalls > 0 ? ((performance.completedCalls / performance.totalCalls) * 100).toFixed(1) : 0}% completion rate
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">{performance.convertedCalls}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-purple-600">{performance.conversionPercentage.toFixed(1)}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(performance.conversionPercentage, 100)}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <p className="text-lg font-medium">No call data available</p>
                        <p className="text-sm">Call performance data will appear here once sales people start logging calls.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Credentials Modal */}
      {showCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Team Credentials</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleAllPasswords}
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {visiblePasswords.size === credentials.length ? 'Hide All' : 'Show All'}
                </button>
                <button
                  onClick={() => setShowCredentials(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> These are the login credentials for all team members. 
                  Passwords are hidden by default for security. Click the eye icon to reveal passwords.
                </p>
              </div>
              
              <div className="grid gap-4">
                {credentials.map((user) => (
                  <div key={user._id} className="bg-white border border-gray-200 rounded-lg p-4">
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
                            <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                            <p className="text-sm text-gray-500">{user.code}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">Login ID</div>
                          <div className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                            {user.code}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">Password</div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded min-w-[120px]">
                              {visiblePasswords.has(user._id) ? (user.password || 'No password set') : '••••••'}
                            </div>
                            <button
                              onClick={() => togglePasswordVisibility(user._id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title={visiblePasswords.has(user._id) ? 'Hide password' : 'Show password'}
                            >
                              {visiblePasswords.has(user._id) ? (
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {credentials.length === 0 && (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No team members found</h3>
                  <p className="mt-1 text-sm text-gray-500">Add team members to view their credentials.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl text-black font-bold mb-4">Add New Sales Person</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={newUser.code}
                  onChange={(e) => setNewUser({ ...newUser, code: e.target.value })}
                  className="w-full text-black  px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full text-black  px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full text-black  px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target (₹)</label>
                <input
                  type="number"
                  required
                  value={newUser.target}
                  onChange={(e) =>
                    setNewUser({ ...newUser, target: parseInt(e.target.value) || 0 })
                  }
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none no-spinner"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className={`flex-1 py-2 px-4 rounded-md font-medium ${isAddingUser
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isAddingUser ? (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Adding...</span>
                    </div>
                  ) : (
                    'Add User'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  disabled={isAddingUser}
                  className={`flex-1 py-2 px-4 rounded-md font-medium ${isAddingUser
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed text-black inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl !text-black font-bold mb-4">Edit User</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={editingUser.code}
                  onChange={(e) => setEditingUser({ ...editingUser, code: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target (₹)</label>
                <input
                  type="number"
                  required
                  value={editingUser.target}
                  onChange={(e) => setEditingUser({ ...editingUser, target: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className={`flex-1 py-2 px-4 rounded-md font-medium ${isUpdatingUser
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isUpdatingUser ? (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Updating...</span>
                    </div>
                  ) : (
                    'Update User'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isUpdatingUser}
                  className={`flex-1 py-2 px-4 rounded-md font-medium ${isUpdatingUser
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPI Modal */}
      {showKPIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                KPI Dashboard - {selectedSalesPerson?.name}
              </h2>
              <button
                onClick={() => setShowKPIModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingKPI ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-lg text-gray-600">Loading KPI data...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Date Range Filter */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Range Filter</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                          className="flex-1 text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Start Date"
                        />
                        <span className="flex items-center text-gray-500">to</span>
                        <input
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                          className="flex-1 text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="End Date"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => setDateRange({startDate: '', endDate: ''})}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Clear Filter
                    </button>
                  </div>
                  {dateRange.startDate && dateRange.endDate && (
                    <div className="mt-2 text-sm text-gray-600">
                      Showing data from {new Date(dateRange.startDate).toLocaleDateString()} to {new Date(dateRange.endDate).toLocaleDateString()}
                      <span className="ml-2 text-blue-600 font-medium">
                        ({filteredKpiData.length} records)
                      </span>
                    </div>
                  )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Total Leads</p>
                        <p className="text-2xl font-bold">
                          {filteredKpiData.reduce((sum, report) => 
                            sum + (parseInt(report.leadsAssigned) || 0), 0
                          )}
                        </p>
                      </div>
                      <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Sales Converted</p>
                        <p className="text-2xl font-bold">
                          {filteredKpiData.reduce((sum, report) => 
                            sum + (parseInt(report.salesConverted) || 0), 0
                          )}
                        </p>
                      </div>
                      <svg className="w-8 h-8 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Amount Collected</p>
                        <p className="text-2xl font-bold">
                          ₹{filteredKpiData.reduce((sum, report) => sum + (report.dailyAmount || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm">Conversion %</p>
                        <p className="text-2xl font-bold">
                          {(() => {
                            const totalLeads = filteredKpiData.reduce((sum, report) => 
                              sum + (parseInt(report.leadsAssigned) || 0), 0
                            );
                            const totalSales = filteredKpiData.reduce((sum, report) => 
                              sum + (parseInt(report.salesConverted) || 0), 0
                            );
                            return totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(1) : 0;
                          })()}%
                        </p>
                      </div>
                      <svg className="w-8 h-8 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Detailed KPI Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Daily Performance Breakdown</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Leads Assigned
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sales Converted
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount Collected
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Conversion %
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ad Spend
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ad Spend %
                          </th>
                        </tr>
                      </thead>
                                             <tbody className="bg-white divide-y divide-gray-200">
                                                 {filteredKpiData.length > 0 ? (
                          filteredKpiData.map((report, index) => {
                           const leadsAssigned = parseInt(report.leadsAssigned) || 0;
                           const salesConverted = parseInt(report.salesConverted) || 0;
                           const amountCollected = parseFloat(report.dailyAmount) || 0;
                           const conversionRate = parseFloat(report.conversionRate) || 0;
                           const adSpend = leadsAssigned * 50;
                           const adSpendPercentage = amountCollected > 0 ? ((adSpend / amountCollected) * 100).toFixed(1) : 0;

                           return (
                             <tr key={report._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                               <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                 {new Date(report.date).toLocaleDateString('en-IN', {
                                   year: 'numeric',
                                   month: 'short',
                                   day: 'numeric'
                                 })}
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                 {leadsAssigned}
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                 {salesConverted}
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                                 ₹{amountCollected.toLocaleString()}
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-semibold">
                                 {conversionRate}%
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-semibold">
                                 ₹{adSpend.toLocaleString()}
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                                 {adSpendPercentage}%
                               </td>
                             </tr>
                           );
                         })
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                                           <div className="flex flex-col items-center">
                               <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                               </svg>
                               <p className="text-lg font-medium">
                                 {dateRange.startDate && dateRange.endDate ? 'No data found for selected date range' : 'No KPI data available'}
                               </p>
                               <p className="text-sm">
                                 {dateRange.startDate && dateRange.endDate 
                                   ? 'Try adjusting your date range or clear the filter.'
                                   : 'No performance data found for this sales person.'
                                 }
                               </p>
                             </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call Details Modal */}
      {showCallDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Call Details - {selectedCallPerson}
              </h2>
              <button
                onClick={() => setShowCallDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {callDetails.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Call Completed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Call Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Call Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {callDetails.map((call, index) => (
                        <tr key={call._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {new Date(call.createdAt).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              call.callStatus === 'QUALIFIED' || call.callStatus === 'CONNECTED_TO_WHATSAPP' || call.callStatus === 'POSITIVE'
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {call.callStatus === 'QUALIFIED' || call.callStatus === 'CONNECTED_TO_WHATSAPP' || call.callStatus === 'POSITIVE' ? 'Completed' : 'Not Completed'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              call.callType === 'new' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {call.callType === 'new' ? 'New' : 'Follow-up'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              call.callStatus === 'QUALIFIED' 
                                ? 'bg-green-100 text-green-800'
                                : call.callStatus === 'CONNECTED_TO_WHATSAPP'
                                ? 'bg-green-100 text-green-800'
                                : call.callStatus === 'POSITIVE'
                                ? 'bg-blue-100 text-blue-800'
                                : call.callStatus === 'Junk'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {call.callStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs">
                              {call.notes}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No call details found</h3>
                <p className="text-sm text-gray-500">
                  {selectedCallPerson} hasn't logged any calls yet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex shadow-2xl border border-gray-200">
            {/* Sidebar */}
            <div className="w-64 bg-gray-50 p-6 border-r border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Manage</h2>
                             <nav className="space-y-2">
                 <div 
                   onClick={() => setActiveProfileTab("institute")}
                   className={`py-2 px-3 rounded-md cursor-pointer ${
                     activeProfileTab === "institute" 
                       ? "text-teal-600 font-medium bg-white shadow-sm" 
                       : "text-gray-600 hover:bg-white"
                   }`}
                 >
                   Institute Profile
                 </div>
                
                 <div className="text-gray-600 py-2 px-3 hover:bg-white rounded-md cursor-pointer">
                   Courses
                 </div>
                 <div className="text-gray-600 py-2 px-3 hover:bg-white rounded-md cursor-pointer">
                   Batches
                 </div>
                 <div className="text-gray-600 py-2 px-3 hover:bg-white rounded-md cursor-pointer">
                   Billing
                 </div>
               </nav>
              
              <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-4">My Profile</h3>
              <nav className="space-y-2">
                <div className="text-gray-600 py-2 px-3 hover:bg-white rounded-md cursor-pointer">
                  User Details
                </div>
                <div 
                  onClick={() => setActiveProfileTab("changePassword")}
                  className={`py-2 px-3 hover:bg-white rounded-md cursor-pointer ${
                    activeProfileTab === "changePassword" 
                      ? "text-teal-600 font-medium bg-white shadow-sm" 
                      : "text-gray-600"
                  }`}
                >
                  Change Password
                </div>
                <div className="text-gray-600 py-2 px-3 hover:bg-white rounded-md cursor-pointer">
                  Notifications
                </div>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Header with background pattern */}
              <div className="h-32 bg-gradient-to-r from-gray-100 to-gray-200 relative">
                <div className="absolute inset-0 bg-white bg-opacity-50"></div>
                                 <div className="absolute top-4 right-4">
                   <button
                     onClick={() => {
                       setShowEditProfile(false);
                       setIsEditingProfile(false);
                     }}
                     className="text-gray-500 hover:text-gray-700 p-2"
                   >
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                 </div>
              </div>

                             <div className="p-8">
                 {/* Institute Profile Content */}
                 {activeProfileTab === "institute" && (
                   <form onSubmit={handleProfileSave} className="space-y-8">
                     {/* Profile Title and Edit Button */}
                     <div className="flex items-center justify-between">
                       <h1 className="text-2xl font-bold text-gray-900">{profileData.name || 'Profile'}</h1>
                       <button
                         type="button"
                         onClick={() => setIsEditingProfile(!isEditingProfile)}
                         className="text-gray-400 hover:text-gray-600 p-2"
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                         </svg>
                       </button>
                     </div>

                     {/* Contact Information */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="flex items-center space-x-3">
                         <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                         </svg>
                         {isEditingProfile ? (
                           <input
                             type="email"
                             value={profileData.email}
                             onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                             className="flex-1 text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                             placeholder="Email"
                           />
                         ) : (
                           <span className="flex-1 text-gray-600">{profileData.email || 'No email provided'}</span>
                         )}
                       </div>
                       
                       <div className="flex items-center space-x-3">
                         <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                         </svg>
                         {isEditingProfile ? (
                           <input
                             type="tel"
                             value={profileData.phone}
                             onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                             className="flex-1 text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                             placeholder="Phone"
                           />
                         ) : (
                           <span className="flex-1 text-gray-600">{profileData.phone || 'No phone provided'}</span>
                         )}
                       </div>
                     </div>

                     {/* Subdomain and Address */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Subdomain:</label>
                         <div className="w-full text-blue-600 bg-transparent">
                           {profileData.subdomain || 'No subdomain configured'}
                         </div>
                       </div>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Address:</label>
                         {isEditingProfile ? (
                           <textarea
                             value={profileData.address}
                             onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                             rows={2}
                             className="w-full text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                             placeholder="Enter address"
                           />
                         ) : (
                           <div className="w-full text-gray-600">
                             {profileData.address || 'No address provided'}
                           </div>
                         )}
                       </div>
                     </div>

                     {/* About and Social Media */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                         <div className="flex items-center justify-between mb-4">
                           <h3 className="text-lg font-semibold text-gray-900">About</h3>
                           <button
                             type="button"
                             onClick={() => setIsEditingProfile(!isEditingProfile)}
                             className="text-gray-400 hover:text-gray-600 p-1"
                           >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                             </svg>
                           </button>
                         </div>
                         {isEditingProfile ? (
                           <textarea
                             value={profileData.about}
                             onChange={(e) => setProfileData({ ...profileData, about: e.target.value })}
                             rows={4}
                             className="w-full text-gray-900 bg-white border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                             placeholder="Tell us about yourself..."
                           />
                         ) : (
                           <div className="w-full text-gray-600 border border-gray-200 rounded-md p-3 min-h-[100px]">
                             {profileData.about || 'No information provided'}
                           </div>
                         )}
                       </div>

                       <div>
                         <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media</h3>
                         <div className="space-y-4">
                           <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg">
                             <div className="text-center">
                               <button
                                 type="button"
                                 className="text-teal-600 hover:text-teal-700 font-medium"
                               >
                                 Add Social Media
                               </button>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Save Button - Only show when editing */}
                     {isEditingProfile && (
                       <div className="flex justify-end pt-6 border-t border-gray-200">
                         <div className="flex space-x-3">
                           <button
                             type="button"
                             onClick={() => {
                               setIsEditingProfile(false);
                               // Reset form data to original values
                               if (teamLeader) {
                                 setProfileData({
                                   name: teamLeader.name || "",
                                   email: teamLeader.email || "",
                                   phone: teamLeader.phone || "",
                                   address: teamLeader.address || "",
                                   about: teamLeader.about || "",
                                   subdomain: subdomain ? `https://${subdomain}.nurturecrm.in` : ""
                                 });
                               }
                             }}
                             className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
                           >
                             Cancel
                           </button>
                           <button
                             type="submit"
                             className="px-6 py-2 bg-teal-600 text-white rounded-md font-medium hover:bg-teal-700 transition-colors"
                           >
                             Save Changes
                           </button>
                         </div>
                       </div>
                     )}
                   </form>
                 )}

                 {/* Change Password Content */}
                 {activeProfileTab === "changePassword" && (
                   <div className="space-y-8">
                     <div className="flex items-center justify-between">
                       <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
                     </div>

                     <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                         <input
                           type="password"
                           required
                           value={passwordData.currentPassword}
                           onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                           className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                         />
                       </div>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                         <input
                           type="password"
                           required
                           minLength={6}
                           value={passwordData.newPassword}
                           onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                           className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                         />
                         <p className="text-sm text-gray-500 mt-1">Password must be at least 6 characters long</p>
                       </div>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                         <input
                           type="password"
                           required
                           minLength={6}
                           value={passwordData.confirmPassword}
                           onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                           className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                         />
                       </div>

                       <div className="flex space-x-3 pt-4">
                         <button
                           type="button"
                           onClick={() => {
                             setActiveProfileTab("institute");
                             setPasswordData({
                               currentPassword: "",
                               newPassword: "",
                               confirmPassword: ""
                             });
                           }}
                           className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
                         >
                           Cancel
                         </button>
                         <button
                           type="submit"
                           className="px-6 py-2 bg-teal-600 text-white rounded-md font-medium hover:bg-teal-700 transition-colors"
                         >
                           Change Password
                         </button>
                       </div>
                     </form>
                   </div>
                 )}
               </div>
            </div>
                     </div>
         </div>
       )}

      
    </div>
  );
}