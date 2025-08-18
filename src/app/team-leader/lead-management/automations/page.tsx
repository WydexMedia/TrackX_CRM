"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Rule { id: string; label: string; description: string }

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
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
      );
  }
};

const getRuleColor = (id: string) => {
  switch (id) {
    case "ROUND_ROBIN":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        icon: "text-blue-600",
        border: "border-blue-200",
        activeBg: "bg-blue-100",
        activeText: "text-blue-800"
      };
    case "CONVERSION_WEIGHTED":
      return {
        bg: "bg-green-50",
        text: "text-green-700",
        icon: "text-green-600",
        border: "border-green-200",
        activeBg: "bg-green-100",
        activeText: "text-green-800"
      };
    case "HYBRID":
      return {
        bg: "bg-purple-50",
        text: "text-purple-700",
        icon: "text-purple-600",
        border: "border-purple-200",
        activeBg: "bg-purple-100",
        activeText: "text-purple-800"
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        icon: "text-gray-600",
        border: "border-gray-200",
        activeBg: "bg-gray-100",
        activeText: "text-gray-800"
      };
  }
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [active, setActive] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [pendingRuleId, setPendingRuleId] = useState<string>("");
  const [selectedConversionRates, setSelectedConversionRates] = useState<string[]>([]);

  async function refresh() {
    const d = await fetch("/api/tl/automations", { cache: "no-store" }).then((r) => r.json());
    setRules(d.rules || []);
    setActive(d.active || "");
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Automation Rules</h1>
            <p className="text-slate-600">Configure how leads are automatically assigned to agents</p>
          </div>
        </div>
        
        {active && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="text-emerald-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-emerald-800">
                  Currently using: {rules.find(r => r.id === active)?.label || active}
                </p>
                <p className="text-sm text-emerald-700">
                  All new leads will be assigned using this rule
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rules Grid */}
      <div className="grid gap-6">
        {rules.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Automation Rules</h3>
            <p className="text-slate-600">No automation rules are configured yet. Contact your administrator to set up lead assignment rules.</p>
          </div>
        ) : (
          rules.map((rule) => {
            const colors = getRuleColor(rule.id);
            const isActive = active === rule.id;
            
            return (
              <div
                key={rule.id}
                className={`bg-white border-2 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg ${
                  isActive 
                    ? `${colors.border} shadow-lg` 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`${colors.bg} ${colors.icon} p-3 rounded-xl`}>
                        {getRuleIcon(rule.id)}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{rule.label}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          {isActive ? (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${colors.activeBg} ${colors.activeText}`}>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Currently Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <p className="text-slate-700 leading-relaxed">{rule.description}</p>
                    </div>

                    {/* Rule Details */}
                    <div className={`${colors.bg} rounded-xl p-4 mb-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className={`w-4 h-4 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={`text-sm font-medium ${colors.text}`}>How it works</span>
                      </div>
                      <div className="space-y-2">
                        {rule.id === "ROUND_ROBIN" && (
                          <ul className={`text-sm ${colors.text} space-y-1`}>
                            <li>• Leads are distributed evenly among all available agents</li>
                            <li>• Each agent gets the same number of leads over time</li>
                            <li>• Simple and fair distribution method</li>
                          </ul>
                        )}
                        {rule.id === "CONVERSION_WEIGHTED" && (
                          <ul className={`text-sm ${colors.text} space-y-1`}>
                            <li>• Agents with higher conversion rates get more leads</li>
                            <li>• Performance-based lead distribution</li>
                            <li>• Optimizes for overall team conversion</li>
                          </ul>
                        )}
                        {rule.id === "HYBRID" && (
                          <ul className={`text-sm ${colors.text} space-y-1`}>
                            <li>• Combines round-robin with performance weighting</li>
                            <li>• Ensures fair distribution while rewarding performance</li>
                            <li>• Balanced approach for most teams</li>
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-6 flex flex-col items-end gap-3">
                    <button
                      className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isActive
                          ? `${colors.activeBg} ${colors.activeText} cursor-default`
                          : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow-md"
                      }`}
                      disabled={saving || isActive}
                      onClick={async () => {
                        if (isActive) return;
                        
                        // Show conversion rate modal for CONVERSION_WEIGHTED rule
                        if (rule.id === "CONVERSION_WEIGHTED") {
                          setPendingRuleId(rule.id);
                          setSelectedConversionRates([]);
                          setShowConversionModal(true);
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
                        <div className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Activating...
                        </div>
                      ) : isActive ? (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Active
                        </div>
                      ) : (
                        "Activate Rule"
                      )}
                    </button>
                    
                    {isActive && (
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Activated</div>
                        <div className="text-xs text-slate-400">All new leads use this rule</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Information Panel */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-blue-600 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-blue-900 mb-2">About Automation Rules</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              Automation rules determine how incoming leads are automatically assigned to your sales agents. 
              Only one rule can be active at a time. Changes take effect immediately for new leads, 
              but existing leads retain their current assignments.
            </p>
          </div>
        </div>
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
    </div>
  );
}