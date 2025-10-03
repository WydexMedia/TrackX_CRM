"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Mail,
  Globe,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ShieldCheck,
  Rocket,
  Users,
  Workflow,
  LayoutDashboard,
  Settings,
  PhoneCall,
  Webhook,
  Fingerprint,
  PlayCircle,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// -----------------------------
// DYNAMIC IMPORT FOR TENANT HOMEPAGE
// -----------------------------
const TenantHomepage = dynamic(() => import("./tenant-homepage"), {
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Loading tenant workspace...</p>
      </div>
    </div>
  ),
  ssr: false,
});

// -----------------------------
// OPTIONAL: USE TENANT HOOK (stub)
// Replace with your real implementation that reads subdomain from hostname or middleware
// -----------------------------
function useTenant() {
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const hostname = window.location.hostname.toLowerCase();
      
    // If IPv4 or localhost → treat as main domain
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname === "localhost") {
      setSubdomain(null);
      setLoading(false);
        return;
      }
      
    // *.localhost during dev
      if (hostname.endsWith(".localhost")) {
        const left = hostname.slice(0, -".localhost".length);
        const label = left.split(".")[0];
      setSubdomain(label || null);
      setLoading(false);
        return;
      }
      
    // Production domains: thetrackx.com, *.thetrackx.com
      const parts = hostname.split(".");
    const hasSub = parts.length > 2 && parts[0] !== "www";
    setSubdomain(hasSub ? parts[0] : null);
    setLoading(false);
  }, []);

  return { subdomain, loading };
}

// -----------------------------
// SIMPLE TENANT LOGO (placeholder) — replace with your real component if you have one
// -----------------------------
function TenantLogo({ name = "Tenant" }: { name?: string }) {
    return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg grid place-items-center">
        <span className="text-white text-sm font-bold">TX</span>
        </div>
      <span className="font-semibold text-slate-900">{name}</span>
      </div>
    );
  }

// -----------------------------
// ANIMATED DEMO CHART (SVG)
// -----------------------------
function AnimatedChart() {
  return (
    <div className="w-full h-56 rounded-xl bg-white/80 backdrop-blur border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-700">
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">Lead Analytics</span>
      </div>
        <div className="text-xs text-slate-500">Last 30 days</div>
                </div>
      <div className="relative h-36">
        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-2">
          {[18, 26, 20, 32, 28, 40, 36, 52, 46, 60, 72, 68].map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 bg-gradient-to-t from-indigo-200 to-indigo-500/80 rounded"
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 100, damping: 18 }}
            />
          ))}
              </div>
        {/* Line */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <motion.path
            d="M0,70 C10,68 20,62 30,58 C40,55 50,50 60,44 C70,38 80,30 90,26 L100,22"
            fill="none"
            stroke="currentColor"
            className="text-indigo-700/80"
            strokeWidth="1.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
          <div className="text-slate-500">New Leads</div>
          <div className="font-semibold text-slate-900">1,221</div>
              </div>
        <div>
          <div className="text-slate-500">CPL</div>
          <div className="font-semibold text-slate-900">₹4.85</div>
            </div>
              <div>
          <div className="text-slate-500">Conversions</div>
          <div className="font-semibold text-slate-900">312</div>
                </div>
            </div>
          </div>
  );
}

