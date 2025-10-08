"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { authenticatedFetch } from "@/lib/tokenValidation";

export default function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Reports</h1>
      <p className="text-sm text-slate-500 mb-4">Export packs, scheduled mails</p>

      <LeadsReports />
    </div>
  );
}

function LeadsReports() {
  console.log('Debug - LeadsReports component rendering');
  
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [stage, setStage] = React.useState<string>("");
  const [owner, setOwner] = React.useState<string>("");
  const [dateRange, setDateRange] = React.useState<string>("last30days");
  const [limit, setLimit] = React.useState(50);
  const [offset, setOffset] = React.useState(0);
  const [ownersMap, setOwnersMap] = React.useState<Record<string,string>>({});
  const [agg, setAgg] = React.useState<any>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Advanced filter state

  const [hasEmail, setHasEmail] = React.useState<string>(""); // '', 'true', 'false'
  const [emailDomain, setEmailDomain] = React.useState<string>("");
  const [scoreMin, setScoreMin] = React.useState<string>("");
  const [scoreMax, setScoreMax] = React.useState<string>("");
  const [lastActivity, setLastActivity] = React.useState<string>("");
  // New call-related filters
  const [connected, setConnected] = React.useState(false);
  const [callCountMin, setCallCountMin] = React.useState<string>("");
  const [callCountMax, setCallCountMax] = React.useState<string>("");
  const [sortByDuration, setSortByDuration] = React.useState(false);
  // Filter to exclude leads in early/unsuccessful stages
  const [excludeEarlyStages, setExcludeEarlyStages] = React.useState(false);
  // Sort by number of calls (stage changes)
  const [sortByCallCount, setSortByCallCount] = React.useState(false);
  // Need follow-up flag
  const [needFollowup, setNeedFollowup] = React.useState<string>(""); // '', 'true', 'false'

  // Saved quick filters
  const [savedFilters, setSavedFilters] = React.useState<Array<{ id: string; name: string; params: Record<string,string> }>>([]);
  
  // Debug: Log when component mounts
  React.useEffect(() => {
    console.log('Debug - LeadsReports component mounted');
  }, []);
  
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("tl_saved_filters");
      if (raw) setSavedFilters(JSON.parse(raw));
    } catch {}
  }, []);
  const persistSaved = (next: Array<{ id: string; name: string; params: Record<string,string> }>) => {
    setSavedFilters(next);
    try { localStorage.setItem("tl_saved_filters", JSON.stringify(next)); } catch {}
  };
  const saveCurrentFilter = () => {
    const params: Record<string,string> = {};
    if (q) params.q = q;
    if (stage) params.stage = stage;
    if (owner) params.owner = owner;
    if (dateRange) params.dateRange = dateRange;

    if (hasEmail) params.hasEmail = hasEmail;
    if (emailDomain) params.emailDomain = emailDomain;
    if (scoreMin) params.scoreMin = scoreMin;
    if (scoreMax) params.scoreMax = scoreMax;
    if (lastActivity) params.lastActivity = lastActivity;
    if (connected) params.connected = 'true';
    if (callCountMin) params.callCountMin = callCountMin;
    if (callCountMax) params.callCountMax = callCountMax;
    if (sortByDuration) params.sortByDuration = 'true';
    if (excludeEarlyStages) params.excludeEarlyStages = 'true';
    if (sortByCallCount) params.sortByCallCount = 'true';
    if (needFollowup) params.needFollowup = needFollowup;
    const name = prompt("Name this filter:")?.trim();
    if (!name) return;
    const id = `${Date.now()}`;
    const next = [{ id, name, params }, ...savedFilters].slice(0, 20);
    persistSaved(next);
  };
  const applySavedFilter = (f: { id: string; name: string; params: Record<string,string> }) => {
    setQ(f.params.q || "");
    setStage(f.params.stage || "");
    setOwner(f.params.owner || "");
    setDateRange(f.params.dateRange || "last30days");
    
    setHasEmail(f.params.hasEmail || "");
    setEmailDomain(f.params.emailDomain || "");
    setScoreMin(f.params.scoreMin || "");
    setScoreMax(f.params.scoreMax || "");
    setLastActivity(f.params.lastActivity || "");
    setConnected(f.params.connected === 'true');
    setCallCountMin(f.params.callCountMin || "");
    setCallCountMax(f.params.callCountMax || "");
    setSortByDuration(f.params.sortByDuration === 'true');
    setExcludeEarlyStages(f.params.excludeEarlyStages === 'true');
    setSortByCallCount(f.params.sortByCallCount === 'true');
    setNeedFollowup(f.params.needFollowup || "");
    setOffset(0);
  };
  const removeSavedFilter = (id: string) => {
    persistSaved(savedFilters.filter(f => f.id !== id));
  };

  React.useEffect(() => {
    console.log('Debug - useEffect running with params:', { q, stage, owner, dateRange, limit, offset });
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stage) params.set("stage", stage);
    if (owner) params.set("owner", owner);
    if (dateRange) params.set("dateRange", dateRange);
    
    if (hasEmail) params.set("hasEmail", hasEmail);
    if (emailDomain) params.set("emailDomain", emailDomain);
    if (scoreMin) params.set("scoreMin", scoreMin);
    if (scoreMax) params.set("scoreMax", scoreMax);
    if (lastActivity) params.set("lastActivity", lastActivity);
    if (connected) params.set("connected", "true");
    if (callCountMin) params.set("callCountMin", callCountMin);
    if (callCountMax) params.set("callCountMax", callCountMax);
    if (sortByDuration) params.set("sortByDuration", "true");
    if (excludeEarlyStages) params.set("excludeEarlyStages", "true");
    if (sortByCallCount) params.set("sortByCallCount", "true");
    if (needFollowup) params.set("needFollowup", needFollowup);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    console.log('Debug - Calling API with params:', {
      excludeEarlyStages,
      sortByCallCount,
      connected,
      allParams: params.toString()
    });
    console.log('Debug - Calling API with URL:', `/api/tl/leads?${params.toString()}`);

    Promise.all([
      authenticatedFetch(`/api/tl/leads?${params.toString()}`).then(r => r.json()),
      authenticatedFetch(`/api/tl/users`).then(r => r.json()),
      authenticatedFetch(`/api/tl/reports?dateRange=${encodeURIComponent(dateRange)}&sortByDuration=${sortByDuration}`).then(r => r.json())
    ]).then(([leadsRes, usersRes, reportsRes]) => {
      console.log('Debug - API responses received:');
      console.log('  leadsRes:', leadsRes);
      console.log('  usersRes:', usersRes);
      console.log('  reportsRes:', reportsRes);
      
      if (leadsRes?.success) {
        console.log('Debug - Setting leads data:', leadsRes.rows?.length, 'rows, total:', leadsRes.total);
        setRows(leadsRes.rows || []);
        setTotal(leadsRes.total || 0);
      } else {
        console.log('Debug - Leads API failed or returned no success:', leadsRes);
      }
      if (usersRes?.success) {
        setOwnersMap(usersRes.users || {});
      }
      if (reportsRes?.success) {
        setAgg(reportsRes);
      }
    }).catch(error => {
      console.error('Debug - API call error:', error);
      console.error('Debug - Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setLoading(false);
    }).finally(() => setLoading(false));
  }, [q, stage, owner, dateRange, hasEmail, emailDomain, scoreMin, scoreMax, lastActivity, connected, callCountMin, callCountMax, sortByDuration, excludeEarlyStages, sortByCallCount, needFollowup, limit, offset]);

  const exportCsv = () => {
    const header = [
      'Phone','Name','Email','Source','Stage','Score','Owner','Created At','Last Activity','Call Count'
    ];
    const lines = rows.map(r => {
      const ownerName = ownersMap[r.ownerId || ''] || (r.ownerId || '');
      return [
        r.phone || '',
        r.name || '',
        r.email || '',
        r.source || '',
        r.stage || '',
        String(r.score ?? ''),
        ownerName,
        r.createdAt ? new Date(r.createdAt).toISOString() : '',
        r.lastActivityAt ? new Date(r.lastActivityAt).toISOString() : '',
        String(r.callCount || 0)
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Summaries
  const stageSummary = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = r.stage || 'Unknown';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]);
  }, [rows]);

  const ownerSummary = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = r.ownerId || 'unassigned';
      map.set(key, (map.get(key) || 0) + 1);
    }
    const entries = Array.from(map.entries()).map(([k,v]) => ({ code: k, name: ownersMap[k] || (k === 'unassigned' ? 'Unassigned' : k), count: v }));
    return entries.sort((a,b)=>b.count-a.count).slice(0, 12);
  }, [rows, ownersMap]);

  const ownerOptions = React.useMemo(() => {
    const opts = Object.entries(ownersMap).map(([code, name]) => ({ code, name }));
    opts.sort((a,b)=>a.name.localeCompare(b.name));
    return [{ code: '', name: 'All owners' }, { code: 'unassigned', name: 'Unassigned' }, ...opts];
  }, [ownersMap]);

  const pagination = React.useMemo(() => {
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.max(1, Math.ceil(total / limit || 1));
    const from = total === 0 ? 0 : offset + 1;
    const to = Math.min(offset + limit, total);
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    
    // Debug logging
    console.log('Debug - Current state values:');
    console.log('  rows length:', rows.length);
    console.log('  total:', total);
    console.log('  offset:', offset);
    console.log('  limit:', limit);
    console.log('  pagination:', { currentPage, totalPages, from, to, pages });
    
    return { currentPage, totalPages, from, to, pages };
  }, [offset, limit, total]);

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Conversions Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Daily Conversions</h3>
                  <p className="text-sm text-slate-600">Recent daily trends</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 max-h-64 overflow-auto custom-scrollbar">
              {agg?.trends?.daily?.length ? agg.trends.daily.map((d: any) => (
                <div key={String(d.period)} className="flex items-center justify-between p-3 bg-white/70 rounded-xl hover:bg-white/90 transition-colors">
                  <span className="text-slate-700 font-medium">{new Date(d.period).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-600">{d.conversions}</span>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 font-medium">No data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Conversions Card */}
        <Card className="bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Weekly Conversions</h3>
                  <p className="text-sm text-slate-600">Weekly performance</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 max-h-64 overflow-auto custom-scrollbar">
              {agg?.trends?.weekly?.length ? agg.trends.weekly.map((d: any) => (
                <div key={String(d.period)} className="flex items-center justify-between p-3 bg-white/70 rounded-xl hover:bg-white/90 transition-colors">
                  <span className="text-slate-700 font-medium">Week of {new Date(d.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-emerald-600">{d.conversions}</span>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 font-medium">No data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Conversions Card */}
        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Monthly Conversions</h3>
                  <p className="text-sm text-slate-600">Monthly overview</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 max-h-64 overflow-auto custom-scrollbar">
              {agg?.trends?.monthly?.length ? agg.trends.monthly.map((d: any) => (
                <div key={String(d.period)} className="flex items-center justify-between p-3 bg-white/70 rounded-xl hover:bg-white/90 transition-colors">
                  <span className="text-slate-700 font-medium">{new Date(d.period).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-purple-600">{d.conversions}</span>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 font-medium">No data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Calls per Lead Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Calls per Lead</h3>
          </div>
          <div className="space-y-2">
            {agg?.callsPerLead?.length ? agg.callsPerLead.map((c: any) => (
              <div key={c.leadPhone} className="flex justify-between text-sm">
                <span className="text-slate-600">{c.leadPhone}</span>
                <span className="text-slate-700">Started: {c.started} • Completed: {c.completed}</span>
              </div>
            )) : (
              <div className="text-slate-500 text-sm">No call data</div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-slate-500 mb-1">Search</label>
              <Input className="w-full" value={q} onChange={e=>{setOffset(0); setQ(e.target.value);}} placeholder="Name, email or phone" />
            </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Stage</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={stage} onChange={e=>{setOffset(0); setStage(e.target.value);}}>
              <option value="">All Stages</option>
              <option value="Not contacted">📞 Not contacted</option>
              <option value="Qualified">⭐ Qualified</option>
              <option value="Not interested">❌ Not interested</option>
              <option value="Interested">🤝 Interested</option>
              <option value="To be nurtured">🌱 To be nurtured</option>
              <option value="Junk">🗑️ Junk</option>
              <option value="Ask to call back">📞 Ask to call back</option>
              <option value="Attempt to contact">📱 Attempt to contact</option>
              <option value="Did not Connect">🔌 Did not Connect</option>
              <option value="Customer">💼 Customer</option>
              <option value="Other Language">🌐 Other Language</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Owner</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={owner} onChange={e=>{setOffset(0); setOwner(e.target.value);}}>
              {ownerOptions.map(o => (
                <option key={o.code} value={o.code}>{o.name} {o.code && o.name !== o.code ? `(${o.code})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Date Range</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={dateRange} onChange={e=>{setOffset(0); setDateRange(e.target.value);}}>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7days">Last 7 days</option>
              <option value="last30days">Last 30 days</option>
              <option value="thismonth">This month</option>
              <option value="lastmonth">Last month</option>
              <option value="">All time</option>
            </select>
          </div>
          <div className="ml-auto flex gap-2">
            <Button onClick={()=>{setQ(""); setStage(""); setOwner(""); setDateRange("last30days"); setHasEmail(""); setEmailDomain(""); setScoreMin(""); setScoreMax(""); setLastActivity(""); setConnected(false); setCallCountMin(""); setCallCountMax(""); setSortByDuration(false); setExcludeEarlyStages(false); setSortByCallCount(false); setNeedFollowup(""); setOffset(0);}} variant="outline" size="sm">Reset</Button>
            <Button onClick={()=>setShowAdvanced(v=>!v)} variant="outline" size="sm">{showAdvanced ? 'Hide Advanced' : 'Advanced Filters'}</Button>
            <Button onClick={saveCurrentFilter} variant="outline" size="sm" className="border-blue-600 text-blue-700">Save Filter</Button>
            <Button onClick={exportCsv} size="sm" className="bg-slate-800 hover:bg-slate-900">Download CSV</Button>
          </div>
        </div>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="adv-hasEmail">Has Email</label>
              <select id="adv-hasEmail" className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={hasEmail} onChange={e=>{setOffset(0); setHasEmail(e.target.value);}}>
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="adv-emailDomain">Email Domain</label>
              <Input id="adv-emailDomain" value={emailDomain} onChange={e=>{setOffset(0); setEmailDomain(e.target.value);}} placeholder="gmail.com" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="adv-scoreMin">Score Min</label>
              <Input id="adv-scoreMin" type="number" value={scoreMin} onChange={e=>{setOffset(0); setScoreMin(e.target.value);}} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="adv-scoreMax">Score Max</label>
              <Input id="adv-scoreMax" type="number" value={scoreMax} onChange={e=>{setOffset(0); setScoreMax(e.target.value);}} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="adv-lastActivity">Last Activity</label>
              <select id="adv-lastActivity" className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={lastActivity} onChange={e=>{setOffset(0); setLastActivity(e.target.value);}}>
                <option value="">Any</option>
                <option value="today">Today</option>
                <option value="last3days">Last 3 days</option>
                <option value="lastweek">Last week</option>
                <option value="lastmonth">Last month</option>
                <option value="noactivity">No activity</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="adv-connected">Connected Stages</label>
              <select id="adv-connected" className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={connected ? "true" : ""} onChange={e=>{setOffset(0); setConnected(e.target.value === "true");}}>
                <option value="">All stages</option>
                <option value="true">Connected only (Interested, Qualified, Customer, etc.)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="adv-callCountMin">Call Count Min</label>
              <Input id="adv-callCountMin" type="number" value={callCountMin} onChange={e=>{setOffset(0); setCallCountMin(e.target.value);}} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="adv-callCountMax">Call Count Max</label>
              <Input id="adv-callCountMax" type="number" value={callCountMax} onChange={e=>{setOffset(0); setCallCountMax(e.target.value);}} placeholder="10" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="adv-sortByDuration">Sort by Duration</label>
              <select id="adv-sortByDuration" className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={sortByDuration ? "true" : ""} onChange={e=>{setOffset(0); setSortByDuration(e.target.value === "true");}}>
                <option value="">Default sorting</option>
                <option value="true">By call duration (Exotel integration pending)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="adv-excludeEarlyStages">Successful Connections</label>
              <select id="adv-excludeEarlyStages" className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={excludeEarlyStages ? "true" : ""} onChange={e=>{setOffset(0); setExcludeEarlyStages(e.target.value === "true");}}>
                <option value="">All leads</option>
                <option value="true">Only leads with successful connections (excludes: Attempt to contact, Did not Connect, Not contacted)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="adv-needFollowup">Need Follow-up</label>
              <select id="adv-needFollowup" className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={needFollowup} onChange={e=>{setOffset(0); setNeedFollowup(e.target.value);}}>
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        )}

        {savedFilters.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-slate-500 mb-1">Quick Filters</div>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map(f => (
                <div key={f.id} className="flex items-center gap-2 border border-slate-300 rounded-full px-3 py-1 text-xs">
                  <Button variant="ghost" size="sm" className="text-slate-700 p-0 h-auto cursor-pointer" onClick={()=>applySavedFilter(f)}>{f.name}</Button>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 p-0 h-auto cursor-pointer" onClick={()=>removeSavedFilter(f.id)} title="Remove">✕</Button>
                </div>
              ))}
            </div>
          </div>
        )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">By Stage</div>
            <div className="space-y-2">
              {stageSummary.map(([s, c]) => (
                <div key={s} className="flex justify-between text-sm">
                  <span className="text-slate-600">{s}</span>
                  <span className="font-medium">{c}</span>
                </div>
              ))}
              {stageSummary.length === 0 && <div className="text-slate-500 text-sm">No data</div>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">By Owner (Top 12)</div>
            <div className="space-y-2">
              {ownerSummary.map((o) => (
                <div key={o.code} className="flex justify-between text-sm">
                  <span className="text-slate-600">{o.name}</span>
                  <span className="font-medium">{o.count}</span>
                </div>
              ))}
              {ownerSummary.length === 0 && <div className="text-slate-500 text-sm">No data</div>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">Connected Leads Filter</div>
            <select 
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2" 
              value={connected ? "true" : ""} 
              onChange={e=>{
                console.log('Connected filter changed to:', e.target.value === "true");
                setOffset(0); 
                setConnected(e.target.value === "true");
              }}
            >
              <option value="">All leads</option>
              <option value="true">Number Of Connected Calls</option>
            </select>
            <div className="text-xs text-slate-500">
              {connected ? 'Filtering connected leads only' : 'Showing all leads'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">Successful Connections Filter</div>
            <select 
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2" 
              value={excludeEarlyStages ? "true" : ""} 
              onChange={e=>{
                console.log('ExcludeEarlyStages filter changed to:', e.target.value === "true");
                setOffset(0); 
                setExcludeEarlyStages(e.target.value === "true");
              }}
            >
              <option value="">All leads</option>
              <option value="true">Only leads with successful connections (excludes: Attempt to contact, Did not Connect, Not contacted)</option>
            </select>
            <div className="text-xs text-slate-500">
              {excludeEarlyStages ? 'Filtering successful connections only' : 'Showing all leads'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">Call Count Filter</div>
            <div className="flex gap-2 mb-2">
              <Input 
                type="number" 
                className="flex-1" 
                placeholder="Min calls" 
                value={callCountMin} 
                onChange={e=>{
                  console.log('CallCountMin changed to:', e.target.value);
                  setOffset(0); 
                  setCallCountMin(e.target.value);
                }}
              />
              <Input 
                type="number" 
                className="flex-1" 
                placeholder="Max calls" 
                value={callCountMax} 
                onChange={e=>{
                  console.log('CallCountMax changed to:', e.target.value);
                  setOffset(0); 
                  setCallCountMax(e.target.value);
                }}
              />
            </div>
            <div className="text-xs text-slate-500">
              {callCountMin || callCountMax ? 
                `Filtering leads with ${callCountMin || '0'}-${callCountMax || '∞'} calls` : 
                'Showing leads with any number of calls'
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">Sorting Options</div>
            <select 
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2" 
              value={sortByCallCount ? "true" : ""} 
              onChange={e=>{
                console.log('SortByCallCount filter changed to:', e.target.value === "true");
                setOffset(0); 
                setSortByCallCount(e.target.value === "true");
              }}
            >
              <option value="">Sort by Date (newest first)</option>
              <option value="true">Sort by Call Count (most active first)</option>
            </select>
            <div className="text-xs text-slate-500">
              {sortByCallCount ? 'Sorting by number of stage changes' : 'Sorting by creation date'}
            </div>
          </CardContent>
        </Card>
      </div>


      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 text-sm">
          <div className="text-slate-600">
            {loading ? 'Loading...' : `Showing ${pagination.from}–${pagination.to} of ${total} • Page ${pagination.currentPage} of ${pagination.totalPages}`}
          </div>
          <div className="flex items-center gap-2">
            <select className="border border-slate-300 rounded-md px-2 py-1 text-sm" value={limit} onChange={e=>{setOffset(0); setLimit(Number(e.target.value));}}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <div className="flex items-center gap-1">
              <Button disabled={pagination.currentPage === 1} onClick={()=>setOffset(0)} variant="outline" size="sm">First</Button>
              <Button disabled={pagination.currentPage === 1} onClick={()=>setOffset(Math.max(0, offset - limit))} variant="outline" size="sm">Prev</Button>
              {pagination.pages.map(p => (
                <Button
                  key={p}
                  onClick={()=>setOffset((p - 1) * limit)}
                  variant={p === pagination.currentPage ? "default" : "outline"}
                  size="sm"
                >{p}</Button>
              ))}
              <Button disabled={pagination.currentPage === pagination.totalPages} onClick={()=>setOffset(offset + limit)} variant="outline" size="sm">Next</Button>
              <Button disabled={pagination.currentPage === pagination.totalPages} onClick={()=>setOffset((pagination.totalPages - 1) * limit)} variant="outline" size="sm">Last</Button>
            </div>
          </div>
        </div>
        <Table>
          <THead>
            <tr>
              <TH>Phone</TH>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Source</TH>
              <TH>Stage</TH>
              <TH>Score</TH>
              <TH>Owner</TH>
              <TH>Created</TH>
              <TH>Last Activity</TH>
              <TH>Call Count</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR 
                key={r.phone} 
                className="cursor-pointer transition-colors"
                onClick={() => window.location.href = `/team-leader/lead-management/leads/${encodeURIComponent(r.phone)}`}
              >
                <TD className="text-blue-600 underline">{r.phone}</TD>
                <TD>{r.name || '—'}</TD>
                <TD>{r.email || '—'}</TD>
                <TD>{r.source || '—'}</TD>
                <TD>{r.stage}</TD>
                <TD>{r.score ?? '—'}</TD>
                <TD>{ownersMap[r.ownerId || ''] || r.ownerId || '—'}</TD>
                <TD>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</TD>
                <TD>{r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleString() : '—'}</TD>
                <TD>
                  <Badge className={`${
                    (r.callCount || 0) > 5 ? 'bg-green-100 text-green-800' :
                    (r.callCount || 0) > 2 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {r.callCount || 0}
                  </Badge>
                </TD>
              </TR>
            ))}
            {!loading && rows.length === 0 && (
              <TR>
                <TD className="text-center text-slate-500" colSpan={10}>No results</TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}


