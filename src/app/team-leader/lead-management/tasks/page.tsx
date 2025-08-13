"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface TaskRow { 
  id: number; 
  leadPhone: string; 
  title: string; 
  status: string; 
  dueAt: string | null; 
  createdAt: string | null;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'done':
    case 'completed':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'in_progress':
    case 'working':
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'pending':
    case 'todo':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'overdue':
      return 'text-red-700 bg-red-50 border-red-200';
    default:
      return 'text-slate-700 bg-slate-50 border-slate-200';
  }
};

const getPriorityColor = (dueAt: string | null, status: string) => {
  if (!dueAt || status.toLowerCase() === 'done') return 'normal';
  
  const due = new Date(dueAt);
  const now = new Date();
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilDue < 0) return 'overdue';
  if (hoursUntilDue < 2) return 'urgent';
  if (hoursUntilDue < 24) return 'high';
  return 'normal';
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'overdue':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-red-700 bg-red-100 border border-red-200">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Overdue
        </span>
      );
    case 'urgent':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-red-700 bg-red-50 border border-red-200">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
          Urgent
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          High
        </span>
      );
    default:
      return null;
  }
};

const formatTimeUntilDue = (dueAt: string) => {
  const due = new Date(dueAt);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  
  if (diff < 0) {
    const overdue = Math.abs(diff);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d overdue`;
    return `${hours}h overdue`;
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return 'Due soon';
};

export default function TasksPage() {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const d = await fetch("/api/tl/tasks").then((r) => r.json());
    setRows(d.rows || []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const filteredRows = rows.filter(task => {
    const priority = getPriorityColor(task.dueAt, task.status);
    switch (filter) {
      case 'pending':
        return task.status.toLowerCase() !== 'done';
      case 'overdue':
        return priority === 'overdue';
      case 'completed':
        return task.status.toLowerCase() === 'done';
      default:
        return true;
    }
  });

  const taskStats = {
    total: rows.length,
    pending: rows.filter(t => t.status.toLowerCase() !== 'done').length,
    overdue: rows.filter(t => getPriorityColor(t.dueAt, t.status) === 'overdue').length,
    completed: rows.filter(t => t.status.toLowerCase() === 'done').length
  };

  const handleBulkComplete = async () => {
    if (selectedTasks.length === 0) return;
    
    setBulkLoading(true);
    try {
      const promises = selectedTasks.map(id =>
        fetch("/api/tl/tasks", { 
          method: "PATCH", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ id, status: "DONE" }) 
        })
      );
      
      const results = await Promise.all(promises);
      const successful = results.filter(r => r.ok).length;
      
      if (successful === selectedTasks.length) {
        toast.success(`${successful} tasks marked as completed`);
      } else {
        toast.error(`Only ${successful} of ${selectedTasks.length} tasks updated`);
      }
      
      setSelectedTasks([]);
      refresh();
    } catch (error) {
      toast.error("Failed to update tasks");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSelectAll = () => {
    const pendingTasks = filteredRows.filter(t => t.status.toLowerCase() !== 'done').map(t => t.id);
    setSelectedTasks(selectedTasks.length === pendingTasks.length ? [] : pendingTasks);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Task Management</h1>
              <p className="text-slate-600">Track SLA timers, manage assignments, and bulk operations</p>
            </div>
          </div>
          
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{taskStats.total}</div>
                <div className="text-sm text-slate-600">Total Tasks</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{taskStats.pending}</div>
                <div className="text-sm text-slate-600">Pending</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{taskStats.overdue}</div>
                <div className="text-sm text-slate-600">Overdue</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{taskStats.completed}</div>
                <div className="text-sm text-slate-600">Completed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Bulk Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700">Filter:</span>
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All Tasks', count: taskStats.total },
                { key: 'pending', label: 'Pending', count: taskStats.pending },
                { key: 'overdue', label: 'Overdue', count: taskStats.overdue },
                { key: 'completed', label: 'Completed', count: taskStats.completed }
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setFilter(option.key as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filter === option.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {option.label}
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    filter === option.key ? 'bg-white/20' : 'bg-slate-100'
                  }`}>
                    {option.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">{selectedTasks.length} selected</span>
              <button
                onClick={handleBulkComplete}
                disabled={bulkLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {bulkLoading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                Mark Complete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading tasks...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {filter === 'all' ? 'No Tasks Found' : `No ${filter} Tasks`}
            </h3>
            <p className="text-slate-600">
              {filter === 'all' 
                ? 'No tasks have been created yet.' 
                : `No tasks match the ${filter} filter.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedTasks.length === filteredRows.filter(t => t.status.toLowerCase() !== 'done').length && filteredRows.filter(t => t.status.toLowerCase() !== 'done').length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Lead</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Task</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Due</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((task) => {
                  const priority = getPriorityColor(task.dueAt, task.status);
                  const isDone = task.status.toLowerCase() === 'done';
                  
                  return (
                    <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {!isDone && (
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTasks([...selectedTasks, task.id]);
                              } else {
                                setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                              }
                            }}
                            className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getPriorityBadge(priority)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="font-medium text-slate-900">{task.leadPhone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={isDone ? 'line-through text-slate-500' : 'text-slate-900'}>
                          {task.title}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {task.dueAt ? (
                          <div>
                            <div className="text-slate-900">{new Date(task.dueAt).toLocaleDateString()}</div>
                            <div className="text-xs text-slate-500">{formatTimeUntilDue(task.dueAt)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">No due date</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!isDone ? (
                          <button 
                            className="text-emerald-600 hover:text-emerald-700 font-medium" 
                            onClick={async () => {
                              const res = await fetch("/api/tl/tasks", { 
                                method: "PATCH", 
                                headers: { "Content-Type": "application/json" }, 
                                body: JSON.stringify({ id: task.id, status: "DONE" }) 
                              });
                              if (res.ok) {
                                toast.success("Task marked as completed");
                              } else {
                                toast.error("Failed to update task");
                              }
                              refresh();
                            }}
                          >
                            Mark Complete
                          </button>
                        ) : (
                          <span className="text-slate-400">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}