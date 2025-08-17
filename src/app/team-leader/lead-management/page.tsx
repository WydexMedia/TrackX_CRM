// Enhanced Homepage Component
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function LeadManagementOverviewPage() {
  const [widgets, setWidgets] = useState<{ slaAtRisk: number; leadsToday: number; qualifiedRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Array<{ id: number; at: string; title: string; detail: string; color: string }>>([]);
  const [showAllActivities, setShowAllActivities] = useState(false);

  useEffect(() => {
    fetch("/api/tl/overview")
      .then((r) => r.json())
      .then((d) => setWidgets(d.widgets || { slaAtRisk: 0, leadsToday: 0, qualifiedRate: 0 }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/tl/activity?limit=20")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.items)) {
          setActivities(
            d.items.map((it: any) => ({
              id: it.id,
              at: it.at,
              title: it.title,
              detail: it.detail,
              color: it.color || "indigo",
            }))
          );
        } else {
          setActivities([]);
        }
      })
      .catch(() => setActivities([]));
  }, []);

  const metrics = [
    {
      title: "SLA at Risk",
      value: widgets?.slaAtRisk || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      trend: widgets?.slaAtRisk && widgets.slaAtRisk > 0 ? "critical" : "good"
    },
    {
      title: "Leads Today",
      value: widgets?.leadsToday || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      trend: "neutral"
    },
    {
      title: "Qualified Rate",
      value: `${widgets?.qualifiedRate || 0}%`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
        </svg>
      ),
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      trend: (widgets?.qualifiedRate || 0) >= 70 ? "good" : (widgets?.qualifiedRate || 0) >= 50 ? "neutral" : "poor"
    }
  ];

  // Dynamic greeting based on local time
  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Good morning";
    if (h >= 12 && h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const timeAgo = (iso: string) => {
    const now = Date.now();
    const t = new Date(iso).getTime();
    const diff = Math.max(0, Math.floor((now - t) / 1000));
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  const dotColor = (c: string) => {
    switch (c) {
      case "green":
        return "bg-green-500";
      case "blue":
        return "bg-blue-500";
      case "amber":
        return "bg-amber-500";
      case "slate":
        return "bg-slate-500";
      case "purple":
        return "bg-purple-500";
      case "cyan":
        return "bg-cyan-500";
      default:
        return "bg-indigo-500";
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{greeting}! 👋</h1>
            <p className="text-slate-600 mt-1">Here's what's happening with your leads today</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">Last updated</div>
            <div className="text-sm font-medium text-slate-900">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <div key={metric.title} className={`bg-white border-2 ${metric.borderColor} rounded-2xl p-6 hover:shadow-lg transition-all duration-200`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`${metric.bgColor} ${metric.color} p-3 rounded-xl`}>
                    {metric.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">{metric.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {metric.trend === "critical" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-red-700 bg-red-100">
                          ⚠️ Critical
                        </span>
                      )}
                      {metric.trend === "good" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-green-700 bg-green-100">
                          ✓ Good
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2">
                  {loading ? (
                    <div className="animate-pulse bg-slate-200 h-12 w-24 rounded"></div>
                  ) : (
                    metric.value
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-50 text-purple-600 p-2 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/team-leader/lead-management/leads" className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Lead
            </Link>
            <Link href="/team-leader/lead-management/tasks" className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Assign Tasks
            </Link>
            <Link href="/team-leader/lead-management/queue" className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Queue
            </Link>
            <Link href="/team-leader/lead-management/analytics" className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
              </svg>
              Analytics
            </Link>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-50 text-orange-600 p-2 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5V7a9.5 9.5 0 0119 0v10z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="text-sm text-slate-500">No recent activity</div>
            ) : (
              <>
                {(showAllActivities ? activities : activities.slice(0, 3)).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${dotColor(a.color)}`}></div>
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{a.title}</span>{" "}
                      <span className="text-slate-700">{a.detail}</span>
                      <div className="text-xs text-slate-500">{timeAgo(a.at)}</div>
                    </div>
                  </div>
                ))}
                {activities.length > 3 && (
                  <button
                    onClick={() => setShowAllActivities((v) => !v)}
                    className="w-full text-center text-blue-600 hover:text-blue-700 text-sm py-2"
                  >
                    {showAllActivities ? "Show less" : "Show more"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-50 text-red-600 p-2 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5V7a9.5 9.5 0 0119 0v10z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Alerts & Notifications</h2>
        </div>
        
        {widgets?.slaAtRisk && widgets.slaAtRisk > 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-red-500 mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-red-800">SLA Alert</h3>
                <p className="text-sm text-red-700 mt-1">
                  {widgets.slaAtRisk} lead{widgets.slaAtRisk !== 1 ? 's are' : ' is'} at risk of missing SLA targets. Immediate attention required.
                </p>
                <button className="mt-2 text-sm text-red-800 hover:text-red-900 font-medium">
                  View Details →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-green-500 mb-3">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">All good! No alerts at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}