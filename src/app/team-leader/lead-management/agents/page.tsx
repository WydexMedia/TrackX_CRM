"use client";

import { useEffect, useState } from "react";

interface AgentKPI {
  user: { id: string; name: string };
  touches: number;
  connects: number;
  qualRate: number;
  frtMedianSec: number;
  openTasks: number;
  breaches: number;
}

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const getPerformanceColor = (value: number, type: 'percentage' | 'breaches' | 'response' | 'tasks') => {
  switch (type) {
    case 'percentage':
      if (value >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      if (value >= 60) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      return 'text-red-700 bg-red-50 border-red-200';
    case 'breaches':
      if (value === 0) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      if (value <= 2) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      return 'text-red-700 bg-red-50 border-red-200';
    case 'response':
      if (value <= 300) return 'text-emerald-700 bg-emerald-50 border-emerald-200'; // 5 min
      if (value <= 900) return 'text-yellow-700 bg-yellow-50 border-yellow-200'; // 15 min
      return 'text-red-700 bg-red-50 border-red-200';
    case 'tasks':
      if (value <= 3) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      if (value <= 7) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      return 'text-red-700 bg-red-50 border-red-200';
    default:
      return 'text-slate-700 bg-slate-50 border-slate-200';
  }
};

const getPerformanceIcon = (value: number, type: 'percentage' | 'breaches' | 'response' | 'tasks') => {
  const isGood = (type === 'percentage' && value >= 80) ||
                 (type === 'breaches' && value === 0) ||
                 (type === 'response' && value <= 300) ||
                 (type === 'tasks' && value <= 3);
  
  const isOk = (type === 'percentage' && value >= 60) ||
               (type === 'breaches' && value <= 2) ||
               (type === 'response' && value <= 900) ||
               (type === 'tasks' && value <= 7);

  if (isGood) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }
  
  if (isOk) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }
  
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  );
};

