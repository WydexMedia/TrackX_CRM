"use client";

import { useEffect } from "react";
import Link from "next/link";
import { 
  Trophy, 
  Phone, 
  PlusCircle, 
  BarChart3, 
  Users, 
  Target, 
  Shield, 
  Zap, 
  Activity,
  BarChart,
  LogIn,
  ArrowRight
} from "lucide-react";
import { useTenant } from "@/hooks/useTenant";

export default function TenantHomepage() {
  const { subdomain, loading } = useTenant();

  useEffect(() => {
    console.log('🏢 TenantHomepage mounted');
    return () => {
      console.log('🏢 TenantHomepage unmounted');
    };
  }, []);

  // Main actions for tenants
  const tenantActions = [
    {
      href: "/leaderboard",
      icon: <Trophy className="w-6 h-6" />,
      title: "Leaderboard",
      description: "View team performance rankings",
      gradient: "from-amber-400 to-orange-500"
    },
    {
      href: "/form",
      icon: <PlusCircle className="w-6 h-6" />,
      title: "Add Sale",
      description: "Register new sales and leads",
      gradient: "from-green-400 to-emerald-500"
    },
    {
      href: "/call-leaderboard",
      icon: <Phone className="w-6 h-6" />,
      title: "Call Status",
      description: "Track call metrics and outcomes",
      gradient: "from-blue-400 to-cyan-500"
    },
    {
      href: "/combined-leaderboard",
      icon: <BarChart className="w-6 h-6" />,
      title: "Analytics",
      description: "Performance insights and reports",
      gradient: "from-purple-400 to-indigo-500"
    },
    {
      href: "/dashboard",
      icon: <Activity className="w-6 h-6" />,
      title: "Dashboard",
      description: "Overview of your sales activities",
      gradient: "from-pink-400 to-rose-500"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Static Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-r from-pink-400/10 to-orange-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Tenant Info */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">TX</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  TrackX
                </h1>
                <p className="text-xs text-slate-500 -mt-1 font-medium">
                  {subdomain ? `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Workspace` : 'Sales CRM Platform'}
                </p>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              {/* Login Button */}
              <Link
                href="/login"
                className="group relative px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Login
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="hidden lg:flex items-center justify-center mt-2 text-xs text-slate-500">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1">

        {/* Hero Section */}
        <section className="relative py-24 px-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
          {/* Light Background Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-purple-100/50 to-pink-100/50"></div>
          </div>
          
          {/* Light Floating Orbs */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-200/40 to-indigo-200/40 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-purple-200/40 to-pink-200/40 rounded-full blur-3xl"></div>
          
          <div className="relative z-20 max-w-7xl mx-auto text-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-2 text-sm font-medium">
                <Zap className="w-4 h-4" />
                Welcome to {subdomain ? `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}` : 'Your'} Workspace
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Your Sales Performance{" "}
                <span className="text-blue-600">Dashboard</span>
              </h1>
              
              <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
                Access your team's performance metrics, track leads, and manage sales activities 
                with our comprehensive CRM platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-2 justify-center shadow-lg hover:shadow-xl"
                >
                  <LogIn className="w-5 h-5" />
                  Access Your Dashboard
                </Link>
                <Link
                  href="/leaderboard"
                  className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors"
                >
                  View Leaderboard
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Main Actions Grid */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Quick Access to Your Tools</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Everything you need to manage your sales performance in one place
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tenantActions.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className={`p-4 rounded-2xl bg-gradient-to-r ${item.gradient} text-white transition-transform duration-300`}>
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xl mb-3">
                        {item.title}
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-blue-600 font-medium group-hover:gap-3 transition-all duration-300">
                      <span>Access Now</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Why TrackX Works for Your Team</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Built specifically for sales teams to improve performance and close more deals
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Lead Management</h3>
                <p className="text-slate-600">Track every lead from first contact to closure with automated workflows and status updates</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Performance Analytics</h3>
                <p className="text-slate-600">Real-time insights into team performance, conversion rates, and sales metrics</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Team Collaboration</h3>
                <p className="text-slate-600">Foster teamwork with shared dashboards, leaderboards, and performance insights</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl font-bold mb-6">Ready to boost your sales performance?</h2>
            <p className="text-xl mb-8 opacity-90">
              Login to access your dashboard and start tracking your team's success
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center gap-2 justify-center"
              >
                <LogIn className="w-5 h-5" />
                Login Now
              </Link>
              <Link
                href="/leaderboard"
                className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-12 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TX</span>
              </div>
              <span className="text-xl font-bold">TrackX</span>
            </div>
            <p className="text-slate-400 text-sm mb-6">
              Your sales performance platform
            </p>
            <div className="border-t border-slate-800 pt-6">
              <p className="text-slate-400 text-sm">
                2024 TrackX. All rights reserved. From the house of{" "}
                <a 
                  href="https://wydexmedia.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  wydex
                </a>
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-white/20 shadow-lg">
        <div className="grid grid-cols-3 text-center">
          <Link 
            href="/leaderboard" 
            className="group p-4 hover:bg-white/50 transition-all duration-300"
          >
            <Trophy className="w-5 h-5 mx-auto mb-1 text-slate-600 group-hover:text-amber-500 group-hover:scale-110 transition-all" />
            <p className="text-xs text-slate-600 group-hover:text-amber-600 font-medium">Leaderboard</p>
          </Link>
          <Link 
            href="/form" 
            className="group p-4 hover:bg-white/50 transition-all duration-300 relative"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-b-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            <PlusCircle className="w-5 h-5 mx-auto mb-1 text-slate-600 group-hover:text-blue-500 group-hover:scale-110 transition-all" />
            <p className="text-xs text-slate-600 group-hover:text-blue-600 font-medium">Add Sale</p>
          </Link>
          <Link 
            href="/login" 
            className="group p-4 hover:bg-white/50 transition-all duration-300"
          >
            <LogIn className="w-5 h-5 mx-auto mb-1 text-slate-600 group-hover:text-green-500 group-hover:scale-110 transition-all" />
            <p className="text-xs text-slate-600 group-hover:text-green-600 font-medium">Login</p>
          </Link>
        </div>
      </nav>
    </div>
  );
}
