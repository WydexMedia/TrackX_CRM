"use client";
import React from 'react';

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
  const [needFollowup, setNeedFollowup] = React.useState<string>(""); // '', 'true', 'false'
  const [hasEmail, setHasEmail] = React.useState<string>(""); // '', 'true', 'false'
  const [emailDomain, setEmailDomain] = React.useState<string>("");
  const [scoreMin, setScoreMin] = React.useState<string>("");
  const [scoreMax, setScoreMax] = React.useState<string>("");
  const [lastActivity, setLastActivity] = React.useState<string>("");

  // Saved quick filters
  const [savedFilters, setSavedFilters] = React.useState<Array<{ id: string; name: string; params: Record<string,string> }>>([]);
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
    if (needFollowup) params.needFollowup = needFollowup;
    if (hasEmail) params.hasEmail = hasEmail;
    if (emailDomain) params.emailDomain = emailDomain;
    if (scoreMin) params.scoreMin = scoreMin;
    if (scoreMax) params.scoreMax = scoreMax;
    if (lastActivity) params.lastActivity = lastActivity;
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
    setNeedFollowup(f.params.needFollowup || "");
    setHasEmail(f.params.hasEmail || "");
    setEmailDomain(f.params.emailDomain || "");
    setScoreMin(f.params.scoreMin || "");
    setScoreMax(f.params.scoreMax || "");
    setLastActivity(f.params.lastActivity || "");
    setOffset(0);
  };
  const removeSavedFilter = (id: string) => {
    persistSaved(savedFilters.filter(f => f.id !== id));
  };

  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stage) params.set("stage", stage);
    if (owner) params.set("owner", owner);
    if (dateRange) params.set("dateRange", dateRange);
    if (needFollowup) params.set("needFollowup", needFollowup);
    if (hasEmail) params.set("hasEmail", hasEmail);
    if (emailDomain) params.set("emailDomain", emailDomain);
    if (scoreMin) params.set("scoreMin", scoreMin);
    if (scoreMax) params.set("scoreMax", scoreMax);
    if (lastActivity) params.set("lastActivity", lastActivity);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    Promise.all([
      fetch(`/api/tl/leads?${params.toString()}`).then(r => r.json()),
      fetch(`/api/tl/users`).then(r => r.json()),
      fetch(`/api/tl/reports?dateRange=${encodeURIComponent(dateRange)}`).then(r => r.json())
    ]).then(([leadsRes, usersRes, reportsRes]) => {
      if (leadsRes?.success) {
        setRows(leadsRes.rows || []);
        setTotal(leadsRes.total || 0);
      }
      if (usersRes?.success) {
        setOwnersMap(usersRes.users || {});
      }
      if (reportsRes?.success) {
        setAgg(reportsRes);
      }
    }).finally(() => setLoading(false));
  }, [q, stage, owner, dateRange, needFollowup, hasEmail, emailDomain, scoreMin, scoreMax, lastActivity, limit, offset]);

  const exportCsv = () => {
    const header = [
      'Phone','Name','Email','Source','Stage','Score','Owner','Created At','Last Activity','Need Followup','Followup Date','Followup Notes'
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
        r.needFollowup ? 'Yes' : 'No',
        r.followupDate ? new Date(r.followupDate).toISOString() : '',
        (r.followupNotes || '').toString().replace(/\n/g, ' ')
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
    return { currentPage, totalPages, from, to, pages };
  }, [offset, limit, total]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 mb-1">Search</label>
            <input className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" value={q} onChange={e=>{setOffset(0); setQ(e.target.value);}} placeholder="Name, email or phone" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Stage</label>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={stage} onChange={e=>{setOffset(0); setStage(e.target.value);}}>
              <option value="">All</option>
              <option>Attempt to contact</option>
              <option>Qualified</option>
              <option>Connected to WhatsApp</option>
              <option>Positive</option>
              <option>Not interested</option>
              <option>Invalid</option>
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
            <button onClick={()=>{setQ(""); setStage(""); setOwner(""); setDateRange("last30days"); setNeedFollowup(""); setHasEmail(""); setEmailDomain(""); setScoreMin(""); setScoreMax(""); setLastActivity(""); setOffset(0);}} className="px-4 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer">Reset</button>
            <button onClick={()=>setShowAdvanced(v=>!v)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer">{showAdvanced ? 'Hide Advanced' : 'Advanced Filters'}</button>
            <button onClick={saveCurrentFilter} className="px-4 py-2 border border-blue-600 text-blue-700 rounded-lg text-sm cursor-pointer">Save Filter</button>
            <button onClick={exportCsv} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm cursor-pointer">Download CSV</button>
          </div>
        </div>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Need Follow-up</label>
              <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={needFollowup} onChange={e=>{setOffset(0); setNeedFollowup(e.target.value);}}>
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Has Email</label>
              <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={hasEmail} onChange={e=>{setOffset(0); setHasEmail(e.target.value);}}>
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email Domain</label>
              <input className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={emailDomain} onChange={e=>{setOffset(0); setEmailDomain(e.target.value);}} placeholder="gmail.com" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Score Min</label>
              <input type="number" className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={scoreMin} onChange={e=>{setOffset(0); setScoreMin(e.target.value);}} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Score Max</label>
              <input type="number" className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={scoreMax} onChange={e=>{setOffset(0); setScoreMax(e.target.value);}} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Last Activity</label>
              <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={lastActivity} onChange={e=>{setOffset(0); setLastActivity(e.target.value);}}>
                <option value="">Any</option>
                <option value="today">Today</option>
                <option value="last3days">Last 3 days</option>
                <option value="lastweek">Last week</option>
                <option value="lastmonth">Last month</option>
                <option value="noactivity">No activity</option>
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
                  <button className="text-slate-700 cursor-pointer" onClick={()=>applySavedFilter(f)}>{f.name}</button>
                  <button className="text-slate-400 hover:text-red-600 cursor-pointer" onClick={()=>removeSavedFilter(f.id)} title="Remove">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
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
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-sm font-medium mb-3">Calls per Lead (Top 10)</div>
          <div className="space-y-2 text-sm">
            {agg?.callsPerLead?.length ? agg.callsPerLead.map((c: any) => (
              <div key={c.leadPhone} className="flex justify-between">
                <span className="text-slate-600">{c.leadPhone}</span>
                <span className="font-medium">{c.started} started / {c.completed} completed</span>
              </div>
            )) : <div className="text-slate-500">No data</div>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-sm font-medium mb-3">Assigned vs Converted (Top 20)</div>
          <div className="space-y-2 text-sm">
            {agg?.assignedVsConverted?.length ? agg.assignedVsConverted.map((r: any) => (
              <div key={r.ownerId} className="flex justify-between">
                <span className="text-slate-600">{ownersMap[r.ownerId] || r.ownerId}</span>
                <span className="font-medium">{r.converted}/{r.assigned}</span>
              </div>
            )) : <div className="text-slate-500">No data</div>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-sm font-medium mb-3">Average Response Time</div>
          <div className="text-2xl font-semibold">
            {agg ? `${Math.round((agg.avgResponseMs || 0)/1000)}s` : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Time from lead creation to first call</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-sm font-medium mb-3">Daily Conversions</div>
          <div className="space-y-1 text-sm max-h-64 overflow-auto">
            {agg?.trends?.daily?.length ? agg.trends.daily.map((d: any) => (
              <div key={String(d.period)} className="flex justify-between">
                <span className="text-slate-600">{new Date(d.period).toLocaleDateString()}</span>
                <span className="font-medium">{d.conversions}</span>
              </div>
            )) : <div className="text-slate-500">No data</div>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-sm font-medium mb-3">Weekly Conversions</div>
          <div className="space-y-1 text-sm max-h-64 overflow-auto">
            {agg?.trends?.weekly?.length ? agg.trends.weekly.map((d: any) => (
              <div key={String(d.period)} className="flex justify-between">
                <span className="text-slate-600">{new Date(d.period).toLocaleDateString()}</span>
                <span className="font-medium">{d.conversions}</span>
              </div>
            )) : <div className="text-slate-500">No data</div>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-sm font-medium mb-3">Monthly Conversions</div>
          <div className="space-y-1 text-sm max-h-64 overflow-auto">
            {agg?.trends?.monthly?.length ? agg.trends.monthly.map((d: any) => (
              <div key={String(d.period)} className="flex justify-between">
                <span className="text-slate-600">{new Date(d.period).toLocaleDateString(undefined,{ year: 'numeric', month: 'short' })}</span>
                <span className="font-medium">{d.conversions}</span>
              </div>
            )) : <div className="text-slate-500">No data</div>}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
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
              <button disabled={pagination.currentPage === 1} onClick={()=>setOffset(0)} className="px-2 py-1 border rounded disabled:opacity-50 cursor-pointer">First</button>
              <button disabled={pagination.currentPage === 1} onClick={()=>setOffset(Math.max(0, offset - limit))} className="px-2 py-1 border rounded disabled:opacity-50 cursor-pointer">Prev</button>
              {pagination.pages.map(p => (
                <button
                  key={p}
                  onClick={()=>setOffset((p - 1) * limit)}
                  className={`px-2 py-1 border rounded cursor-pointer ${p === pagination.currentPage ? 'bg-slate-800 text-white' : ''}`}
                >{p}</button>
              ))}
              <button disabled={pagination.currentPage === pagination.totalPages} onClick={()=>setOffset(offset + limit)} className="px-2 py-1 border rounded disabled:opacity-50 cursor-pointer">Next</button>
              <button disabled={pagination.currentPage === pagination.totalPages} onClick={()=>setOffset((pagination.totalPages - 1) * limit)} className="px-2 py-1 border rounded disabled:opacity-50 cursor-pointer">Last</button>
            </div>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Source</th>
              <th className="px-4 py-2 text-left">Stage</th>
              <th className="px-4 py-2 text-left">Score</th>
              <th className="px-4 py-2 text-left">Owner</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-left">Last Activity</th>
              <th className="px-4 py-2 text-left">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.phone} className="border-t">
                <td className="px-4 py-2">{r.phone}</td>
                <td className="px-4 py-2">{r.name || '—'}</td>
                <td className="px-4 py-2">{r.email || '—'}</td>
                <td className="px-4 py-2">{r.source || '—'}</td>
                <td className="px-4 py-2">{r.stage}</td>
                <td className="px-4 py-2">{r.score ?? '—'}</td>
                <td className="px-4 py-2">{ownersMap[r.ownerId || ''] || r.ownerId || '—'}</td>
                <td className="px-4 py-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-2">{r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-2">{r.needFollowup ? 'Yes' : 'No'}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={10}>No results</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


