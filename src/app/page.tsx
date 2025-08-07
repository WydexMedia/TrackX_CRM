"use client";

import Link from "next/link";
import {
  Trophy,
  Phone,
  BarChart,
  FileText,
  PlusCircle,
  User,
  Home,
  LogIn,
} from "lucide-react";

export default function HomePage() {
  const navigationItems = [
    {
      href: "/leaderboard",
      icon: <Trophy className="w-6 h-6 text-[#007aff]" />,
      title: "Leaderboard",
      description: "Top performers",
    },
    {
      href: "/call-leaderboard",
      icon: <Phone className="w-6 h-6 text-[#007aff]" />,
      title: "Call Stats",
      description: "Track call metrics",
    },
    {
      href: "/combined-leaderboard",
      icon: <BarChart className="w-6 h-6 text-[#007aff]" />,
      title: "Overview",
      description: "Combined performance",
    },
    {
      href: "/call-form",
      icon: <FileText className="w-6 h-6 text-[#007aff]" />,
      title: "Log Call",
      description: "Record new activity",
    },
    {
      href: "/form",
      icon: <PlusCircle className="w-6 h-6 text-[#007aff]" />,
      title: "Add Sale",
      description: "Register a new sale",
    },
    {
      href: "/login",
      icon: <User className="w-6 h-6 text-[#007aff]" />,
      title: "Dashboard",
      description: "Your performance",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm py-4 px-6 rounded-b-2xl">
        <h1 className="text-xl font-semibold text-[#1c1c1e] text-center">Sales Portal</h1>
        <p className="text-xs text-center text-[#8e8e93] mt-1">
          Track & manage your performance
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-md p-4 space-y-3">
          <h2 className="text-base font-semibold text-[#1c1c1e]">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            <Link
              href="/form"
              className="w-full flex items-center justify-center py-3 bg-[#007aff] text-white rounded-xl font-medium text-sm hover:bg-[#005ecb] transition"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Add New Sale
            </Link>
            <Link
              href="/call-form"
              className="w-full flex items-center justify-center py-3 bg-[#d1d1d6] text-[#1c1c1e] rounded-xl font-medium text-sm hover:bg-[#c7c7cc] transition"
            >
              <Phone className="w-5 h-5 mr-2" />
              Log Call
            </Link>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-2 gap-4">
          {navigationItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col items-center justify-center text-center hover:shadow-md transition-all"
            >
              <div className="mb-2">{item.icon}</div>
              <h3 className="text-sm font-medium text-[#1c1c1e]">{item.title}</h3>
              <p className="text-xs text-[#8e8e93] mt-1">{item.description}</p>
            </Link>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 shadow-inner sticky bottom-0 w-full z-10">
        <div className="grid grid-cols-3 text-center text-sm text-[#8e8e93]">
          <Link href="/leaderboard" className="p-3 hover:text-[#007aff]">
            <Trophy className="w-5 h-5 mx-auto" />
            <p className="text-xs">Leads</p>
          </Link>
          <Link href="/form" className="p-3 hover:text-[#007aff]">
            <PlusCircle className="w-5 h-5 mx-auto" />
            <p className="text-xs">Add</p>
          </Link>
          <Link href="/login" className="p-3 hover:text-[#007aff]">
            <User className="w-5 h-5 mx-auto" />
            <p className="text-xs">Profile</p>
          </Link>
        </div>
      </nav>
    </div>
  );
}
