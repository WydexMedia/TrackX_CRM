"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { cn } from "@/lib/utils";

const items = [
  { href: "/team-leader/lead-management", label: "Overview", icon: Icons.LayoutDashboard, badge: null },
  { href: "/team-leader/lead-management/queue", label: "Queue", icon: Icons.ListChecks, badge: null },
  { href: "/team-leader/lead-management/leads", label: "Leads", icon: Icons.UserSquare2, badge: null },
  { href: "/team-leader/lead-management/agents", label: "Agents", icon: Icons.Users, badge: null },
  { href: "/team-leader/lead-management/tasks", label: "Tasks", icon: Icons.AlarmClock, badge: null },
  { href: "/team-leader/lead-management/automations", label: "Automations", icon: Icons.Workflow, badge: "automation" },
  { href: "/team-leader/lead-management/analytics", label: "Analytics", icon: Icons.BarChart3, badge: null },
  { href: "/team-leader/lead-management/reports", label: "Reports", icon: Icons.PieChart, badge: null },
  { href: "/team-leader/lead-management/integrations", label: "Integrations", icon: Icons.Plug, badge: null },
  { href: "/team-leader/lead-management/settings", label: "Settings", icon: Icons.Settings, badge: null },
  { href: "/team-leader/lead-management/audit", label: "Audit", icon: Icons.ShieldCheck, badge: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [activeRule, setActiveRule] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      fetch("/api/tl/automations", { cache: "no-store", signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setActiveRule(d.active || ""))
        .catch(() => {});
    };
    load();
    const onChanged = (e: any) => {
      const id = e?.detail?.id || null;
      if (id) setActiveRule(id);
      else load();
    };
    window.addEventListener("automation-rule-changed", onChanged as EventListener);
    return () => {
      controller.abort();
      window.removeEventListener("automation-rule-changed", onChanged as EventListener);
    };
  }, []);

  const shortRule = (() => {
    switch (activeRule) {
      case "ROUND_ROBIN":
        return { short: "RR", title: "Pure Round-Robin", color: "bg-blue-100 text-blue-700" };
      case "CONVERSION_WEIGHTED":
        return { short: "CW", title: "Conversion-based", color: "bg-green-100 text-green-700" };
      case "HYBRID":
        return { short: "HY", title: "Hybrid", color: "bg-purple-100 text-purple-700" };
      default:
        return null;
    }
  })();

  return (
    <aside className={cn(
      "hidden md:flex h-screen flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-300",
      isCollapsed ? "w-16" : "w-72"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">Team Lead</div>
              <div className="text-xs text-slate-500">Lead Management</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className={cn("w-4 h-4 text-slate-600 transition-transform", isCollapsed && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== "/team-leader/lead-management" && pathname?.startsWith(href));
          return (
            <div key={href} className="relative">
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 hover:bg-slate-50",
                  active && "bg-blue-50 text-blue-700 shadow-sm border border-blue-100",
                  !active && "text-slate-700 hover:text-slate-900"
                )}
                title={isCollapsed ? label : undefined}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-blue-600")} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{label}</span>
                    {badge === "automation" && shortRule && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          shortRule.color
                        )}
                        title={shortRule.title}
                      >
                        {shortRule.short}
                      </span>
                    )}
                  </>
                )}
              </Link>
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">Team Leader</div>
              <div className="text-xs text-slate-500">v1.0.0</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}