"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamic import for tenant homepage - moved outside component to prevent recreation
const TenantHomepage = dynamic(() => import('./tenant-homepage'), {
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Loading tenant workspace...</p>
      </div>
    </div>
  ),
  ssr: false
});
import { 
  Trophy, 
  Phone, 
  Plus, 
  BarChart3, 
  PhoneCall, 
  User, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Rocket, 
  Users, 
  Target, 
  TrendingUp, 
  Shield, 
  Zap, 
  Star, 
  Quote, 
  Activity,
  X,
  Check,
  Smartphone,
  DollarSign,
  Mail,
  MapPin,
  ExternalLink,
  Heart,
  PlusCircle,
  BarChart,
  FileText,
  Globe,
  Bell,
  Search,
  CheckCircle
} from "lucide-react";
import TenantLogo from "@/components/TenantLogo";
import { useTenant } from "@/hooks/useTenant";

export default function HomePage() {
  // This is the main marketing/landing page for wydex.co (main domain)
  // For subdomains like proskill.wydex.co, it will render TenantHomepage instead
  const { subdomain, loading } = useTenant();
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [isMainDomain, setIsMainDomain] = useState(false);



  // Detect if we're on the main domain or a subdomain
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      
      // Handle IPs
      if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        setIsMainDomain(true);
        return;
      }
      
      // Handle localhost and *.localhost during development
      if (hostname === "localhost") {
        setIsMainDomain(true);
        return;
      }
      if (hostname.endsWith(".localhost")) {
        const left = hostname.slice(0, -".localhost".length);
        const label = left.split(".")[0];
        setIsMainDomain(!label);
        return;
      }
      
      // Check if we have a subdomain (more than 2 parts, excluding www)
      const parts = hostname.split(".");
      const hasSubdomain = parts.length > 2 && parts[0] !== 'www';
      setIsMainDomain(!hasSubdomain);
    }
  }, []);

  // If we have a subdomain, show tenant homepage instead
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

  // If we have a subdomain, redirect to tenant homepage
  if (subdomain) {
    return <TenantHomepage />;
  }

  // All main actions in a single row (5 buttons)
  const mainActions = [
    {
      href: "/leaderboard",
      icon: <Trophy className="w-5 h-5" />,
      title: "Leaderboard",
      description: "Top performers",
      gradient: "from-amber-400 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50",
      stats: "View rankings"
    },
    {
      href: "/call-leaderboard",
      icon: <Phone className="w-5 h-5" />,
      title: "Call Status",
      description: "Track call metrics",
      gradient: "from-green-400 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
      stats: "Monitor calls"
    },
    {
      href: "/form",
      icon: <PlusCircle className="w-5 h-5" />,
      title: "Add Sale",
      description: "Register new sale",
      gradient: "from-pink-400 to-rose-500",
      bgGradient: "from-pink-50 to-rose-50",
      stats: "Quick entry"
    },
    {
      href: "/combined-leaderboard",
      icon: <BarChart className="w-5 h-5" />,
      title: "Analytics",
      description: "Performance insights",
      gradient: "from-purple-400 to-indigo-500",
      bgGradient: "from-purple-50 to-indigo-50",
      stats: "View reports"
    },
    {
      href: "/call-form",
      icon: <FileText className="w-5 h-5" />,
      title: "Log Call",
      description: "Record activity",
      gradient: "from-blue-400 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      stats: "Track interactions"
    },
  ];

  // CRM Features for display
  const crmFeatures = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Multi-Tenant Architecture",
      description: "Secure, isolated workspaces for each organization with subdomain-based routing",
      color: "text-blue-600"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Lead Management",
      description: "Complete lead lifecycle tracking from NEW to PAYMENT_DONE with automated workflows",
      color: "text-green-600"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Advanced Analytics",
      description: "Real-time performance dashboards with team metrics and conversion tracking",
      color: "text-purple-600"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Role-Based Access",
      description: "Granular permissions for Sales, Team Leaders, and CEO roles with secure authentication",
      color: "text-orange-600"
    }
  ];

  // Benefits section
  const benefits = [
    {
      icon: <Rocket className="w-8 h-8" />,
      title: "Boost Sales Performance",
      description: "Increase your team's productivity by 40% with streamlined workflows and automated follow-ups",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Hit Your Targets",
      description: "Track progress in real-time and get insights to consistently exceed your sales goals",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Team Collaboration",
      description: "Foster better teamwork with shared dashboards, team leaderboards, and performance insights",
      gradient: "from-purple-500 to-pink-500"
    }
  ];

  // Testimonials
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Sales Manager",
      company: "TechCorp Inc.",
      content: "TrackX has revolutionized our sales process. We've seen a 45% increase in conversions since implementing it.",
      rating: 5,
      avatar: "SJ"
    },
    {
      name: "Michael Chen",
      role: "Team Leader",
      company: "Growth Solutions",
      content: "The analytics and team management features are incredible. Best CRM we've ever used!",
      rating: 5,
      avatar: "MC"
    },
    {
      name: "Emily Rodriguez",
      role: "CEO",
      company: "StartupX",
      content: "TrackX scales perfectly with our business. The multi-tenant architecture is exactly what we needed.",
      rating: 5,
      avatar: "ER"
    }
  ];

  // Statistics
  const stats = [
    { number: "10K+", label: "Active Users", icon: <Users className="w-6 h-6" /> },
    { number: "500+", label: "Companies", icon: <Globe className="w-6 h-6" /> },
    { number: "99.9%", label: "Uptime", icon: <Shield className="w-6 h-6" /> },
    { number: "24/7", label: "Support", icon: <Clock className="w-6 h-6" /> }
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Animated Background Elements - Behind main content */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-r from-pink-400/10 to-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">TX</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  TrackX
                </h1>
                <p className="text-xs text-slate-500 -mt-1 font-medium">Sales CRM Platform</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/leaderboard" className="relative group text-slate-700 hover:text-blue-600 font-medium transition-all duration-300">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link href="/analytics" className="relative group text-slate-700 hover:text-blue-600 font-medium transition-all duration-300">
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link href="/call-status" className="relative group text-slate-700 hover:text-blue-600 font-medium transition-all duration-300">
                Resources
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link href="/form" className="relative group text-slate-700 hover:text-blue-600 font-medium transition-all duration-300">
                Contact
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              {/* Demo Button */}
              <Link
                href="/signup"
                className="hidden sm:block px-4 py-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                Get Demo
              </Link>
              
              {/* Get CRM Button - Only show on main domain */}
              {isMainDomain && (
                <Link
                  href="/onboarding"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors"
                >
                  <Rocket className="w-4 h-4" />
                  Get CRM
                </Link>
              )}
              
              {/* Signup Button */}
              <Link
                href="/signup"
                className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-semibold shadow-lg hover:bg-green-700 transition-all duration-300 flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Sign Up
              </Link>
              
              {/* Login Button with Enhanced Design */}
              <Link
                href="/login"
                className="group relative px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Login
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              
              {/* Mobile Menu Button */}
              <button className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors group">
                <div className="w-5 h-5 flex flex-col justify-between">
                  <span className="w-full h-0.5 bg-slate-600 group-hover:bg-blue-600 transition-colors"></span>
                  <span className="w-full h-0.5 bg-slate-600 group-hover:bg-blue-600 transition-colors"></span>
                  <span className="w-full h-0.5 bg-slate-600 group-hover:bg-blue-600 transition-colors"></span>
                </div>
              </button>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="hidden lg:flex items-center justify-center mt-2 text-xs text-slate-500">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>All systems operational</span>
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
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 20 0 L 0 0 0 20' fill='none' stroke='%234F46E5' stroke-width='0.5' opacity='0.1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px'
            }}></div>
          </div>
          
          {/* Light Floating Orbs */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-200/40 to-indigo-200/40 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-purple-200/40 to-pink-200/40 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-200/30 to-purple-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          
          {/* Light Geometric Elements */}
          <div className="absolute top-32 right-32 w-24 h-24 border border-blue-300/40 rounded-xl rotate-45 animate-spin" style={{animationDuration: '20s'}}></div>
          <div className="absolute bottom-40 left-40 w-16 h-16 bg-gradient-to-r from-pink-300/50 to-purple-300/50 rounded-full animate-bounce" style={{animationDuration: '4s'}}></div>
          <div className="absolute top-1/4 right-1/3 w-8 h-8 bg-blue-300/60 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-1/3 left-1/4 w-12 h-12 border-2 border-purple-300/50 rounded-lg rotate-12 animate-pulse" style={{animationDelay: '2s'}}></div>
          
          {/* Light Particle Effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400/70 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
            <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400/70 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
            <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-pink-400/70 rounded-full animate-ping" style={{animationDelay: '2.5s'}}></div>
            <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-indigo-400/70 rounded-full animate-ping" style={{animationDelay: '3s'}}></div>
          </div>
          <div className="relative z-20 max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="relative z-30 space-y-8">
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-2 text-sm font-medium">
                  <Zap className="w-4 h-4" />
                  Sales Execution CRM + Marketing Automation
                </div>
                
                <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                  A new way to run{" "}
                  <span className="text-blue-600">high velocity sales</span> and operations
                </h1>
                
                <p className="text-xl text-slate-600 leading-relaxed">
                  Track every lead from allocation to closure with real-time updates. 
                  Get higher efficiency out of your sales teams with automated workflows 
                  and intelligent lead management.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/signup"
                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center gap-2 justify-center shadow-lg hover:shadow-xl"
                  >
                    <Rocket className="w-5 h-5" />
                    Get Started
                  </Link>
                  <Link
                    href="/form"
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-2 justify-center shadow-lg hover:shadow-xl"
                  >
                    <Rocket className="w-5 h-5" />
                    Get a Demo
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors"
                  >
                    Start 14-day free trial
                  </Link>
                </div>
                
                <div className="text-sm text-slate-500">
                  No Credit Card Required
                </div>
              </div>
              
              {/* Right Content - Stats */}
              <div className="relative z-30 grid grid-cols-2 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        {stat.icon}
                      </div>
                      <div className="text-sm text-slate-600">{stat.label}</div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{stat.number}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Value Proposition */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Convert More Leads With Less Manual Efforts</h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto mb-16">
              TrackX captures leads instantly from websites, ads, marketplaces, and other key sources, 
              so your team can connect while the lead is still interested.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Instant Lead Capture</h3>
                <p className="text-slate-600">Capture leads from websites, ads, marketplaces, CSV uploads, and other key sources automatically</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Auto Lead Allocation</h3>
                <p className="text-slate-600">New leads are auto-allocated to your sales reps based on source, region, or custom rules</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Real-Time Tracking</h3>
                <p className="text-slate-600">Track every update, follow-up, and status change in real time for complete pipeline visibility</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Actions - 5 Buttons in Single Row */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">The Best Features for Managing Leads and Closing Deals</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Lead Management Made Simple
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {mainActions.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  onMouseEnter={() => setActiveCard(index)}
                  onMouseLeave={() => setActiveCard(null)}
                  className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${item.gradient} text-white`}>
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-3">
                        {item.description}
                      </p>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        {item.stats}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-6 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Why Choose TrackX?</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Join thousands of successful sales teams who trust TrackX to drive their growth
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="group text-center">
                  <div className={`inline-flex p-6 rounded-3xl bg-gradient-to-r ${benefit.gradient} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    {benefit.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{benefit.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Without vs With TrackX Section */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Goodbye guesswork, hello sales efficiency</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Transform sales across all channels. Never miss a sales opportunity.
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Without TrackX */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-red-600 mb-8">Without TrackX</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <X className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-slate-700">Salespeople are less productive because they are unsure what to do next.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <X className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-slate-700">Salespeople struggle to score leads and pursue best-fit prospects.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <X className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-slate-700">Higher turnaround times decrease engagement and threaten sales.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <X className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-slate-700">Disconnected digital customer onboarding processes cause high drop-off rates.</p>
                  </div>
                </div>
              </div>
              
              {/* With TrackX */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-green-600 mb-8">With TrackX</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-slate-700">Automated workflows guide salespeople through optimized sales processes.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-slate-700">AI-powered lead scoring helps prioritize high-value prospects automatically.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-slate-700">Real-time notifications ensure instant follow-ups and faster response times.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-slate-700">Seamless digital onboarding with automated status tracking reduces drop-offs.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CRM Features Section */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Powerful Features</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Everything you need to manage leads, track performance, and grow your business
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {crmFeatures.map((feature, index) => (
                <div key={index} className="flex gap-6 p-8 rounded-3xl bg-gradient-to-br from-white to-gray-50 border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <div className={`p-4 rounded-2xl bg-white shadow-lg ${feature.color} flex-shrink-0`}>
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 px-6 bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">What Our Customers Say</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Don't just take our word for it - hear from sales teams who've transformed their results with TrackX
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  
                  <Quote className="w-8 h-8 text-blue-200 mb-4" />
                  
                  <p className="text-slate-700 mb-6 leading-relaxed italic">
                    "{testimonial.content}"
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{testimonial.name}</div>
                      <div className="text-sm text-slate-600">{testimonial.role} at {testimonial.company}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Choose the plan that fits your team size and grow as you scale
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Starter Plan */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-300">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Starter</h3>
                <p className="text-slate-600 mb-6">Perfect for small teams</p>
                <div className="text-4xl font-bold text-slate-900 mb-6">
                  $29<span className="text-lg text-slate-600">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-slate-700">Up to 5 users</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-slate-700">Basic analytics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-slate-700">Lead management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-slate-700">Email support</span>
                  </li>
                </ul>
                <Link href="/signup" className="w-full block text-center py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">
                  Get Started
                </Link>
              </div>
              
              {/* Professional Plan */}
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-8 text-white relative transform scale-105 shadow-2xl">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold mb-2">Professional</h3>
                <p className="text-blue-100 mb-6">Best for growing teams</p>
                <div className="text-4xl font-bold mb-6">
                  $79<span className="text-lg text-blue-100">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Up to 25 users</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Team management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Link href="/form" className="w-full block text-center py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors">
                  Start Free Trial
                </Link>
              </div>
              
              {/* Enterprise Plan */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-300">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
                <p className="text-slate-600 mb-6">For large organizations</p>
                <div className="text-4xl font-bold text-slate-900 mb-6">
                  Custom<span className="text-lg text-slate-600"> pricing</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-slate-700">Unlimited users</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-slate-700">Custom integrations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-slate-700">Dedicated support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-slate-700">SLA guarantee</span>
                  </li>
                </ul>
                <Link href="/login" className="w-full block text-center py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Final Call to Action */}
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl font-bold mb-6">Want to see TrackX in action?</h2>
            <p className="text-xl mb-8 opacity-90">
              Track, Assign, and Close Leads from Anywhere
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/form"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center gap-2 justify-center"
              >
                <Rocket className="w-5 h-5" />
                Book a Demo
              </Link>
              <Link
                href="/signup"
                className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors"
              >
                Start 14-day free trial
              </Link>
            </div>
            <p className="text-sm mt-4 opacity-75">No Credit Card Required</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              {/* Company Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">TX</span>
                  </div>
                  <span className="text-xl font-bold">TrackX</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  The most powerful CRM platform designed for modern sales teams. 
                  Boost productivity and exceed your targets.
                </p>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className="font-semibold mb-4">Products</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link href="/leaderboard" className="hover:text-white transition-colors">Sales CRM</Link></li>
                  <li><Link href="/call-status" className="hover:text-white transition-colors">Call Management</Link></li>
                  <li><Link href="/analytics" className="hover:text-white transition-colors">Sales Analytics</Link></li>
                  <li><Link href="/form" className="hover:text-white transition-colors">Lead Management</Link></li>
                  <li><Link href="/log-call" className="hover:text-white transition-colors">Activity Tracking</Link></li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="font-semibold mb-4">Resources</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-slate-400 text-sm">
                2024 TrackX. All rights reserved.
              </p>
              <p className="text-slate-400 text-sm mt-2">
                From the house of{" "}
                <a 
                  href="https://wydexmedia.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors "
                >
                  wydex
                </a>
              </p>

              <div className="flex gap-6 text-sm text-slate-400 mt-4 md:mt-0">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Cookies</a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-white/20 shadow-lg">
        <div className="grid grid-cols-2 text-center">
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
        </div>
      </nav>
    </div>
  );
}