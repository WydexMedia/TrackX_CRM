"use client";

import { useEffect, useMemo, useState } from "react";
import { AddLeadModal, ImportLeadsModal } from "./AddLeadModals";

interface LeadRow {
  phone: string;
  name: string | null;
  email: string | null;
  source: string | null;
  utm: Record<string, string> | null;
  stage: string;
  ownerId: string | null;
  score: number | null;
  lastActivityAt: string | null;
  createdAt: string | null;
}

export default function LeadsPage() {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newLead, setNewLead] = useState<{ phone: string; name?: string; email?: string; source?: string; stage?: string; score?: number }>({ phone: "" });
  const [importing, setImporting] = useState(false);
  const [sales, setSales] = useState<Array<{ code: string; name: string }>>([]);
  
  // Advanced filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState("");
  const [scoreRange, setScoreRange] = useState({ min: "", max: "" });
  const [priority, setPriority] = useState("");
  const [campaign, setCampaign] = useState("");
  const [tags, setTags] = useState("");
  const [lastActivity, setLastActivity] = useState("");
  const [slaStatus, setSlaStatus] = useState("");

  const params = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (stage) sp.set("stage", stage);
    if (source) sp.set("source", source);
    if (owner) sp.set("owner", owner);
    if (dateRange) sp.set("dateRange", dateRange);
    if (scoreRange.min) sp.set("scoreMin", scoreRange.min);
    if (scoreRange.max) sp.set("scoreMax", scoreRange.max);
    if (priority) sp.set("priority", priority);
    if (campaign) sp.set("campaign", campaign);
    if (tags) sp.set("tags", tags);
    if (lastActivity) sp.set("lastActivity", lastActivity);
    if (slaStatus) sp.set("slaStatus", slaStatus);
    sp.set("limit", String(pageSize));
    sp.set("offset", String((page - 1) * pageSize));
    return sp.toString();
  }, [q, stage, source, owner, dateRange, scoreRange, priority, campaign, tags, lastActivity, slaStatus, page]);

  const clearAllFilters = () => {
    setQ("");
    setStage("");
    setSource("");
    setOwner("");
    setDateRange("");
    setScoreRange({ min: "", max: "" });
    setPriority("");
    setCampaign("");
    setTags("");
    setLastActivity("");
    setSlaStatus("");
    setPage(1);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (q) count++;
    if (stage) count++;
    if (source) count++;
    if (owner) count++;
    if (dateRange) count++;
    if (scoreRange.min || scoreRange.max) count++;
    if (priority) count++;
    if (campaign) count++;
    if (tags) count++;
    if (lastActivity) count++;
    if (slaStatus) count++;
    return count;
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tl/leads?${params}`)
      .then((r) => r.json())
      .then((d) => { setRows(d.rows || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, [params]);

  // Load salesperson list and preselect if owner is present in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const preOwner = sp.get("owner");
      if (preOwner) setOwner(preOwner);
    }
    fetch("/api/users")
      .then((r) => r.json())
      .then((all) => {
        const onlySales = (Array.isArray(all) ? all : []).filter((u: any) => (u.role ?? 'sales') === "sales");
        setSales(onlySales.map((u: any) => ({ code: u.code, name: u.name })));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Leads</h1>
            <p className="text-sm text-slate-500">Data table with advanced filters</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-900" onClick={() => setShowImport(true)}>Import CSV/Excel</button>
            <button className="rounded-xl bg-cyan-600 text-white px-4 py-2 text-sm hover:bg-cyan-700" onClick={() => setShowAdd(true)}>Add Lead</button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Lead Filters</h3>
              <p className="text-sm text-slate-600">Filter and search your leads data</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getActiveFilterCount() > 0 && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? 's' : ''} active
              </span>
            )}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
        </div>

        {/* Basic Filters - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="border border-slate-300 rounded-lg px-10 py-2.5 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search name, phone, email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="">All Stages</option>
                            <option value="Not contacted">Not contacted</option>
            <option value="Qualified"> Qualified</option>
            <option value="Not interested"> Not interested</option>
            <option value="Interested"> Interested</option>
            <option value="To be nurtured"> To be nurtured</option>
            <option value="Junk">Junk</option>
            <option value="Ask to call back"> Ask to call back</option>
            <option value="Did not Pickup">Did not Pickup</option>
            <option value="Did not Connect"> Did not Connect</option>
            <option value="Customer">Customer</option>
            <option value="Other Language"> Other Language</option>
          </select>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">All Sources</option>
            <option value="META">📘 Meta Lead Ads</option>
            <option value="GOOGLE">🔍 Google Lead Form</option>
            <option value="CSV">📄 CSV Upload</option>
            <option value="WEBSITE">🌐 Website</option>
            <option value="REFERRAL">👥 Referral</option>
          </select>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option value="">All Owners</option>
            {sales.map((s) => (
              <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
            ))}
            <option value="unassigned">🔄 Unassigned</option>
          </select>
        </div>

        {/* Advanced Filters - Collapsible */}
        {showAdvancedFilters && (
          <div className="border-t border-slate-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7days">Last 7 days</option>
                  <option value="last30days">Last 30 days</option>
                  <option value="thismonth">This month</option>
                  <option value="lastmonth">Last month</option>
                </select>
              </div>

              {/* Score Range */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lead Score</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={scoreRange.min}
                    onChange={(e) => setScoreRange(prev => ({ ...prev, min: e.target.value }))}
                    className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={scoreRange.max}
                    onChange={(e) => setScoreRange(prev => ({ ...prev, max: e.target.value }))}
                    className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Priorities</option>
                  <option value="high">🔴 High Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="low">🟢 Low Priority</option>
                </select>
              </div>

              {/* Campaign */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Campaign</label>
                <select
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Campaigns</option>
                  <option value="summer-2024">🌞 Summer 2024</option>
                  <option value="product-launch">🚀 Product Launch</option>
                  <option value="holiday-special">🎄 Holiday Special</option>
                  <option value="webinar-series">📺 Webinar Series</option>
                  <option value="no-campaign">❌ No Campaign</option>
                </select>
              </div>

              {/* Last Activity */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Last Activity</label>
                <select
                  value={lastActivity}
                  onChange={(e) => setLastActivity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Any Time</option>
                  <option value="today">Today</option>
                  <option value="last3days">Last 3 days</option>
                  <option value="lastweek">Last week</option>
                  <option value="lastmonth">Last month</option>
                  <option value="noactivity">No activity</option>
                </select>
              </div>

              {/* SLA Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">SLA Status</label>
                <select
                  value={slaStatus}
                  onChange={(e) => setSlaStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All SLA Status</option>
                  <option value="on-track">✅ On Track</option>
                  <option value="at-risk">⚠️ At Risk</option>
                  <option value="overdue">🔴 Overdue</option>
                </select>
              </div>
            </div>

            {/* Tags Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
              <input
                type="text"
                placeholder="Enter tags separated by commas (e.g., hot-lead, follow-up, demo-requested)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >
                Clear All Filters
              </button>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Filtered Data
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Lead</th>
                <th className="text-left px-4 py-3">Source/UTM</th>
                <th className="text-left px-4 py-3">Stage</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Last Activity</th>
                <th className="text-left px-4 py-3">Age</th>
                <th className="text-left px-4 py-3">SLA</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={9}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={9}>
                    No leads found
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const utm = r.utm ? Object.entries(r.utm).map(([k, v]) => `${k}=${v}`).join(" ") : "";
                  return (
                    <tr key={r.phone} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <a href={`/team-leader/lead-management/leads/${encodeURIComponent(r.phone)}`} className="font-medium text-blue-600 hover:underline">{r.name || "—"}</a>
                        <div className="text-xs text-slate-500">
                          {r.phone} {r.email ? `• ${r.email}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.source || "—"} {utm && `• ${utm}`}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs">
                          {r.stage || "Not contacted"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{(sales.find((s) => s.code === (r.ownerId || ""))?.name) || r.ownerId || "—"}</td>
                      <td className="px-4 py-3">{r.score ?? 0}</td>
                      <td className="px-4 py-3">{r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">{r.createdAt ? `${Math.floor((Date.now() - new Date(r.createdAt).getTime())/3600000)}h` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">OK</span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-blue-600 hover:underline">Preview</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-slate-600">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >Previous</button>
          <button
            className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >Next</button>
        </div>
      </div>

      <AddLeadModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={() => {
          // refresh
          fetch(`/api/tl/leads?${params}`).then((r) => r.json()).then((d) => setRows(d.rows || []));
        }}
      />
      <ImportLeadsModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => {
          fetch(`/api/tl/leads?${params}`).then((r) => r.json()).then((d) => setRows(d.rows || []));
        }}
      />
    </div>
  );
}



