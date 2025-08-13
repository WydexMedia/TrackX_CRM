"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/tl/Sidebar";

interface TeamLeader {
  name: string;
  code: string;
  email: string;
  role: string;
}

export default function LeadMgmtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<TeamLeader | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("user");
    if (!raw) {
      router.replace("/login");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.role !== "teamleader") {
        router.replace("/login");
        return;
      }
      setUser(parsed);
    } catch {
      router.replace("/login");
    }
  }, [router, pathname]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}


