"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { authenticatedFetch } from "@/lib/tokenValidation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  funnel: {
    stage: string;
    count: number;
    conversion: number;
  }[];
  sourceROI: {
    source: string;
    leads: number;
    conversions: number;
    revenue: number;
    roi: number;
  }[];
  conversionMetrics: {
    totalLeads: number;
    qualifiedLeads: number;
    convertedLeads: number;
    conversionRate: number;
    avgDealSize: number;
  };
  monthlyTrends: {
    month: string;
    leads: number;
    conversions: number;
    revenue: number;
  }[];
  agentPerformance: {
    name: string;
    leads: number;
    conversions: number;
    conversionRate: number;
    avgDealSize: number;
  }[];
  utmData: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    leads: number;
    conversions: number;
    conversionRate: number;
  }[];
  leadQuality: {
    score: string;
    count: number;
    conversionRate: number;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [selectedMetric, setSelectedMetric] = useState("conversion");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`/api/tl/analytics?range=${dateRange}`);
      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
      } else {
        console.error("Failed to fetch analytics:", res.status, res.statusText);
        setData(null);
        toast.error("Failed to fetch analytics data");
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setData(null);
      toast.error("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  const getMetricColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return "text-primary";
    if (value >= thresholds.warning) return "text-orange-600";
    return "text-red-600";
  };

  const generateCSV = (data: AnalyticsData) => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Leads', data.conversionMetrics.totalLeads.toString()],
      ['Conversion Rate', `${data.conversionMetrics.conversionRate}%`],
      ['Average Deal Size', `₹${data.conversionMetrics.avgDealSize.toLocaleString()}`],
      ['Total Revenue', `₹${(data.conversionMetrics.convertedLeads * data.conversionMetrics.avgDealSize).toLocaleString()}`],
      [''],
      ['Funnel Stage', 'Count', 'Conversion %'],
      ...data.funnel.map(stage => [stage.stage, stage.count.toString(), `${stage.conversion}%`]),
      [''],
      ['Source', 'Leads', 'Conversions', 'Revenue', 'ROI'],
      ...data.sourceROI.map(source => [source.source, source.leads.toString(), source.conversions.toString(), `₹${source.revenue.toLocaleString()}`, `${source.roi.toFixed(1)}x`]),
      [''],
      ['Month', 'Leads', 'Conversions', 'Revenue'],
      ...data.monthlyTrends.map(month => [month.month, month.leads.toString(), month.conversions.toString(), `₹${month.revenue.toLocaleString()}`]),
      [''],
      ['Agent', 'Leads', 'Conversions', 'Rate', 'Avg Deal'],
      ...data.agentPerformance.map(agent => [agent.name, agent.leads.toString(), agent.conversions.toString(), `${agent.conversionRate}%`, `₹${agent.avgDealSize.toLocaleString()}`])
    ];
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="h-4 bg-slate-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 min-h-screen">
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-3">No Analytics Data Available</h3>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            We couldn't fetch analytics data. This might be because there are no leads in the selected time period, or there was an issue with the data source.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={fetchAnalytics}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Try Again
            </Button>
            <Button
              onClick={() => setDateRange("30d")}
              variant="outline"
            >
              Reset to 30 Days
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">Comprehensive insights into lead performance, conversions, and ROI</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <Button
            onClick={() => {
              if (data) {
                const csvContent = generateCSV(data);
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
                toast.success('Analytics exported successfully!');
              }
            }}
            variant="outline"
            size="sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
          
          <Button
            onClick={fetchAnalytics}
            className="bg-slate-900 hover:bg-slate-800 text-white"
            size="sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/60 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 mb-2">Total Leads</p>
                <p className="text-2xl font-bold text-slate-900">{data.conversionMetrics.totalLeads.toLocaleString()}</p>
                <Badge className="bg-green-50 text-green-700 border-green-200 mt-2 text-xs">
                  +12% increase
                </Badge>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 mb-2">Conversion Rate</p>
                <p className={`text-2xl font-bold ${getMetricColor(data.conversionMetrics.conversionRate, { good: 12, warning: 8 })}`}>
                  {data.conversionMetrics.conversionRate.toFixed(2)}%
                </p>
                <Badge className="bg-green-50 text-green-700 border-green-200 mt-2 text-xs">
                  +2.1% increase
                </Badge>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 mb-2">Avg Deal Size</p>
                <p className="text-2xl font-bold text-slate-900">₹{data.conversionMetrics.avgDealSize.toLocaleString()}</p>
                <Badge className="bg-green-50 text-green-700 border-green-200 mt-2 text-xs">
                  +8% increase
                </Badge>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 mb-2">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900">₹{(data.conversionMetrics.convertedLeads * data.conversionMetrics.avgDealSize).toLocaleString()}</p>
                <Badge className="bg-green-50 text-green-700 border-green-200 mt-2 text-xs">
                  +15% increase
                </Badge>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Insights */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Key Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white/80 rounded-lg p-4 border border-primary/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 mb-1">Top Performing Source</h3>
                  <p className="text-xs text-slate-600">
                    {data.sourceROI.length > 0 
                      ? `${data.sourceROI.sort((a, b) => b.roi - a.roi)[0]?.source} has the highest ROI at ${data.sourceROI.sort((a, b) => b.roi - a.roi)[0]?.roi.toFixed(1)}x`
                      : "No source data available"
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 border border-primary/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 mb-1">Conversion Opportunity</h3>
                  <p className="text-xs text-slate-600">
                    {data.funnel.length > 2 
                      ? `${data.funnel[1]?.count - data.funnel[2]?.count} qualified leads could move to proposal stage`
                      : "Insufficient funnel data"
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 border border-primary/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 mb-1">Top Agent</h3>
                  <p className="text-xs text-slate-600">
                    {data.agentPerformance.length > 0 
                      ? `${data.agentPerformance[0]?.name} leads with ${data.agentPerformance[0]?.conversionRate.toFixed(2)}% conversion rate`
                      : "No agent data available"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funnel Chart */}
      <Card className="border-slate-200/60">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-900">Lead Conversion Funnel</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Show:</span>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-primary bg-white"
              >
                <option value="conversion">Conversion %</option>
                <option value="count">Lead Count</option>
              </select>
            </div>
          </div>
          {data.funnel.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="mt-4 text-xs text-slate-500">No funnel data available for the selected time period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.funnel.map((stage, index) => (
                <div key={stage.stage} className="flex items-center gap-3">
                  <div className="w-28 text-xs font-medium text-slate-700 truncate">{stage.stage}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-7 relative overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-primary/70"
                      initial={{ width: 0 }}
                      animate={{ width: `${(stage.count / data.funnel[0].count) * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.15 }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-slate-700">
                        {selectedMetric === "conversion" 
                          ? `${stage.conversion.toFixed(1)}%`
                          : stage.count.toLocaleString()
                        }
                      </span>
                    </div>
                  </div>
                  <div className="w-16 text-xs text-slate-600 text-right">
                    {stage.count.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source ROI and Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source ROI */}
        <Card className="border-slate-200/60">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Source ROI Analysis</h2>
            {data.sourceROI.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="mt-4 text-xs text-slate-500">No source ROI data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.sourceROI.map((source) => (
                  <div key={source.source} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-lg hover:bg-slate-100/80 transition-colors border border-slate-100">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900">{source.source}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">{source.leads} leads • {source.conversions} conversions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-900">₹{source.revenue.toLocaleString()}</p>
                      <Badge className={`mt-1 text-[10px] ${source.roi >= 2.5 ? 'bg-primary/10 text-primary border-primary/20' : source.roi >= 2 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {source.roi.toFixed(1)}x ROI
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card className="border-slate-200/60">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Monthly Trends</h2>
            {data.monthlyTrends.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="mt-4 text-xs text-slate-500">No monthly trend data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.monthlyTrends.map((month) => (
                  <div key={month.month} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-lg hover:bg-slate-100/80 transition-colors border border-slate-100">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900">{month.month}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">{month.leads} leads • {month.conversions} conversions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-900">₹{month.revenue.toLocaleString()}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{((month.conversions / month.leads) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* UTM Analysis and Lead Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* UTM Analysis */}
        <Card className="border-slate-200/60">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">UTM Performance</h2>
            {data.utmData.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="mt-4 text-xs text-slate-500">No UTM performance data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.utmData.map((utm) => (
                  <div key={`${utm.utm_source}-${utm.utm_medium}-${utm.utm_campaign}`} className="p-3 bg-slate-50/80 rounded-lg hover:bg-slate-100/80 transition-colors border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-slate-900 truncate">{utm.utm_campaign}</h3>
                      <Badge className={`text-[10px] ${
                        utm.conversionRate >= 12 ? 'bg-primary/10 text-primary border-primary/20' :
                        utm.conversionRate >= 10 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {utm.conversionRate.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-600">
                      <span className="font-medium">{utm.utm_source}</span> • <span className="font-medium">{utm.utm_medium}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {utm.leads} leads • {utm.conversions} conversions
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Quality */}
        <Card className="border-slate-200/60">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Lead Quality Distribution</h2>
            {data.leadQuality.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="mt-4 text-xs text-slate-500">No lead quality data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.leadQuality.map((quality) => (
                  <div key={quality.score} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-medium text-slate-700">{quality.score}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary/70"
                        initial={{ width: 0 }}
                        animate={{ width: `${(quality.count / Math.max(...data.leadQuality.map(q => q.count))) * 100}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                      />
                    </div>
                    <div className="w-20 text-right">
                      <div className="text-xs font-semibold text-slate-900">{quality.count}</div>
                      <div className="text-[10px] text-slate-500">{quality.conversionRate.toFixed(2)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <Card className="border-slate-200/60">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Agent Performance Ranking</h2>
          {data.agentPerformance.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="mt-4 text-xs text-slate-500">No agent performance data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Rank</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Agent</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-700">Leads</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-700">Conversions</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-700">Rate</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-700">Avg Deal</th>
                    <th className="text-center py-2 px-3 font-semibold text-slate-700">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agentPerformance.map((agent, index) => (
                    <tr key={agent.name} className={`${index % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'} border-b border-slate-100 hover:bg-slate-100/80 transition-colors`}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            index === 0 ? 'bg-primary/20 text-primary' :
                            index === 1 ? 'bg-slate-200 text-slate-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{agent.name}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{agent.leads}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{agent.conversions}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge className={`text-[10px] ${
                          agent.conversionRate >= 12 ? 'bg-primary/10 text-primary border-primary/20' :
                          agent.conversionRate >= 10 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {agent.conversionRate.toFixed(2)}%
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700">₹{agent.avgDealSize.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-16 bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="h-1.5 bg-gradient-to-r from-primary to-primary/70 rounded-full"
                              style={{ width: `${Math.min((agent.conversionRate / 15) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