// -----------------------------
// ANIMATED APP SCREEN MOCK
// -----------------------------
function AppScreens() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="rounded-2xl border bg-white shadow-md p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-slate-700">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-semibold">Pipeline Overview</span>
            </div>
          <span className="text-xs text-slate-500">Today</span>
          </div>
        <div className="grid grid-cols-3 gap-3">
          {["New", "Qualified", "Won"].map((col, i) => (
            <div key={col} className="rounded-xl border p-3">
              <div className="text-xs text-slate-500">{col}</div>
              <div className="text-2xl font-bold">{[56, 34, 18][i]}</div>
              <div className="mt-2 h-1.5 rounded bg-slate-100">
                <div className="h-1.5 rounded bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${[68, 42, 88][i]}%` }} />
        </div>
          </div>
          ))}
          </div>
        <div className="mt-4">
          <AnimatedChart />
                </div>
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="rounded-2xl border bg-white shadow-md p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-slate-700">
            <Workflow className="w-5 h-5" />
            <span className="font-semibold">Automations</span>
                </div>
          <span className="text-xs text-slate-500">Active: 7</span>
                </div>
        <ul className="space-y-3">
          {[
            { t: "Round-robin Lead Assignment", i: CheckCircle2 },
            { t: "Auto WhatsApp on New Lead", i: Bot },
            { t: "SLA Breach Alerts", i: ShieldCheck },
            { t: "Webhook to LMS", i: Webhook },
          ].map(({ t, i: Icon }, idx) => (
            <li key={idx} className="flex items-center gap-3 p-3 rounded-xl border">
              <Icon className="w-5 h-5 text-indigo-600" />
              <span className="text-slate-700">{t}</span>
              <span className="ml-auto text-xs text-slate-500">Running</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 p-4 border">
          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <Rocket className="w-4 h-4" /> Boost conversions by 27% with Playbooks
              </div>
          <p className="text-sm text-slate-600 mt-1">Drag‑and‑drop sequences for calls, WhatsApp, and follow‑ups.</p>
            </div>
      </motion.div>
          </div>
  );
}

// -----------------------------
// NAVBAR
// -----------------------------
function Navbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Link href="#" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg grid place-items-center">
              <span className="text-white font-bold text-lg">TX</span>
                </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">TrackX</h1>
              <p className="text-[10px] leading-none text-slate-500 -mt-0.5">Built for Institutes & Online Trainers</p>
              </div>
                  </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">Features</Link>
            <Link href="#solutions" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">Solutions</Link>
            <Link href="#pricing" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">Pricing</Link>
            <Link href="#faq" className="text-slate-700 hover:text-blue-600 font-medium transition-colors">FAQ</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-3 py-2 text-slate-700 font-medium hover:text-blue-600 transition-colors">Login</Link>
            <Link href="/signup" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
            <button onClick={onOpenMobile} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
                </div>
              </div>
              </div>
    </header>
  );
}

// -----------------------------
// FOOTER
// -----------------------------
function Footer() {
  return (
    <footer className="bg-slate-950 text-white py-16 px-6 mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg grid place-items-center">
                <span className="text-white font-bold text-sm">TX</span>
                </div>
              <span className="text-xl font-bold">TrackX</span>
              </div>
            <p className="text-sm text-slate-400">The CRM built for lead‑heavy businesses — training institutes, academies, and modern sales teams.</p>
            </div>

          <div>
            <h3 className="font-semibold mb-4">Products</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="#features" className="hover:text-white transition-colors">Lead Management</Link></li>
              <li><Link href="#features" className="hover:text-white transition-colors">Automations</Link></li>
              <li><Link href="#features" className="hover:text-white transition-colors">Task & SLA</Link></li>
              <li><Link href="#features" className="hover:text-white transition-colors">Integrations</Link></li>
            </ul>
            </div>
            
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="#" className="hover:text-white transition-colors">Support</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
                    </div>
              
                    <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /><span>support@thetrackx.com</span></div>
              <div className="flex items-center gap-2"><Globe className="w-4 h-4" /><span>www.thetrackx.com</span></div>
                    </div>
                  </div>
            </div>
        <div className="border-t border-slate-800 pt-8 text-center">
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} All rights reserved. thetrackx</p>
          </div>
            </div>
    </footer>
  );
}

// -----------------------------
// MOBILE MENU (simple)
// -----------------------------
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="md:hidden fixed inset-0 z-50 bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <TenantLogo name="TrackX" />
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                  </div>
      <nav className="p-6 space-y-4">
        {[
          ["Features", "#features"],
          ["Solutions", "#solutions"],
          ["Pricing", "#pricing"],
          ["FAQ", "#faq"],
        ].map(([label, href]) => (
          <Link key={label} className="block text-lg font-medium text-slate-800" href={href} onClick={onClose}>
            {label}
                </Link>
              ))}
        <div className="pt-4 flex gap-3">
          <Link href="/login" className="px-4 py-2 rounded-lg border">Login</Link>
          <Link href="/signup" className="px-4 py-2 rounded-lg bg-blue-600 text-white">Get Started</Link>
            </div>
      </nav>
          </div>
  );
}

