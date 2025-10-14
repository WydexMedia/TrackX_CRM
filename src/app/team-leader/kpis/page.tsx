"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from 'react-hot-toast';
import { authenticatedFetch } from '@/lib/tokenValidation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { 
  Users, 
  Target, 
  TrendingUp, 
  Search,
  ChevronDown,
  Calendar,
  Filter,
  X
} from "lucide-react";

interface DailyKPI {
  date: string;
  dailyAmount: number;
  salesCount: number;
  leadsAssigned: number;
  salesConverted: number;
  conversionRate: number;
  adSpend: number;
  adSpendPercentage: number;
}

interface UserKPI {
  userId: string;
  name: string;
  code: string;
  email: string;
  dailyKPIs: DailyKPI[];
  summary: {
    totalLeads: number;
    totalSales: number;
    totalAmount: number;
    totalAdSpend: number;
    overallConversion: number;
    overallAdSpendPercentage: number;
    daysActive: number;
  };
}

interface TeamSummary {
  totalLeads: number;
  totalSales: number;
  totalAmount: number;
  totalAdSpend: number;
  totalSalespeople: number;
  overallConversion: number;
  overallAdSpendPercentage: number;
}

export default function KPIsPage() {
  const [kpiData, setKpiData] = useState<UserKPI[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedSalespeople, setSelectedSalespeople] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof UserKPI['summary']>("totalAmount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      router.push("/login");
      return;
    }
    const parsedUser = JSON.parse(user);
    if (parsedUser.role !== 'teamleader') {
      router.push("/login");
      return;
    }
    fetchKPIData();
  }, [router]);

  const fetchKPIData = async (startDate?: string, endDate?: string, salesPersonIds?: string[]) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (salesPersonIds && salesPersonIds.length > 0) {
        params.append('salesPersonIds', salesPersonIds.join(','));
      }

      const response = await authenticatedFetch(
        `/api/tl/kpis?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setKpiData(data.kpiData);
        setTeamSummary(data.teamSummary);
      } else {
        toast.error("Failed to load KPI data");
      }
    } catch (error) {
      console.error("Error fetching KPI data:", error);
      toast.error("Failed to load KPI data");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchKPIData(
      dateRange.startDate || undefined,
      dateRange.endDate || undefined,
      selectedSalespeople.length > 0 ? selectedSalespeople : undefined
    );
  };

  const handleClearFilters = () => {
    setDateRange({ startDate: '', endDate: '' });
    setSelectedSalespeople([]);
    fetchKPIData();
  };

  const toggleSalespersonFilter = (userId: string) => {
    setSelectedSalespeople(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSort = (column: keyof UserKPI['summary']) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const toggleRowExpansion = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const filteredAndSortedKPIs = kpiData
    .filter(user =>
      (user.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.code?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a.summary[sortBy];
      const bValue = b.summary[sortBy];
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-lg text-slate-600">Loading KPI data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Key Performance Indicators</h1>
              <p className="text-sm text-slate-600 mt-1">Comprehensive team performance metrics and analytics</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6 border border-slate-200/60 shadow-sm">
            <CardContent className="p-5">
              <div className="space-y-4">
                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date Range
                  </label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                      className="flex-1"
                    />
                    <span className="text-slate-500">to</span>
                    <Input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Salesperson Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Filter by Salesperson
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {kpiData.map(user => (
                      <Badge
                        key={user.userId}
                        variant={selectedSalespeople.includes(user.userId) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleSalespersonFilter(user.userId)}
                      >
                        {user.name}
                        {selectedSalespeople.includes(user.userId) && (
                          <X className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                  {selectedSalespeople.length > 0 && (
                    <p className="text-xs text-slate-500 mt-2">
                      {selectedSalespeople.length} salesperson(s) selected
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleApplyFilters} className="gap-2">
                    <Filter className="w-4 h-4" />
                    Apply Filters
                  </Button>
                  <Button variant="outline" onClick={handleClearFilters} className="gap-2">
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                </div>

                {/* Active Filters Display */}
                {(dateRange.startDate || dateRange.endDate || selectedSalespeople.length > 0) && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-600 font-medium mb-1">Active Filters:</p>
                    <div className="flex flex-wrap gap-2">
                      {dateRange.startDate && dateRange.endDate && (
                        <Badge variant="secondary" className="text-xs">
                          📅 {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
                        </Badge>
                      )}
                      {selectedSalespeople.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          👥 {selectedSalespeople.length} salesperson(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Summary Cards */}
        {teamSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="border border-slate-200/60 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Total Leads</p>
                    <p className="text-2xl font-bold text-blue-600">{teamSummary.totalLeads.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{teamSummary.totalSalespeople} team members</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Total Sales</p>
                    <p className="text-2xl font-bold text-green-600">{teamSummary.totalSales.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{teamSummary.overallConversion}% conversion</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">₹{teamSummary.totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Collected amount</p>
                  </div>
                  <div className="w-8 h-8 text-purple-500 opacity-50 flex items-center justify-center text-2xl font-bold">₹</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/60 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-orange-50 to-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Ad Spend</p>
                    <p className="text-2xl font-bold text-orange-600">₹{teamSummary.totalAdSpend.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{teamSummary.overallAdSpendPercentage}% of revenue</p>
                  </div>
                  <Target className="w-8 h-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Bar */}
        <Card className="mb-6 border border-slate-200/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, code, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-slate-200"
                  />
                </div>
              </div>
              <div className="text-sm text-slate-600 font-medium">
                {filteredAndSortedKPIs.length} of {kpiData.length} members
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Table */}
        <Card className="overflow-hidden border border-slate-200/60 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-200/60">
            <CardTitle className="text-lg text-slate-900">Individual Performance Metrics</CardTitle>
            <p className="text-sm text-slate-600 mt-1">Click on any row to view detailed daily breakdown</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-8"></TH>
                    <TH>Salesperson</TH>
                    <TH
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("totalLeads")}
                    >
                      <div className="flex items-center gap-2">
                        Total Leads
                        {sortBy === "totalLeads" && (
                          <ChevronDown className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TH>
                    <TH
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("totalSales")}
                    >
                      <div className="flex items-center gap-2">
                        Total Sales
                        {sortBy === "totalSales" && (
                          <ChevronDown className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TH>
                    <TH
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("totalAmount")}
                    >
                      <div className="flex items-center gap-2">
                        Revenue
                        {sortBy === "totalAmount" && (
                          <ChevronDown className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TH>
                    <TH
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("overallConversion")}
                    >
                      <div className="flex items-center gap-2">
                        Conversion %
                        {sortBy === "overallConversion" && (
                          <ChevronDown className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TH>
                    <TH
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("totalAdSpend")}
                    >
                      <div className="flex items-center gap-2">
                        Ad Spend
                        {sortBy === "totalAdSpend" && (
                          <ChevronDown className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TH>
                    <TH
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("daysActive")}
                    >
                      <div className="flex items-center gap-2">
                        Days Active
                        {sortBy === "daysActive" && (
                          <ChevronDown className={`w-4 h-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredAndSortedKPIs.map((user, index) => (
                    <React.Fragment key={user.userId}>
                      <TR 
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'} cursor-pointer hover:bg-blue-50 transition-colors`}
                        onClick={() => toggleRowExpansion(user.userId)}
                      >
                        <TD>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedRows.has(user.userId) ? '' : '-rotate-90'}`} />
                        </TD>
                        <TD className="whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {(user.name || '').split(' ').map(n => n[0]).join('').toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.code}</div>
                            </div>
                          </div>
                        </TD>
                        <TD className="whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{user.summary.totalLeads.toLocaleString()}</div>
                        </TD>
                        <TD className="whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">{user.summary.totalSales.toLocaleString()}</div>
                        </TD>
                        <TD className="whitespace-nowrap">
                          <div className="text-sm font-semibold text-purple-600">₹{user.summary.totalAmount.toLocaleString()}</div>
                        </TD>
                        <TD className="whitespace-nowrap">
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            {user.summary.overallConversion}%
                          </Badge>
                        </TD>
                        <TD className="whitespace-nowrap">
                          <div className="text-sm font-semibold text-orange-600">₹{user.summary.totalAdSpend.toLocaleString()}</div>
                          <div className="text-xs text-slate-500">{user.summary.overallAdSpendPercentage}%</div>
                        </TD>
                        <TD className="whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-900">{user.summary.daysActive}</div>
                        </TD>
                      </TR>
                      
                      {/* Expanded Daily Breakdown */}
                      {expandedRows.has(user.userId) && (
                        <TR>
                          <TD colSpan={8} className="bg-slate-50 p-0">
                            <div className="p-4">
                              <h4 className="text-sm font-semibold text-slate-900 mb-3">Daily Performance Breakdown</h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-white">
                                    <tr className="border-b border-slate-200">
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Date</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Leads</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Sales</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Amount</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Conversion %</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Ad Spend</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Ad Spend %</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-slate-100">
                                    {user.dailyKPIs.map((day, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-xs font-medium text-slate-900">
                                          {new Date(day.date).toLocaleDateString('en-IN', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                          })}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-slate-700">{day.leadsAssigned}</td>
                                        <td className="px-4 py-2 text-xs text-green-600 font-semibold">{day.salesConverted}</td>
                                        <td className="px-4 py-2 text-xs text-purple-600 font-semibold">₹{day.dailyAmount.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-xs text-blue-600 font-semibold">{day.conversionRate}%</td>
                                        <td className="px-4 py-2 text-xs text-orange-600 font-semibold">₹{day.adSpend.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-xs text-red-600 font-semibold">{day.adSpendPercentage}%</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </TD>
                        </TR>
                      )}
                    </React.Fragment>
                  ))}
                </TBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {filteredAndSortedKPIs.length === 0 && (
          <Card className="mt-6">
            <CardContent className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No KPI data found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria.' : 'No performance data available for the selected period.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}




