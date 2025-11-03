"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { authenticatedFetch } from "@/lib/tokenValidation";

type TaskRow = { 
  id: number; 
  leadPhone: string; 
  title: string; 
  status: string; 
  type?: string | null; 
  dueAt?: string | null; 
  priority?: string | null; 
  ownerId?: string | null; 
};

type Lead = { 
  phone: string; 
  name?: string | null; 
  source?: string | null; 
  stage?: string | null; 
};

interface TaskListProps {
  tasks: TaskRow[];
  leads: Lead[];
  onTaskUpdate: (taskId: number, updates: Partial<TaskRow>) => void;
  onLeadClick: (lead: Lead) => void;
}

// Memoized task row component
const TaskRow = React.memo(({ 
  task, 
  lead, 
  onStatusChange, 
  onLeadClick 
}: {
  task: TaskRow;
  lead: Lead | undefined;
  onStatusChange: (taskId: number, status: string) => void;
  onLeadClick: (lead: Lead) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'SKIPPED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDueDate = (dueAt: string | null | undefined) => {
    if (!dueAt) return 'No due date';
    const date = new Date(dueAt);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <button
          onClick={() => lead && onLeadClick(lead)}
          className="text-left hover:text-primary transition-colors"
        >
          <div className="font-medium text-slate-900">{lead?.name || 'Unknown'}</div>
          <div className="text-sm text-slate-500">{task.leadPhone}</div>
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-slate-900">{task.title}</div>
        {task.type && (
          <div className="text-xs text-slate-500 mt-1">{task.type}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
              <Badge className={`${getStatusColor(task.status)} border-0`}>
                {task.status}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, 'OPEN')}>
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, 'PENDING')}>
              Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, 'DONE')}>
              Done
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(task.id, 'SKIPPED')}>
              Skipped
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-4 py-3">
        {task.priority && (
          <Badge className={`${getPriorityColor(task.priority)} border-0 text-xs`}>
            {task.priority}
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-slate-600">
          {formatDueDate(task.dueAt)}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-slate-600">{task.ownerId || 'Unassigned'}</div>
      </td>
    </tr>
  );
});

export default function TaskList({ tasks, leads, onTaskUpdate, onLeadClick }: TaskListProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'pending' | 'done'>('all');
  const [sortBy, setSortBy] = useState<'due' | 'priority' | 'status'>('due');

  // Memoized filtered and sorted tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;
    
    // Apply filter
    if (filter !== 'all') {
      filtered = tasks.filter(task => task.status.toLowerCase() === filter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'due':
          const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
          const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
          return aDue - bDue;
        case 'priority':
          const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          return bPriority - aPriority;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [tasks, filter, sortBy]);

  // Memoized lead lookup
  const leadMap = useMemo(() => {
    const map = new Map<string, Lead>();
    leads.forEach(lead => map.set(lead.phone, lead));
    return map;
  }, [leads]);

  // Memoized status change handler
  const handleStatusChange = useCallback(async (taskId: number, status: string) => {
    try {
      const response = await authenticatedFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onTaskUpdate(taskId, { status });
        }
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  }, [onTaskUpdate]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const open = tasks.filter(t => t.status === 'OPEN').length;
    const pending = tasks.filter(t => t.status === 'PENDING').length;
    const done = tasks.filter(t => t.status === 'DONE').length;
    
    return { total, open, pending, done };
  }, [tasks]);

  return (
    <div className="space-y-4">
      {/* Task Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-slate-900">{taskStats.total}</div>
          <div className="text-sm text-slate-600">Total Tasks</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{taskStats.open}</div>
          <div className="text-sm text-slate-600">Open</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
          <div className="text-sm text-slate-600">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{taskStats.done}</div>
          <div className="text-sm text-slate-600">Done</div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'open', 'pending', 'done'] as const).map((filterOption) => (
            <Button
              key={filterOption}
              variant={filter === filterOption ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(filterOption)}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'due' | 'priority' | 'status')}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="due">Sort by Due Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      {/* Task Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Lead</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Task</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Priority</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Due Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Owner</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                lead={leadMap.get(task.leadPhone)}
                onStatusChange={handleStatusChange}
                onLeadClick={onLeadClick}
              />
            ))}
          </tbody>
        </table>
        
        {filteredAndSortedTasks.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No tasks found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
}