// -----------------------------
// HERO
// -----------------------------
function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-200 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-violet-200 rounded-full blur-3xl opacity-50"></div>

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight"
            >
              Grow your Institute faster with <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">TrackX</span>
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-5 text-xl text-slate-600"
            >
              Convert more leads, automate follow‑ups, and see what’s working — all in one beautiful dashboard built for academies & online trainers.
            </motion.p>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-8 flex flex-col sm:flex-row gap-3"
            >
              <Link href="/signup" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <a 
                href="https://wa.me/919633180779?text=Hi! I'd like to see a demo of TrackX CRM for my institute." 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white border rounded-xl font-semibold hover:bg-slate-50 inline-flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4" /> Watch Demo
              </a>
            </motion.div>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {["Leads", "Calls", "WhatsApp", "Tasks"].map((t) => (
                <div key={t} className="rounded-xl border bg-white p-3 text-center">
                  <div className="text-2xl font-bold">{t === "Leads" ? "50k+" : t === "Calls" ? "1.2M" : t === "WhatsApp" ? "3.4M" : "24k"}</div>
                  <div className="text-slate-500">{t} tracked</div>
                    </div>
              ))}
                  </div>
                    </div>
          <div className="relative">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <AppScreens />
            </motion.div>
                  </div>
                    </div>
                  </div>
        </section>
  );
}

// -----------------------------
// FEATURES
// -----------------------------
function Features() {
  const items = [
    {
      icon: PhoneCall,
      title: "Call & WhatsApp Timeline",
      desc: "Auto-log calls, recordings, and WhatsApp chats against every lead card.",
    },
    {
      icon: Workflow,
      title: "Automations & Playbooks",
      desc: "Round-robin, SLA escalations, and drip sequences to never miss a follow-up.",
    },
    {
      icon: ShieldCheck,
      title: "Secure & Compliant",
      desc: "AWS S3 storage, field-level permissions, and audit trails across modules.",
    },
    {
      icon: Settings,
      title: "Custom Fields & Views",
      desc: "Design your lead layout, lists, and filters exactly as your team works.",
    },
    {
      icon: Webhook,
      title: "Integrations",
      desc: "Gallabox, Exotel/Twilio, Meta Lead Ads, Google Sheets, and Webhooks.",
    },
    {
      icon: Users, // or BarChart3 / Trophy / Target icon depending on what you prefer
      title: "Sales Performance & Leaderboard",
      desc: "Track salesperson targets, monitor conversions, and gamify performance with leaderboards for better motivation and growth.",
    },
  ];
  

  return (
    <section id="features" className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-slate-900">Everything you need to scale</h2>
          <p className="text-slate-600 mt-2">From first touch to closed won — TrackX has your entire journey covered.</p>
                    </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map(({ icon: Icon, title, desc }) => (
            <motion.div key={title} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="rounded-2xl border p-6 bg-white shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-700 grid place-items-center mb-4">
                <Icon className="w-5 h-5" />
                  </div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="text-slate-600 mt-2 text-sm leading-6">{desc}</p>
            </motion.div>
              ))}
            </div>
          </div>
        </section>
  );
}


// -----------------------------
// WHY CHOOSE TRACKX
// -----------------------------
function WhyChooseTrackX() {
  const benefits = [
    {
      icon: Rocket,
      title: "Boost Sales Performance",
      description: "Increase your team's productivity by 40% with streamlined workflows and automated follow-ups",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: BarChart3,
      title: "Hit Your Targets",
      description: "Track progress in real-time and get insights to consistently exceed your sales goals",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Foster better teamwork with shared dashboards, team leaderboards, and performance insights",
      gradient: "from-purple-500 to-pink-500"
    }
  ];

  return (
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
            <motion.div 
              key={index} 
              className="group text-center"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className={`inline-flex p-6 rounded-3xl bg-gradient-to-r ${benefit.gradient} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <benefit.icon className="w-8 h-8" />
                  </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{benefit.title}</h3>
              <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
            </motion.div>
              ))}
            </div>
          </div>
        </section>
  );
}

// -----------------------------
// PRICING
// -----------------------------
function Pricing() {
  const tiers = [
    {
      name: "Starter",
      price: "₹0",
      period: "/forever",
      features: ["Up to 3 users", "1,000 leads", "Basic automations", "Community support"],
      cta: "Start Free",
    },
    {
      name: "Growth",
      price: "₹799",
      period: "/user/mo",
      features: ["Unlimited leads", "Advanced automations", "SLA & Playbooks", "Priority support"],
      highlighted: true,
      cta: "Start Trial",
    },
    {
      name: "Scale",
      price: "Let's talk",
      period: "",
      features: ["Custom limits", "SAML/SSO", "Dedicated success", "On‑prem/Hybrid"],
      cta: "Contact Sales",
    },
  ];

  return (
    <section id="pricing" className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-slate-900">Fair, simple pricing</h2>
          <p className="text-slate-600 mt-2">Start free. Upgrade when you scale.</p>
            </div>
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <div key={t.name} className={`rounded-2xl border p-6 bg-white shadow-sm ${t.highlighted ? "ring-2 ring-indigo-600" : ""}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{t.name}</h3>
                {t.highlighted && (
                  <span className="text-xs px-2 py-1 rounded bg-indigo-600 text-white">Popular</span>
                )}
                </div>
              <div className="mt-4 flex items-end gap-1">
                <div className="text-4xl font-extrabold">{t.price}</div>
                <div className="text-slate-500">{t.period}</div>
              </div>
              <ul className="mt-4 space-y-2 text-slate-600 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" /> <span>{f}</span></li>
                ))}
                </ul>
              {t.name === "Scale" ? (
                <a 
                  href="https://wa.me/919633180779?text=Hi! I'm interested in TrackX Scale plan for my business. Can we discuss pricing and features?" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center w-full px-4 py-2 rounded-lg border bg-white hover:bg-slate-50 font-semibold"
                >
                  {t.cta}
                </a>
              ) : (
                <Link href="/signup" className="mt-6 inline-flex items-center justify-center w-full px-4 py-2 rounded-lg border bg-white hover:bg-slate-50 font-semibold">
                  {t.cta}
                </Link>
              )}
              </div>
          ))}
                </div>
                </div>
        </section>
  );
}

