"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { cn } from "@/lib/utils";

const items = [
  { href: "/team-leader/lead-management", label: "Overview", icon: Icons.LayoutDashboard },
  { href: "/team-leader/lead-management/queue", label: "Queue", icon: Icons.ListChecks },
  { href: "/team-leader/lead-management/leads", label: "Leads", icon: Icons.UserSquare2 },
  { href: "/team-leader/lead-management/agents", label: "Agents", icon: Icons.Users },
  { href: "/team-leader/lead-management/tasks", label: "Tasks", icon: Icons.AlarmClock },
  { href: "/team-leader/lead-management/automations", label: "Automations", icon: Icons.Workflow },
  { href: "/team-leader/lead-management/analytics", label: "Analytics", icon: Icons.BarChart3 },
  { href: "/team-leader/lead-management/reports", label: "Reports", icon: Icons.PieChart },
  { href: "/team-leader/lead-management/integrations", label: "Integrations", icon: Icons.Plug },
  { href: "/team-leader/lead-management/settings", label: "Settings", icon: Icons.Settings },
  { href: "/team-leader/lead-management/audit", label: "Audit", icon: Icons.ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [activeRule, setActiveRule] = useState<string>("");

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
        return { short: "RR", title: "Pure Round-Robin" };
      case "CONVERSION_WEIGHTED":
        return { short: "CW", title: "Conversion-based" };
      case "HYBRID":
        return { short: "HY", title: "Hybrid" };
      default:
        return null;
    }
  })();
  return (
    <aside className="hidden md:flex h-screen w-72 flex-col border-r border-slate-200 bg-white">
      <div className="p-4 text-lg font-semibold">Team Lead</div>
      <nav className="flex-1 px-3 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-slate-100",
                active && "bg-slate-100"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {label === "Automations" && shortRule && (
                <span
                  className="ml-auto inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px]"
                  title={shortRule.title}
                >
                  {shortRule.short}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-200 text-xs text-slate-500">v1.0.0</div>
    </aside>
  );
}