export default function AgentsPage() {
  const [rows, setRows] = useState<AgentKPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [salesByCode, setSalesByCode] = useState<Record<string, { name: string; code: string }>>({});
  const [sortBy, setSortBy] = useState<'qualRate' | 'connects' | 'touches' | 'breaches'>('qualRate');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    setLoading(true);
    fetch("/api/tl/agents/kpis").then((r) => r.json()).then((d) => setRows(d.rows || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((all) => {
        const onlySales = (Array.isArray(all) ? all : []).filter((u: any) => (u.role ?? 'sales') === "sales");
        const map: Record<string, { name: string; code: string }> = {};
        for (const u of onlySales) map[u.code] = { name: u.name, code: u.code };
        setSalesByCode(map);
      })
      .catch(() => {});
  }, []);

  const sortedRows = [...rows].sort((a, b) => {
    switch (sortBy) {
      case 'qualRate':
        return b.qualRate - a.qualRate;
      case 'connects':
        return b.connects - a.connects;
      case 'touches':
        return b.touches - a.touches;
      case 'breaches':
        return a.breaches - b.breaches;
      default:
        return 0;
    }
  });

  const teamStats = rows.length > 0 ? {
    avgQualRate: Math.round(rows.reduce((sum, r) => sum + r.qualRate, 0) / rows.length),
    totalTouches: rows.reduce((sum, r) => sum + r.touches, 0),
    totalConnects: rows.reduce((sum, r) => sum + r.connects, 0),
    totalBreaches: rows.reduce((sum, r) => sum + r.breaches, 0),
    avgResponseTime: Math.round(rows.reduce((sum, r) => sum + r.frtMedianSec, 0) / rows.length)
  } : null;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Sales Agents</h1>
              <p className="text-slate-600">Team performance dashboard and KPI tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-slate-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  viewMode === 'cards' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Team Summary */}
        {teamStats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-sm font-medium text-slate-600">Team Size</div>
              <div className="text-2xl font-bold text-slate-900">{rows.length}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-sm font-medium text-slate-600">Avg Qual Rate</div>
              <div className="text-2xl font-bold text-slate-900">{teamStats.avgQualRate}%</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-sm font-medium text-slate-600">Total Touches</div>
              <div className="text-2xl font-bold text-slate-900">{teamStats.totalTouches}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-sm font-medium text-slate-600">Total Connects</div>
              <div className="text-2xl font-bold text-slate-900">{teamStats.totalConnects}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-sm font-medium text-slate-600">Avg Response</div>
              <div className="text-2xl font-bold text-slate-900">{formatTime(teamStats.avgResponseTime)}</div>
            </div>
          </div>
        )}

        {/* Sort Controls */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm font-medium text-slate-700">Sort by:</span>
          <div className="flex gap-2">
            {[
              { key: 'qualRate', label: 'Qualification Rate' },
              { key: 'connects', label: 'Connects' },
              { key: 'touches', label: 'Touches' },
              { key: 'breaches', label: 'Fewest Breaches' }
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setSortBy(option.key as any)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  sortBy === option.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading agent performance data...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Agent Data</h3>
          <p className="text-slate-600">No agent performance data available at this time.</p>
        </div>
      ) : (
        <>
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedRows.map((agent, index) => {
                const displayName = salesByCode[agent.user.id]?.name || agent.user.name || agent.user.id;
                const isTopPerformer = index < 3;
                
                return (
                  <div key={agent.user.id} className={`bg-white border-2 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg ${
                    isTopPerformer ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-white' : 'border-slate-200'
                  }`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{displayName}</h3>
                          <p className="text-sm text-slate-500">Sales Agent</p>
                        </div>
                      </div>
                      {isTopPerformer && (
                        <div className="text-yellow-500">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* KPIs Grid */}
                    <div className="space-y-3">
                      <div className={`flex items-center justify-between p-3 rounded-lg border ${getPerformanceColor(agent.qualRate, 'percentage')}`}>
                        <div className="flex items-center gap-2">
                          {getPerformanceIcon(agent.qualRate, 'percentage')}
                          <span className="text-sm font-medium">Qualification Rate</span>
                        </div>
                        <span className="font-bold">{agent.qualRate}%</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 mb-1">Touches</div>
                          <div className="font-bold text-slate-900">{agent.touches}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 mb-1">Connects</div>
                          <div className="font-bold text-slate-900">{agent.connects}</div>
                        </div>
                      </div>

                      <div className={`flex items-center justify-between p-3 rounded-lg border ${getPerformanceColor(agent.frtMedianSec, 'response')}`}>
                        <div className="flex items-center gap-2">
                          {getPerformanceIcon(agent.frtMedianSec, 'response')}
                          <span className="text-sm font-medium">Response Time</span>
                        </div>
                        <span className="font-bold">{formatTime(agent.frtMedianSec)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className={`p-3 rounded-lg border ${getPerformanceColor(agent.openTasks, 'tasks')}`}>
                          <div className="flex items-center gap-1 mb-1">
                            {getPerformanceIcon(agent.openTasks, 'tasks')}
                            <span className="text-xs font-medium">Open Tasks</span>
                          </div>
                          <div className="font-bold">{agent.openTasks}</div>
                        </div>
                        <div className={`p-3 rounded-lg border ${getPerformanceColor(agent.breaches, 'breaches')}`}>
                          <div className="flex items-center gap-1 mb-1">
                            {getPerformanceIcon(agent.breaches, 'breaches')}
                            <span className="text-xs font-medium">Breaches</span>
                          </div>
                          <div className="font-bold">{agent.breaches}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-6 py-4 font-semibold text-slate-900">Agent</th>
                      <th className="text-left px-6 py-4 font-semibold text-slate-900">Qual Rate</th>
                      <th className="text-left px-6 py-4 font-semibold text-slate-900">Touches</th>
                      <th className="text-left px-6 py-4 font-semibold text-slate-900">Connects</th>
                      <th className="text-left px-6 py-4 font-semibold text-slate-900">Response Time</th>
                      <th className="text-left px-6 py-4 font-semibold text-slate-900">Open Tasks</th>
                      <th className="text-left px-6 py-4 font-semibold text-slate-900">Breaches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((agent, index) => {
                      const displayName = salesByCode[agent.user.id]?.name || agent.user.name || agent.user.id;
                      const isTopPerformer = index < 3;
                      
                      return (
                        <tr key={agent.user.id} className={`border-b border-slate-100 hover:bg-slate-50 ${
                          isTopPerformer ? 'bg-yellow-50' : ''
                        }`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="font-medium text-slate-900">{displayName}</div>
                              {isTopPerformer && (
                                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(agent.qualRate, 'percentage')}`}>
                              {agent.qualRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">{agent.touches}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{agent.connects}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(agent.frtMedianSec, 'response')}`}>
                              {formatTime(agent.frtMedianSec)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(agent.openTasks, 'tasks')}`}>
                              {agent.openTasks}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(agent.breaches, 'breaches')}`}>
                              {agent.breaches}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}