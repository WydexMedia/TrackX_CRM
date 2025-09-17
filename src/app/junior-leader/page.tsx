"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { setupPeriodicTokenValidation } from '@/lib/tokenValidation';

interface User {
  _id: string;
  code: string;
  name: string;
  email: string;
  role: string;
  target: number;
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
}

interface Call {
  _id: string;
  ogaName: string;
  callCompleted: string;
}

interface CallPerformance {
  name: string;
  totalCalls: number;
  completedCalls: number;
  conversionPercentage: number;
}

export default function JuniorLeaderPage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [callPerformance, setCallPerformance] = useState<CallPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKPIModal, setShowKPIModal] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<any>(null);
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [loadingKPI, setLoadingKPI] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const router = useRouter();

  useEffect(() => {
    const authenticateUser = async () => {
      // First check if we have a token parameter (from redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      if (token) {
        try {
          // Validate the token and get user data
          const response = await fetch('/api/users/validate-session', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token })
          });
          
          if (response.ok) {
            const userData = await response.json();
            localStorage.setItem("user", JSON.stringify(userData));
            localStorage.setItem("token", userData.token);
            
            // Clean up the URL by removing the token parameter
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('token');
            window.history.replaceState({}, '', newUrl.toString());
            
            if (userData.role === "jl") {
              fetchTeamData(userData.email);
              fetchAnalytics();
              fetchCalls();
              return;
            } else {
              router.push("/dashboard");
              return;
            }
          } else if (response.status === 401) {
            const errorData = await response.json();
            if (errorData.code === 'TOKEN_REVOKED_NEW_LOGIN') {
              // User logged in from another device
              localStorage.removeItem("user");
              localStorage.removeItem("token");
              toast.error('You have been logged out because you logged in from another device.', {
                duration: 5000,
                style: {
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fecaca'
                }
              });
              router.push("/login");
              return;
            }
          }
        } catch (error) {
          console.error('Session validation failed:', error);
        }
      }
      
      // Fallback to localStorage check
      const user = localStorage.getItem("user");
      if (!user) {
        router.push("/login");
        return;
      }

      const userData = JSON.parse(user);
      if (userData.role !== "jl") {
        router.push("/dashboard");
        return;
      }

      fetchTeamData(userData.email);
      fetchAnalytics();
      fetchCalls();
    };

    authenticateUser();
    
    // Set up periodic token validation
    const redirectToLogin = () => router.push("/login");
    const validationInterval = setupPeriodicTokenValidation(redirectToLogin, 60000); // Check every 60 seconds
    
    return () => {
      clearInterval(validationInterval);
    };
  }, [router]);

  const fetchTeamData = async (userEmail: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tl/team-management?userId=${encodeURIComponent(userEmail)}`);
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

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/analytics");
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const fetchCalls = async () => {
    try {
      const response = await fetch("/api/calls");
      if (response.ok) {
        const data = await response.json();
        setCalls(data);
        
        // Calculate call performance for team members
        if (teamData) {
          const performanceMap = new Map<string, CallPerformance>();
          
          data.forEach((call: Call) => {
            const salespersonName = call.ogaName;
            if (salespersonName) {
              if (!performanceMap.has(salespersonName)) {
                performanceMap.set(salespersonName, {
                  name: salespersonName,
                  totalCalls: 0,
                  completedCalls: 0,
                  conversionPercentage: 0
                });
              }
              
              const performance = performanceMap.get(salespersonName)!;
              performance.totalCalls++;
              
              if (call.callCompleted === "yes") {
                performance.completedCalls++;
              }
            }
          });
          
          // Calculate conversion percentages
          performanceMap.forEach(performance => {
            performance.conversionPercentage = performance.totalCalls > 0 
              ? Math.round((performance.completedCalls / performance.totalCalls) * 100)
              : 0;
          });
          
          setCallPerformance(Array.from(performanceMap.values()));
        }
      }
    } catch (error) {
      console.error("Error fetching calls:", error);
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
      
      // Create comprehensive daily data - EXACTLY like Team Leader
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

  const currentJL = teamData.juniorLeaders[0]; // JL should only see themselves
  const assignedSales = teamData.salesPersons;
  
  // Filter analytics to only show team members
  const teamAnalytics = analytics.filter(analyticsItem => 
    assignedSales.some(sales => sales.name.toLowerCase() === analyticsItem.name.toLowerCase())
  );
  
  // Filter call performance to only show team members
  const teamCallPerformance = callPerformance.filter(performance => 
    assignedSales.some(sales => sales.name.toLowerCase() === performance.name.toLowerCase())
  );

  // Calculate team totals
  const teamTotalTarget = teamAnalytics.reduce((sum, item) => sum + (item.target || 0), 0);
  const teamTotalAchieved = teamAnalytics.reduce((sum, item) => sum + (item.achievedTarget || 0), 0);
  const teamTotalCollection = teamAnalytics.reduce((sum, item) => sum + (item.todayCollection || 0), 0);
  const teamTotalSales = teamAnalytics.reduce((sum, item) => sum + (item.totalSales || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Junior Leader Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your assigned team members and view performance</p>
        </div>

        {/* JL Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{currentJL.name}</h2>
              <p className="text-gray-600">{currentJL.email}</p>
              <p className="text-sm text-gray-500">Role: Junior Leader</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{assignedSales.length}</div>
              <p className="text-sm text-gray-600">Team Members</p>
            </div>
          </div>
        </div>

        {/* Team Performance Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{teamTotalTarget}</div>
              <p className="text-sm text-gray-600">Total Target</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{teamTotalAchieved}</div>
              <p className="text-sm text-gray-600">Achieved</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{teamTotalCollection}</div>
              <p className="text-sm text-gray-600">Today's Collection</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{teamTotalSales}</div>
              <p className="text-sm text-gray-600">Total Sales</p>
            </div>
          </div>
        </div>

        {/* Team Members with Analytics */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Team Members Performance</h3>
          {assignedSales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No team members assigned yet</p>
              <p className="text-sm text-gray-400">Team Leader will assign sales persons to your team</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Achieved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Today's Collection
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Call Performance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignedSales.map((salesperson) => {
                    const analytics = teamAnalytics.find(a => 
                      a.name.toLowerCase() === salesperson.name.toLowerCase()
                    );
                    const callPerf = teamCallPerformance.find(c => 
                      c.name.toLowerCase() === salesperson.name.toLowerCase()
                    );
                    
                    return (
                      <tr key={salesperson.code}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-green-600 font-medium text-lg">
                                {salesperson.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div 
                                className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer"
                                onClick={() => handleSalesPersonClick(salesperson)}
                              >
                                {salesperson.name}
                              </div>
                              <div className="text-sm text-gray-500">{salesperson.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{analytics?.target || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{analytics?.achievedTarget || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{analytics?.todayCollection || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{analytics?.totalSales || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {callPerf ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {callPerf.completedCalls}/{callPerf.totalCalls} ({callPerf.conversionPercentage}%)
                              </span>
                            ) : (
                              <span className="text-gray-400">No calls</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/team-leader/lead-management")}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Manage Leads
            </button>
            <button
              onClick={() => router.push("/team-leader/analytics")}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* KPI Modal */}
      {showKPIModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                KPI Details - {selectedSalesPerson?.name}
              </h3>
              <button
                onClick={() => setShowKPIModal(false)}
                className="text-gray-400 hover:text-gray-600"
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
                        <input
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                          className="flex-1 text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="End Date"
                        />
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Total Sales Days:</span> {filteredSales}
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
    </div>
  );
} 