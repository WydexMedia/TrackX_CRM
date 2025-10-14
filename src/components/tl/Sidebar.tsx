"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { authenticatedFetch } from "@/lib/tokenValidation";
import { useTenant } from "@/hooks/useTenant";
import { ChevronDown, User, LogOut, Settings as SettingsIcon } from "lucide-react";

const items = [
  { href: "/team-leader", label: "Overview", icon: Icons.LayoutDashboard, badge: null },
  { href: "/team-leader/leads", label: "Leads", icon: Icons.UserSquare2, badge: null },
  { href: "/team-leader/tasks", label: "Tasks", icon: Icons.AlarmClock, badge: null },
  { href: "/team-leader/automations", label: "Automations", icon: Icons.Workflow, badge: "automation" },
  { href: "/team-leader/analytics", label: "Analytics", icon: Icons.BarChart3, badge: null },
  { href: "/team-leader/kpis", label: "KPIs", icon: Icons.Target, badge: null },
  { href: "/team-leader/reports", label: "Reports", icon: Icons.PieChart, badge: null },
  { href: "/team-leader/sales", label: "Sales Management", icon: Icons.TrendingUp, badge: null },
  { href: "/team-leader/team-management", label: "Team Management", icon: Icons.Users, badge: null },
  { href: "/team-leader/daily-leaderboard", label: "Today's Sales", icon: Icons.Trophy, badge: null },
  { href: "/team-leader/integrations", label: "Integrations", icon: Icons.Plug, badge: null },
];

const settingsItems = [
  { href: "/team-leader/settings", label: "Stage Management", icon: Icons.Settings },
  { href: "/team-leader/profile", label: "Profile", icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeRule, setActiveRule] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const { subdomain } = useTenant();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/users/logout', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ token })
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/login");
  };

  // Auto-expand settings if on settings or profile page
  useEffect(() => {
    if (pathname?.startsWith("/team-leader/settings") || pathname?.startsWith("/team-leader/profile")) {
      setSettingsExpanded(true);
    }
  }, [pathname]);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      authenticatedFetch("/api/tl/automations", { cache: "no-store", signal: controller.signal })
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
      case "CUSTOM":
        return { short: "CU", title: "Custom Automation", color: "bg-orange-100 text-orange-700" };
      default:
        return null;
    }
  })();

  return (
    <aside className={cn(
      "hidden md:flex h-screen flex-col border-r border-slate-200/60 bg-gradient-to-b from-slate-50 to-white shadow-sm transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/60">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 capitalize">
                {subdomain ? subdomain.split('.')[0] : 'Wydex'}
              </div>
              <div className="text-xs text-slate-500">CRM Dashboard</div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-slate-100"
        >
          <svg className={cn("w-4 h-4 text-slate-600 transition-transform", isCollapsed && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== "/team-leader" && pathname?.startsWith(href));
          
          const linkContent = (
            <Link
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active && "bg-primary/10 text-primary shadow-sm border border-primary/20",
                !active && "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0", active && "text-primary")} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-xs">{label}</span>
                  {badge === "automation" && shortRule && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-[9px] px-1.5 py-0 h-4", shortRule.color)}
                      title={shortRule.title}
                    >
                      {shortRule.short}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );

          return (
            <div key={href} className="relative">
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                linkContent
              )}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
              )}
            </div>
          );
        })}

        {/* Settings Dropdown Section */}
        <div className="px-2 mt-2">
          <div className="relative">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSettingsExpanded(!settingsExpanded)}
                    className={cn(
                      "w-full flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      (pathname?.startsWith("/team-leader/settings") || pathname?.startsWith("/team-leader/profile"))
                        ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <SettingsIcon className={cn("h-4 w-4", (pathname?.startsWith("/team-leader/settings") || pathname?.startsWith("/team-leader/profile")) && "text-primary")} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <button
                  onClick={() => setSettingsExpanded(!settingsExpanded)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    (pathname?.startsWith("/team-leader/settings") || pathname?.startsWith("/team-leader/profile"))
                      ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <SettingsIcon className={cn("h-4 w-4 flex-shrink-0", (pathname?.startsWith("/team-leader/settings") || pathname?.startsWith("/team-leader/profile")) && "text-primary")} />
                  <span className="flex-1 text-xs text-left">Settings</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform", settingsExpanded && "rotate-180")} />
                </button>

                {/* Settings Submenu */}
                {settingsExpanded && (
                  <div className="mt-1 ml-4 space-y-0.5 border-l-2 border-slate-200 pl-2">
                    {settingsItems.map(({ href, label, icon: Icon }) => {
                      const active = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
                            active && "bg-primary/10 text-primary",
                            !active && "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                        >
                          <Icon className="h-3 w-3 flex-shrink-0" />
                          {label}
                        </Link>
                      );
                    })}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <LogOut className="h-3 w-3 flex-shrink-0" />
                      Logout
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200/60">
        {!isCollapsed && (
          <div className="text-center">
            <p className="text-[10px] text-slate-500">TrackX CRM</p>
            <p className="text-[9px] text-slate-400 mt-0.5">v2.0</p>
          </div>
        )}
      </div>
    </aside>
  );
}