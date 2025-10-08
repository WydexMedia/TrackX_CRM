"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { authenticatedFetch } from "@/lib/tokenValidation";

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
    if (value >= thresholds.good) return "text-green-600";
    if (value >= thresholds.warning) return "text-yellow-600";
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
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="h-4 bg-slate-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Analytics Data Available</h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            We couldn't fetch analytics data. This might be because there are no leads in the selected time period, or there was an issue with the data source.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => setDateRange("30d")}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
            >
              Reset to 30 Days
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-slate-600">Comprehensive insights into lead performance, conversions, and ROI</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Export CSV
          </button>
          
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Leads</p>
              <p className="text-3xl font-bold text-slate-900">{data.conversionMetrics.totalLeads.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">+12% from last period</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Conversion Rate</p>
              <p className={`text-3xl font-bold ${getMetricColor(data.conversionMetrics.conversionRate, { good: 12, warning: 8 })}`}>
                {data.conversionMetrics.conversionRate}%
              </p>
              <p className="text-xs text-slate-500 mt-1">+2.1% from last period</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg Deal Size</p>
              <p className="text-3xl font-bold text-purple-600">₹{data.conversionMetrics.avgDealSize.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">+8% from last period</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Revenue</p>
              <p className="text-3xl font-bold text-orange-600">₹{(data.conversionMetrics.convertedLeads * data.conversionMetrics.avgDealSize).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">+15% from last period</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Summary Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6"
      >
        <h2 className="text-lg font-semibold text-blue-900 mb-4">💡 Key Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">🎯</span>
              <h3 className="font-medium text-blue-900">Top Performing Source</h3>
            </div>
            <p className="text-sm text-blue-800">
              {data.sourceROI.length > 0 
                ? `${data.sourceROI.sort((a, b) => b.roi - a.roi)[0]?.source} has the highest ROI at ${data.sourceROI.sort((a, b) => b.roi - a.roi)[0]?.roi.toFixed(1)}x`
                : "No source data available"
              }
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">📈</span>
              <h3 className="font-medium text-blue-900">Conversion Opportunity</h3>
            </div>
            <p className="text-sm text-blue-800">
              {data.funnel.length > 2 
                ? `${data.funnel[1]?.count - data.funnel[2]?.count} qualified leads could move to proposal stage`
                : "Insufficient funnel data"
              }
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">👥</span>
              <h3 className="font-medium text-blue-900">Top Agent</h3>
            </div>
            <p className="text-sm text-blue-800">
              {data.agentPerformance.length > 0 
                ? `${data.agentPerformance[0]?.name} leads with ${data.agentPerformance[0]?.conversionRate}% conversion rate`
                : "No agent data available"
              }
            </p>
          </div>
        </div>
      </motion.div>

      {/* Funnel Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Lead Conversion Funnel</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Show:</span>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="conversion">Conversion %</option>
              <option value="count">Lead Count</option>
            </select>
          </div>
        </div>
        {data.funnel.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="mt-4 text-sm text-slate-500">No funnel data available for the selected time period</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.funnel.map((stage, index) => (
              <div key={stage.stage} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-slate-700">{stage.stage}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-8 relative overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${(stage.count / data.funnel[0].count) * 100}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {selectedMetric === "conversion" 
                        ? `${stage.conversion.toFixed(1)}%`
                        : stage.count.toLocaleString()
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Source ROI and Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source ROI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Source ROI Analysis</h2>
          {data.sourceROI.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="mt-4 text-sm text-slate-500">No source ROI data available</p>
            </div>
          ) : (
          <div className="space-y-4">
            {data.sourceROI.map((source) => (
              <div key={source.source} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div>
                  <h3 className="font-medium text-slate-900">{source.source}</h3>
                  <p className="text-sm text-slate-600">{source.leads} leads • {source.conversions} conversions</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">₹{source.revenue.toLocaleString()}</p>
                  <p className={`text-sm font-medium ${source.roi >= 2.5 ? 'text-green-600' : source.roi >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {source.roi.toFixed(1)}x ROI
                  </p>
                </div>
              </div>
            ))}
          </div>
          )}
        </motion.div>

        {/* Monthly Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Monthly Trends</h2>
          {data.monthlyTrends.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="mt-4 text-sm text-slate-500">No monthly trend data available</p>
            </div>
          ) : (
          <div className="space-y-4">
            {data.monthlyTrends.map((month) => (
              <div key={month.month} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div>
                  <h3 className="font-medium text-slate-900">{month.month}</h3>
                  <p className="text-sm text-slate-600">{month.leads} leads • {month.conversions} conversions</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">₹{month.revenue.toLocaleString()}</p>
                  <p className="text-sm text-slate-600">{((month.conversions / month.leads) * 100).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
          )}
        </motion.div>
      </div>

      {/* UTM Analysis and Lead Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UTM Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-6">UTM Performance</h2>
          {data.utmData.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="mt-4 text-sm text-slate-500">No UTM performance data available</p>
            </div>
          ) : (
          <div className="space-y-4">
            {data.utmData.map((utm) => (
              <div key={`${utm.utm_source}-${utm.utm_medium}-${utm.utm_campaign}`} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-900">{utm.utm_campaign}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    utm.conversionRate >= 12 ? 'bg-green-100 text-green-800' :
                    utm.conversionRate >= 10 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {utm.conversionRate}%
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-medium">{utm.utm_source}</span> • <span className="font-medium">{utm.utm_medium}</span>
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {utm.leads} leads • {utm.conversions} conversions
                </div>
              </div>
            ))}
          </div>
          )}
        </motion.div>

        {/* Lead Quality */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Lead Quality Distribution</h2>
          {data.leadQuality.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="mt-4 text-sm text-slate-500">No lead quality data available</p>
            </div>
          ) : (
          <div className="space-y-4">
            {data.leadQuality.map((quality) => (
              <div key={quality.score} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium text-slate-700">{quality.score}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(quality.count / Math.max(...data.leadQuality.map(q => q.count))) * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <div className="w-20 text-right">
                  <div className="text-sm font-semibold text-slate-900">{quality.count}</div>
                  <div className="text-xs text-slate-500">{quality.conversionRate}%</div>
                </div>
              </div>
            ))}
          </div>
          )}
        </motion.div>
      </div>

      {/* Agent Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Agent Performance Ranking</h2>
        {data.agentPerformance.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="mt-4 text-sm text-slate-500">No agent performance data available</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-700">Rank</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Agent</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Leads</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Conversions</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Rate</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Avg Deal</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Performance</th>
              </tr>
            </thead>
            <tbody>
              {data.agentPerformance.map((agent, index) => (
                <tr key={agent.name} className={`${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-100 hover:bg-slate-100 transition-colors`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-slate-100 text-slate-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{agent.name}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{agent.leads}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{agent.conversions}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      agent.conversionRate >= 12 ? 'bg-green-100 text-green-800' :
                      agent.conversionRate >= 10 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {agent.conversionRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700">₹{agent.avgDealSize.toLocaleString()}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-16 bg-slate-200 rounded-full h-2">
                        <div 
                          className="h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                          style={{ width: `${(agent.conversionRate / 15) * 100}%` }}
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
      </motion.div>
    </div>
  );
}