// -----------------------------
// FAQ
// -----------------------------
function FAQ() {
  const faqs = [
    {
      q: "Can I import leads from Excel/Sheets?",
      a: "Yes. You can bulk import leads via CSV or directly connect Google Sheets. New rows in Sheets can automatically sync into TrackX.",
    },
    {
      q: "Do you support WhatsApp & call recordings?",
      a: "Absolutely. Integrate Gallabox, Exotel, or Twilio to log WhatsApp chats and call recordings automatically. Mobile recordings can also be uploaded to S3 and attached to the lead timeline.",
    },
    {
      q: "Can I track salesperson targets and performance?",
      a: "Yes. TrackX lets you set individual sales targets, monitor conversions, and view performance in real-time dashboards. Leaderboards motivate your team by showing top performers.",
    },
    {
      q: "Is my data secure?",
      a: "Yes. All data is encrypted in transit and at rest. TrackX uses AWS S3 storage, strict role-based permissions, and audit logs to ensure compliance and security.",
    },
  ];
  
  return (
    <section id="faq" className="py-20 px-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-14">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map(({ q, a }, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="rounded-xl border bg-white mb-4">
              <AccordionTrigger className="px-6 py-4 text-left font-semibold text-slate-800 hover:no-underline">
                {q}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-slate-600">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

// -----------------------------
// FINAL CTA
// -----------------------------
function FinalCTA() {
  return (
    <section className="py-20 px-6 bg-gradient-to-r from-indigo-600 to-violet-600">
      <div className="max-w-5xl mx-auto text-center text-white">
        <h2 className="text-4xl font-bold mb-4">Start converting today</h2>
        <p className="text-lg opacity-90">Bespoke CRM to capture, qualify, and close — with beautiful analytics your team will love.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="px-6 py-3 bg-white text-indigo-700 rounded-xl font-semibold hover:bg-slate-100">Get Started</Link>
          <a 
            href="https://wa.me/919633180779?text=Hi! I'd like to discuss TrackX CRM pricing and features for my business." 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 border border-white/30 rounded-xl font-semibold hover:bg-white/10"
          >
            Talk to Sales
          </a>
            </div>
          </div>
        </section>
  );
}

// -----------------------------
// MAIN PAGE (MARKETING) WITH TENANT REDIRECT/RENDER LOGIC
// -----------------------------
export default function HomePage() {
  const router = useRouter();
  const { subdomain, loading } = useTenant();
  const [mobileOpen, setMobileOpen] = useState(false);

  // If we have a subdomain, render the tenant homepage instead of the marketing site
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 grid place-items-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
              </div>
              </div>
    );
  }

  if (subdomain) {
    // OPTION A (render):
    return <TenantHomepage />;

    // OPTION B (redirect): uncomment to route to /tenant
    // router.replace(`/tenant`);
    // return null;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar onOpenMobile={() => setMobileOpen(true)} />
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="flex-1">
        <Hero />
        <Features />
        <WhyChooseTrackX />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
