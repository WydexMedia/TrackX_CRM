"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useUser, useOrganization, useClerk } from "@clerk/nextjs";
import { useClerkRole } from "@/lib/clerkRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut } from "lucide-react";

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


export default function JuniorLeaderPage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
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
  
  // Clerk hooks
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const { signOut } = useClerk();
  const { isAdmin, isLoading: isRoleLoading, appRole } = useClerkRole();

  // Handle authentication and load data
  useEffect(() => {
    if (!isUserLoaded || !isOrgLoaded || isRoleLoading) return;

    // Not logged in - redirect to login
    if (!user) {
      router.push("/login");
      return;
    }

    // No organization - redirect to onboarding
    if (!organization) {
      router.push("/onboarding");
      return;
    }

    // If user is admin (teamleader), redirect to team-leader dashboard
    if (isAdmin) {
      router.push("/team-leader");
      return;
    }

    // Load data for salesperson/junior leader
    const userEmail = user.emailAddresses[0]?.emailAddress || "";
    fetchTeamData(userEmail);
    fetchAnalytics();
  }, [user, organization, isUserLoaded, isOrgLoaded, isRoleLoading, isAdmin, router]);

  const handleLogout = async () => {
    try {
      await signOut({ redirectUrl: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/login");
    }
  };

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
          conversionRate: salesPersonData?.prospects > 0 ? ((salesCount / salesPersonData.prospects) * 100).toFixed(1) : 0
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
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
    return filteredKpiData.filter(report => (report.dailyAmount || 0) > 0).length;
  };

  const filteredSales = calculateFilteredSales();

  // Loading state - waiting for Clerk
  if (!isUserLoaded || !isOrgLoaded || isRoleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-64">
          <CardContent className="p-6 text-center">
            <div className="inline-block h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Authenticating...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading team data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-64">
          <CardContent className="p-6 text-center">
            <div className="inline-block h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading team data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-64">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">No team data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get current user info from Clerk
  const currentUserName = user?.fullName || user?.firstName || "Sales Person";
  const currentUserEmail = user?.emailAddresses[0]?.emailAddress || "";

  const currentJL = teamData.juniorLeaders[0] || {
    name: currentUserName,
    email: currentUserEmail,
    code: currentUserEmail,
    role: appRole || "sales",
    target: 0,
    _id: "",
    teamMembers: []
  };
  const assignedSales = teamData.salesPersons;
  
  // Filter analytics to only show team members
  const teamAnalytics = analytics.filter(analyticsItem => 
    assignedSales.some(sales => sales.name.toLowerCase() === analyticsItem.name.toLowerCase())
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
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {appRole === "jl" ? "Junior Leader" : "Sales"} Dashboard
                </h1>
                <p className="mt-2 text-gray-600">
                  {organization?.name} • {currentUserEmail}
                </p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center gap-2 text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Info Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{currentUserName}</h2>
                <p className="text-gray-600">{currentUserEmail}</p>
                <Badge variant="secondary" className="mt-1 capitalize">
                  {appRole === "jl" ? "Junior Leader" : "Sales Executive"}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{assignedSales.length}</div>
                <p className="text-sm text-gray-600">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Team Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Team Members with Analytics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Team Members Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {assignedSales.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No team members assigned yet</p>
                <p className="text-sm text-gray-400">Team Leader will assign sales persons to your team</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Name</TH>
                      <TH>Target</TH>
                      <TH>Achieved</TH>
                      <TH>Today's Collection</TH>
                      <TH>Total Sales</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {assignedSales.map((salesperson) => {
                      const analyticsItem = teamAnalytics.find(a => 
                        a.name.toLowerCase() === salesperson.name.toLowerCase()
                      );
                      
                      return (
                        <TR key={salesperson.code}>
                          <TD>
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
                          </TD>
                          <TD>
                            <div className="text-sm text-gray-900">{analyticsItem?.target || 0}</div>
                          </TD>
                          <TD>
                            <div className="text-sm text-gray-900">{analyticsItem?.achievedTarget || 0}</div>
                          </TD>
                          <TD>
                            <div className="text-sm text-gray-900">{analyticsItem?.todayCollection || 0}</div>
                          </TD>
                          <TD>
                            <div className="text-sm text-gray-900">{analyticsItem?.totalSales || 0}</div>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => router.push("/team-leader/leads")}
                variant="outline"
                className="flex items-center justify-center h-auto py-3"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                View Leads
              </Button>
              <Button
                onClick={() => router.push("/team-leader/analytics")}
                variant="outline"
                className="flex items-center justify-center h-auto py-3"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Modal */}
      <Dialog open={showKPIModal} onOpenChange={setShowKPIModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              KPI Details - {selectedSalesPerson?.name}
            </DialogTitle>
          </DialogHeader>
            
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
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Range Filter</label>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                            className="flex-1"
                            placeholder="Start Date"
                          />
                          <Input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                            className="flex-1"
                            placeholder="End Date"
                          />
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Total Sales Days:</span> {filteredSales}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed KPI Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Performance Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <THead>
                          <TR>
                            <TH>Date</TH>
                            <TH>Leads Assigned</TH>
                            <TH>Sales Converted</TH>
                            <TH>Amount Collected</TH>
                            <TH>Conversion %</TH>
                            <TH>Ad Spend</TH>
                            <TH>Ad Spend %</TH>
                          </TR>
                        </THead>
                        <TBody>
                        {filteredKpiData.length > 0 ? (
                          filteredKpiData.map((report, index) => {
                            const leadsAssigned = parseInt(report.leadsAssigned) || 0;
                            const salesConverted = parseInt(report.salesConverted) || 0;
                            const amountCollected = parseFloat(report.dailyAmount) || 0;
                            const conversionRate = parseFloat(report.conversionRate) || 0;
                            const adSpend = leadsAssigned * 50;
                            const adSpendPercentage = amountCollected > 0 ? ((adSpend / amountCollected) * 100).toFixed(1) : 0;

                            return (
                              <TR key={report._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <TD className="font-medium">
                                  {new Date(report.date).toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </TD>
                                <TD>
                                  {leadsAssigned}
                                </TD>
                                <TD className="text-green-600 font-semibold">
                                  {salesConverted}
                                </TD>
                                <TD className="text-blue-600 font-semibold">
                                  ₹{amountCollected.toLocaleString()}
                                </TD>
                                <TD className="text-purple-600 font-semibold">
                                  {conversionRate}%
                                </TD>
                                <TD className="text-orange-600 font-semibold">
                                  ₹{adSpend.toLocaleString()}
                                </TD>
                                <TD className="text-red-600 font-semibold">
                                  {adSpendPercentage}%
                                </TD>
                              </TR>
                            );
                          })
                        ) : (
                          <TR>
                            <TD colSpan={7} className="text-center py-8">
                              <div className="flex flex-col items-center">
                                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <p className="text-lg font-medium text-gray-500">
                                  {dateRange.startDate && dateRange.endDate ? 'No data found for selected date range' : 'No KPI data available'}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {dateRange.startDate && dateRange.endDate 
                                    ? 'Try adjusting your date range or clear the filter.'
                                    : 'No performance data found for this sales person.'
                                  }
                                </p>
                              </div>
                            </TD>
                          </TR>
                        )}
                        </TBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
