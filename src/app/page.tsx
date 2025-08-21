"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Phone,
  BarChart,
  FileText,
  PlusCircle,
  User,
  TrendingUp,
  Target,
  Calendar,
  Bell,
  Search,
  ArrowRight,
  Zap,
  Award,
  Activity
} from "lucide-react";

export default function HomePage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeCard, setActiveCard] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navigationItems = [
    {
      href: "/leaderboard",
      icon: <Trophy className="w-6 h-6" />,
      title: "Leaderboard",
      description: "Top performers",
      gradient: "from-amber-400 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50"
    },
    {
      href: "/call-leaderboard",
      icon: <Phone className="w-6 h-6" />,
      title: "Call Stats",
      description: "Track call metrics",
      gradient: "from-green-400 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50"
    },
    {
      href: "/combined-leaderboard",
      icon: <BarChart className="w-6 h-6" />,
      title: "Analytics",
      description: "Performance overview",
      gradient: "from-purple-400 to-indigo-500",
      bgGradient: "from-purple-50 to-indigo-50"
    },
    {
      href: "/call-form",
      icon: <FileText className="w-6 h-6" />,
      title: "Log Call",
      description: "Record activity",
      gradient: "from-blue-400 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50"
    },
    {
      href: "/form",
      icon: <PlusCircle className="w-6 h-6" />,
      title: "Add Sale",
      description: "Register new sale",
      gradient: "from-pink-400 to-rose-500",
      bgGradient: "from-pink-50 to-rose-50"
    },
    {
      href: "/login",
      icon: <User className="w-6 h-6" />,
      title: "Profile",
      description: "Your dashboard",
      gradient: "from-gray-400 to-slate-500",
      bgGradient: "from-gray-50 to-slate-50"
    },
  ];

  const quickStats = [
    { label: "Today's Sales", value: "12", icon: <TrendingUp className="w-5 h-5" />, color: "text-green-600" },
    { label: "Calls Made", value: "28", icon: <Phone className="w-5 h-5" />, color: "text-blue-600" },
    { label: "Target Progress", value: "78%", icon: <Target className="w-5 h-5" />, color: "text-purple-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-r from-pink-400/10 to-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Sales Portal
              </h1>
              <p className="text-sm text-slate-600">
                {currentTime.toLocaleString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/tenants"
                className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all font-medium text-sm"
              >
                Admin
              </Link>
              <Link
                href="/onboarding"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-sm"
              >
                Get Your CRM
              </Link>
              <button className="p-2 bg-white/50 rounded-xl hover:bg-white/80 transition-all">
                <Bell className="w-5 h-5 text-slate-600" />
              </button>
              <button className="p-2 bg-white/50 rounded-xl hover:bg-white/80 transition-all">
                <Search className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            {quickStats.map((stat, index) => (
              <div key={index} className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-white/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className={stat.color}>
                    {stat.icon}
                  </div>
                </div>
                <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Onboarding CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-xl border border-white/20 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">Ready to Get Your Own CRM?</h2>
              <p className="text-blue-100 mb-4">Get a completely isolated CRM environment for your team</p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold text-slate-800">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/form"
              className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-4 hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="font-semibold">Add Sale</p>
                  <p className="text-xs text-blue-100">Quick entry</p>
                </div>
                <PlusCircle className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
              </div>
            </Link>
            <Link
              href="/call-form"
              className="group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl p-4 hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="font-semibold">Log Call</p>
                  <p className="text-xs text-emerald-100">Track activity</p>
                </div>
                <Phone className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </Link>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-2 gap-4">
          {navigationItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              onMouseEnter={() => setActiveCard(index)}
              onMouseLeave={() => setActiveCard(null)}
              className="group relative overflow-hidden bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 p-6 hover:shadow-2xl transition-all duration-500 hover:scale-105"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.bgGradient} opacity-0 group-hover:opacity-100 transition-all duration-500`}></div>
              
              {/* Content */}
              <div className="relative flex flex-col items-center text-center space-y-3">
                <div className={`p-3 rounded-2xl bg-gradient-to-r ${item.gradient} text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 group-hover:text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 group-hover:text-slate-700 mt-1">
                    {item.description}
                  </p>
                </div>
                <ArrowRight className={`w-4 h-4 text-slate-400 transform transition-all duration-300 ${
                  activeCard === index ? 'translate-x-1 text-slate-600' : ''
                }`} />
              </div>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            </Link>
          ))}
        </div>

        {/* Achievement Card */}
        <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <Award className="w-6 h-6" />
            <h3 className="font-bold text-lg">Today's Achievement</h3>
          </div>
          <p className="text-amber-100 mb-4">You're on fire! 🔥 Keep up the excellent work!</p>
          <div className="bg-white/20 rounded-full h-2 mb-2">
            <div className="bg-white rounded-full h-2 w-3/4 transition-all duration-1000 ease-out"></div>
          </div>
          <p className="text-xs text-amber-100">78% to your daily goal</p>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-white/20 shadow-lg">
        <div className="grid grid-cols-3 text-center">
          <Link 
            href="/leaderboard" 
            className="group p-4 hover:bg-white/50 transition-all duration-300"
          >
            <Trophy className="w-5 h-5 mx-auto mb-1 text-slate-600 group-hover:text-amber-500 group-hover:scale-110 transition-all" />
            <p className="text-xs text-slate-600 group-hover:text-amber-600 font-medium">Leads</p>
          </Link>
          <Link 
            href="/form" 
            className="group p-4 hover:bg-white/50 transition-all duration-300 relative"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-b-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            <PlusCircle className="w-5 h-5 mx-auto mb-1 text-slate-600 group-hover:text-blue-500 group-hover:scale-110 transition-all" />
            <p className="text-xs text-slate-600 group-hover:text-blue-600 font-medium">Add</p>
          </Link>
          <Link 
            href="/login" 
            className="group p-4 hover:bg-white/50 transition-all duration-300"
          >
            <User className="w-5 h-5 mx-auto mb-1 text-slate-600 group-hover:text-purple-500 group-hover:scale-110 transition-all" />
            <p className="text-xs text-slate-600 group-hover:text-purple-600 font-medium">Profile</p>
          </Link>
        </div>
      </nav>
    </div>
  );
}