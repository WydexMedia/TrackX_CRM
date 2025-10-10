// Enhanced Homepage Component
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authenticatedFetch } from "@/lib/tokenValidation";

export default function LeadManagementOverviewPage() {
  const [widgets, setWidgets] = useState<{ slaAtRisk: number; leadsToday: number; qualifiedRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Array<{ id: number; at: string; title: string; detail: string; color: string }>>([]);
  const [showAllActivities, setShowAllActivities] = useState(false);

  useEffect(() => {
    authenticatedFetch("/api/tl/overview")
      .then((r) => r.json())
      .then((d) => setWidgets(d.widgets || { slaAtRisk: 0, leadsToday: 0, qualifiedRate: 0 }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    authenticatedFetch("/api/tl/activity?limit=20")
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
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
      gradient: "from-rose-600 to-rose-700",
      trend: widgets?.slaAtRisk && widgets.slaAtRisk > 0 ? "critical" : "good"
    },
    {
      title: "Leads Today",
      value: widgets?.leadsToday || 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      gradient: "from-blue-600 to-blue-700",
      trend: "neutral"
    },
    {
      title: "Qualified Rate",
      value: `${widgets?.qualifiedRate || 0}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
        </svg>
      ),
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
      gradient: "from-primary to-primary/80",
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
        return "bg-emerald-600";
      case "blue":
        return "bg-blue-600";
      case "amber":
        return "bg-amber-600";
      case "slate":
        return "bg-slate-600";
      case "purple":
        return "bg-violet-600";
      case "cyan":
        return "bg-cyan-600";
      default:
        return "bg-primary";
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{greeting}! 👋</h1>
            <p className="text-sm text-slate-600 mt-1">Here's what's happening with your leads today</p>
          </div>
          <div className="text-right bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500">Last updated</div>
            <div className="text-xs font-semibold text-slate-900">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {metrics.map((metric, index) => (
          <Card key={metric.title} className="border border-slate-200/60 hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${metric.gradient} p-4`}>
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-xs font-medium opacity-90">{metric.title}</p>
                    <div className="text-3xl font-bold mt-1">
                      {loading ? (
                        <div className="animate-pulse bg-white/20 h-10 w-20 rounded"></div>
                      ) : (
                        metric.value
                      )}
                    </div>
                  </div>
                  <div className="bg-white/20 p-2.5 rounded-lg">
                    {metric.icon}
                  </div>
                </div>
              </div>
              <div className="p-3 bg-white">
                <div className="flex items-center justify-between">
                  {metric.trend === "critical" && (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                      ⚠️ Critical
                    </Badge>
                  )}
                  {metric.trend === "good" && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                      ✓ Good
                    </Badge>
                  )}
                  {metric.trend === "neutral" && (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
                      • Tracking
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="border border-slate-200/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="bg-gradient-to-br from-violet-600 to-violet-700 text-white p-2 rounded-lg shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-slate-900">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/team-leader/leads" className="flex items-center gap-2 p-3 border border-slate-200/60 rounded-lg hover:bg-slate-50 hover:border-primary/30 transition-all text-xs font-medium text-slate-700 hover:text-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Lead
              </Link>
              <Link href="/team-leader/tasks" className="flex items-center gap-2 p-3 border border-slate-200/60 rounded-lg hover:bg-slate-50 hover:border-primary/30 transition-all text-xs font-medium text-slate-700 hover:text-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Assign Tasks
              </Link>
              <Link href="/team-leader/queue" className="flex items-center gap-2 p-3 border border-slate-200/60 rounded-lg hover:bg-slate-50 hover:border-primary/30 transition-all text-xs font-medium text-slate-700 hover:text-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                View Queue
              </Link>
              <Link href="/team-leader/analytics" className="flex items-center gap-2 p-3 border border-slate-200/60 rounded-lg hover:bg-slate-50 hover:border-primary/30 transition-all text-xs font-medium text-slate-700 hover:text-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
                </svg>
                Analytics
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white p-2 rounded-lg shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
            </div>
            <div className="space-y-2">
              {activities.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">No recent activity</div>
              ) : (
                <>
                  {(showAllActivities ? activities : activities.slice(0, 3)).map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className={`w-2 h-2 rounded-full ${dotColor(a.color)} mt-1.5 flex-shrink-0`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs">
                          <span className="font-semibold text-slate-900">{a.title}</span>{" "}
                          <span className="text-slate-600">{a.detail}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{timeAgo(a.at)}</div>
                      </div>
                    </div>
                  ))}
                  {activities.length > 3 && (
                    <Button
                      onClick={() => setShowAllActivities((v) => !v)}
                      variant="ghost"
                      className="w-full text-center text-primary hover:text-primary/80 text-xs py-2 mt-1"
                    >
                      {showAllActivities ? "Show less" : "Show more"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <Card className="border border-slate-200/60 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="bg-gradient-to-br from-rose-600 to-rose-700 text-white p-2 rounded-lg shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Alerts & Notifications</h2>
          </div>
          
          {widgets?.slaAtRisk && widgets.slaAtRisk > 0 ? (
            <div className="bg-rose-50 border border-rose-200/60 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-rose-600 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-rose-900">SLA Alert</h3>
                  <p className="text-xs text-rose-700 mt-1">
                    {widgets.slaAtRisk} lead{widgets.slaAtRisk !== 1 ? 's are' : ' is'} at risk of missing SLA targets. Immediate attention required.
                  </p>
                  <Button variant="ghost" className="mt-2 p-0 h-auto text-xs text-rose-700 hover:text-rose-800 font-medium">
                    View Details →
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-primary mb-3">
                <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-slate-600 font-medium">All good! No alerts at the moment.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}