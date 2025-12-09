"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger,
  TooltipProvider 
} from "@/components/ui/tooltip";
import { Info, CheckCircle2 } from "lucide-react";
// Clerk handles authentication automatically via cookies - no need for fetch

interface Rule { id: string; label: string; description: string; details: string[] }

const getRuleIcon = (id: string) => {
  switch (id) {
    case "ROUND_ROBIN":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case "CONVERSION_WEIGHTED":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
        </svg>
      );
    case "HYBRID":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "CUSTOM":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
      );
  }
};

const getRuleColor = (id: string, isActive: boolean) => {
  if (isActive) {
    return {
      gradient: "from-primary to-primary/90",
      border: "border-primary/20",
      hoverBorder: "hover:border-primary/30"
    };
  }
  return {
    gradient: "from-slate-700 to-slate-800",
    border: "border-slate-200/60",
    hoverBorder: "hover:border-slate-300"
  };
};

const getRuleDetails = (id: string): string[] => {
  switch (id) {
    case "ROUND_ROBIN":
      return [
        "Leads are distributed evenly among all available agents",
        "Each agent gets the same number of leads over time",
        "Simple and fair distribution method",
        "Best for teams with similar skill levels"
      ];
    case "CONVERSION_WEIGHTED":
      return [
        "Agents with higher conversion rates get more leads",
        "Performance-based lead distribution",
        "Optimizes for overall team conversion",
        "Rewards top performers with quality leads"
      ];
    case "HYBRID":
      return [
        "Combines round-robin with performance weighting",
        "Ensures fair distribution while rewarding performance",
        "Balanced approach for most teams",
        "70% performance-based, 30% round-robin"
      ];
    case "CUSTOM":
      return [
        "Advanced lead assignment based on custom criteria",
        "Configure ad spend percentages (15%, 30%, etc.)",
        "Multiple business rules and conditions",
        "Highly customizable for complex scenarios"
      ];
    default:
      return [];
  }
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [active, setActive] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [pendingRuleId, setPendingRuleId] = useState<string>("");
  const [selectedConversionRates, setSelectedConversionRates] = useState<string[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customConfig, setCustomConfig] = useState({
    adSpendPercentages: [15, 30],
    selectedOptions: [] as string[],
    customRules: [] as string[]
  });

  async function refresh() {
    const d = await fetch("/api/tl/automations", { cache: "no-store" }).then((r) => r.json());
    setRules(d.rules || []);
    setActive(d.active || "");
  }

  useEffect(() => { refresh(); }, []);

  // Add custom rule to the rules array
  useEffect(() => {
    if (rules.length > 0 && !rules.find(r => r.id === "CUSTOM")) {
      setRules(prev => [...prev, {
        id: "CUSTOM",
        label: "Custom Automation",
        description: "Advanced lead assignment based on custom criteria including ad spend percentages and multiple business rules",
        details: getRuleDetails("CUSTOM")
      }]);
    }
  }, [rules]);

  // Update active state when custom rule is activated
  useEffect(() => {
    const storedRule = localStorage.getItem("lead_assign_rule");
    if (storedRule && storedRule === "CUSTOM" && active !== "CUSTOM") {
      setActive("CUSTOM");
    }
  }, [active]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Automation Rules</h1>
              <p className="text-sm text-slate-600 mt-1">Configure how leads are automatically assigned to agents</p>
            </div>
            {active && (
              <Badge className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {rules.find(r => r.id === active)?.label || active}
              </Badge>
            )}
          </div>
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.length === 0 ? (
            <div className="col-span-2 bg-white border border-slate-200/60 rounded-lg p-12 text-center shadow-sm">
              <div className="text-slate-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">No Automation Rules</h3>
              <p className="text-xs text-slate-600">No automation rules are configured yet.</p>
            </div>
          ) : (
            rules.map((rule) => {
              const isActive = active === rule.id;
              const colors = getRuleColor(rule.id, isActive);
              const details = getRuleDetails(rule.id);
              
              return (
                <Card
                  key={rule.id}
                  className={`border transition-all duration-200 hover:shadow-md ${
                    isActive 
                      ? `${colors.border} shadow-md` 
                      : `border-slate-200/60 ${colors.hoverBorder}`
                  }`}
                >
                  <CardContent className="p-0">
                    {/* Gradient Header */}
                    <div className={`bg-gradient-to-br ${colors.gradient} p-4`}>
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2 rounded-lg">
                            {getRuleIcon(rule.id)}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold">{rule.label}</h3>
                            {isActive && (
                              <Badge className="bg-white/20 text-white border-white/30 mt-1 h-5 text-[10px]">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors">
                              <Info className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs bg-white border border-slate-200 shadow-lg">
                            <div className="space-y-1.5">
                              <p className="font-semibold text-xs mb-2 text-slate-900">How it works:</p>
                              {details.map((detail, idx) => (
                                <p key={idx} className="text-xs text-slate-600">• {detail}</p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* White Content */}
                    <div className="p-4 bg-white">
                      <p className="text-xs text-slate-600 mb-4 line-clamp-2">{rule.description}</p>
                      <Button
                        className={`w-full ${
                          isActive
                            ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                        disabled={saving || isActive}
                        size="sm"
                        onClick={async () => {
                          if (isActive) return;
                          
                          // Show conversion rate modal for CONVERSION_WEIGHTED rule
                          if (rule.id === "CONVERSION_WEIGHTED") {
                            setPendingRuleId(rule.id);
                            setSelectedConversionRates([]);
                            setShowConversionModal(true);
                            return;
                          }
                          
                          // Show custom automation modal for CUSTOM rule
                          if (rule.id === "CUSTOM") {
                            setPendingRuleId(rule.id);
                            setShowCustomModal(true);
                            return;
                          }
                          
                          setSaving(true);
                          const res = await fetch("/api/tl/automations", { 
                            method: "POST", 
                            headers: { "Content-Type": "application/json" }, 
                            body: JSON.stringify({ id: rule.id }), 
                            cache: "no-store" 
                          });
                          
                          if (res.ok) {
                            toast.success(`${rule.label} activated successfully`);
                          } else {
                            toast.error("Failed to update automation");
                          }
                          
                          try {
                            if (typeof window !== "undefined") {
                              localStorage.setItem("lead_assign_rule", rule.id);
                              window.dispatchEvent(new CustomEvent("automation-rule-changed", { detail: { id: rule.id } }));
                            }
                          } catch {}
                          
                          await refresh();
                          setSaving(false);
                        }}
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                            Activating...
                          </>
                        ) : isActive ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Active
                          </>
                        ) : (
                          "Activate Rule"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Information Panel */}
        <div className="mt-6">
          <Card className="border border-slate-200/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-slate-400 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 mb-1">About Automation Rules</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Automation rules determine how incoming leads are automatically assigned to your sales agents. 
                    Only one rule can be active at a time. Changes take effect immediately for new leads.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Rate Selection Modal */}
        {showConversionModal && (
        <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="bg-green-100 text-green-600 p-3 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Select Conversion Options</h3>
              <p className="text-sm text-slate-600">Choose one or more conversion rate levels for lead distribution</p>
            </div>
            
            <div className="space-y-3 mb-6">
              {[
                { id: "default", label: "Default Conversion", description: "Standard conversion-weighted distribution algorithm" },
                { id: "low", label: "Low Conversion Rate", description: "Agents with lower performance get more leads to improve" },
                { id: "medium", label: "Medium Conversion Rate", description: "Balanced distribution based on moderate performance" },
                { id: "high", label: "High Conversion Rate", description: "Top performers get priority on new leads" }
              ].map((option) => {
                const isSelected = selectedConversionRates.includes(option.id);
                return (
                  <button
                    key={option.id}
                    className={`w-full text-left p-4 border rounded-xl transition-all duration-200 group ${
                      isSelected 
                        ? "border-green-400 bg-green-50" 
                        : "border-slate-200 hover:border-green-300 hover:bg-green-50"
                    }`}
                    onClick={() => {
                      setSelectedConversionRates(prev => 
                        prev.includes(option.id)
                          ? prev.filter(id => id !== option.id)
                          : [...prev, option.id]
                      );
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 border-2 rounded transition-colors mt-0.5 flex items-center justify-center ${
                        isSelected 
                          ? "border-green-500 bg-green-500" 
                          : "border-slate-300 group-hover:border-green-500"
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className={`font-medium ${
                          isSelected ? "text-green-700" : "text-slate-900 group-hover:text-green-700"
                        }`}>{option.label}</div>
                        <div className="text-sm text-slate-600 mt-1">{option.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                onClick={() => {
                  setShowConversionModal(false);
                  setPendingRuleId("");
                  setSelectedConversionRates([]);
                }}
              >
                Cancel
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-xl font-medium transition-colors ${
                  selectedConversionRates.length > 0
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                disabled={selectedConversionRates.length === 0}
                onClick={async () => {
                  if (selectedConversionRates.length === 0) return;
                  
                  setSaving(true);
                  setShowConversionModal(false);
                  
                  const res = await fetch("/api/tl/automations", { 
                    method: "POST", 
                    headers: { "Content-Type": "application/json" }, 
                    body: JSON.stringify({ 
                      id: pendingRuleId,
                      conversionRates: selectedConversionRates 
                    }), 
                    cache: "no-store" 
                  });
                  
                  if (res.ok) {
                    const selectedLabels = selectedConversionRates.map(id => {
                      const option = [
                        { id: "default", label: "Default Conversion" },
                        { id: "low", label: "Low Conversion Rate" },
                        { id: "medium", label: "Medium Conversion Rate" },
                        { id: "high", label: "High Conversion Rate" }
                      ].find(opt => opt.id === id);
                      return option?.label || id;
                    }).join(", ");
                    toast.success(`Conversion-based rule activated with: ${selectedLabels}`);
                  } else {
                    toast.error("Failed to update automation");
                  }
                  
                  try {
                    if (typeof window !== "undefined") {
                      localStorage.setItem("lead_assign_rule", pendingRuleId);
                      localStorage.setItem("conversion_rate_levels", JSON.stringify(selectedConversionRates));
                      window.dispatchEvent(new CustomEvent("automation-rule-changed", { detail: { id: pendingRuleId, conversionRates: selectedConversionRates } }));
                    }
                  } catch {}
                  
                  await refresh();
                  setSaving(false);
                  setPendingRuleId("");
                  setSelectedConversionRates([]);
                }}
              >
                Activate Rule
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Automation Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="bg-orange-100 text-orange-600 p-3 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Custom Automation Configuration</h3>
              <p className="text-sm text-slate-600">Configure advanced lead assignment rules with ad spend percentages and multiple options</p>
            </div>
            
            {/* Ad Spend Percentages */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">Ad Spend Percentages (%)</label>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((percentage) => (
                  <button
                    key={percentage}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      customConfig.adSpendPercentages.includes(percentage)
                        ? "bg-orange-100 text-orange-700 border-2 border-orange-300"
                        : "bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200"
                    }`}
                    onClick={() => {
                      setCustomConfig(prev => ({
                        ...prev,
                        adSpendPercentages: prev.adSpendPercentages.includes(percentage)
                          ? prev.adSpendPercentages.filter(p => p !== percentage)
                          : [...prev.adSpendPercentages, percentage].sort((a, b) => a - b)
                      }));
                    }}
                  >
                    {percentage}%
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Select the ad spend percentage thresholds for lead distribution</p>
            </div>
            
            {/* Multiple Options */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">Business Rules</label>
              <div className="space-y-3">
                {[
                  { id: "location_based", label: "Location-Based Assignment", description: "Assign leads based on geographic proximity" },
                  { id: "time_based", label: "Time-Based Assignment", description: "Consider agent availability and time zones" },
                  { id: "skill_based", label: "Skill-Based Assignment", description: "Match leads to agents with specific expertise" },
                  { id: "load_balanced", label: "Load Balancing", description: "Distribute leads to maintain even workload" },
                  { id: "priority_based", label: "Priority-Based Assignment", description: "High-value leads get top performers" },
                  { id: "campaign_based", label: "Campaign-Based Assignment", description: "Assign based on lead source and campaign" }
                ].map((option) => {
                  const isSelected = customConfig.selectedOptions.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      className={`w-full text-left p-4 border rounded-xl transition-all duration-200 group ${
                        isSelected 
                          ? "border-orange-400 bg-orange-50" 
                          : "border-slate-200 hover:border-orange-300 hover:bg-orange-50"
                      }`}
                      onClick={() => {
                        setCustomConfig(prev => ({
                          ...prev,
                          selectedOptions: prev.selectedOptions.includes(option.id)
                            ? prev.selectedOptions.filter(id => id !== option.id)
                            : [...prev.selectedOptions, option.id]
                        }));
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 border-2 rounded transition-colors mt-0.5 flex items-center justify-center ${
                          isSelected 
                            ? "border-orange-500 bg-orange-500" 
                            : "border-slate-300 group-hover:border-orange-500"
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-4.242 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className={`font-medium ${
                            isSelected ? "text-orange-700" : "text-slate-900 group-hover:text-orange-700"
                          }`}>{option.label}</div>
                          <div className="text-sm text-slate-600 mt-1">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Custom Rules Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">Custom Rules (Optional)</label>
              <textarea
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={3}
                placeholder="Enter any additional custom rules or conditions..."
                value={customConfig.customRules.join('\n')}
                onChange={(e) => {
                  setCustomConfig(prev => ({
                    ...prev,
                    customRules: e.target.value.split('\n').filter(rule => rule.trim())
                  }));
                }}
              />
              <p className="text-xs text-slate-500 mt-2">Add custom business logic or conditions for lead assignment</p>
            </div>
            
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                onClick={() => {
                  setShowCustomModal(false);
                  setPendingRuleId("");
                  setCustomConfig({
                    adSpendPercentages: [15, 30],
                    selectedOptions: [],
                    customRules: []
                  });
                }}
              >
                Cancel
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-xl font-medium transition-colors ${
                  customConfig.adSpendPercentages.length > 0 && customConfig.selectedOptions.length > 0
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                disabled={customConfig.adSpendPercentages.length === 0 || customConfig.selectedOptions.length === 0}
                onClick={async () => {
                  if (customConfig.adSpendPercentages.length === 0 || customConfig.selectedOptions.length === 0) return;
                  
                  setSaving(true);
                  setShowCustomModal(false);
                  
                  const res = await fetch("/api/tl/automations", { 
                    method: "POST", 
                    headers: { "Content-Type": "application/json" }, 
                    body: JSON.stringify({ 
                      id: pendingRuleId,
                      customConfig: customConfig
                    }), 
                    cache: "no-store" 
                  });
                  
                  if (res.ok) {
                    const selectedLabels = customConfig.selectedOptions.map(id => {
                      const option = [
                        { id: "location_based", label: "Location-Based Assignment" },
                        { id: "time_based", label: "Time-Based Assignment" },
                        { id: "skill_based", label: "Skill-Based Assignment" },
                        { id: "load_balanced", label: "Load Balancing" },
                        { id: "priority_based", label: "Priority-Based Assignment" },
                        { id: "campaign_based", label: "Campaign-Based Assignment" }
                      ].find(opt => opt.id === id);
                      return option?.label || id;
                    }).join(", ");
                    toast.success(`Custom automation activated with ${customConfig.adSpendPercentages.join('%, ')}% ad spend and: ${selectedLabels}`);
                    setActive("CUSTOM");
                  } else {
                    toast.error("Failed to update automation");
                  }
                  
                  try {
                    if (typeof window !== "undefined") {
                      localStorage.setItem("lead_assign_rule", pendingRuleId);
                      localStorage.setItem("custom_automation_config", JSON.stringify(customConfig));
                      window.dispatchEvent(new CustomEvent("automation-rule-changed", { detail: { id: pendingRuleId, customConfig: customConfig } }));
                    }
                  } catch {}
                  
                  await refresh();
                  setSaving(false);
                  setPendingRuleId("");
                  setCustomConfig({
                    adSpendPercentages: [15, 30],
                    selectedOptions: [],
                    customRules: []
                  });
                }}
              >
                Activate Custom Rule
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </TooltipProvider>
  );
}