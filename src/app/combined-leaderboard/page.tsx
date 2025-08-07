"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SalePopper from '../leaderboard/SalePopper';

const COMPETITIVE_GRADIENTS = [
  'from-yellow-300 via-yellow-400 to-yellow-600', // Gold
  'from-gray-300 via-gray-400 to-gray-600', // Silver
  'from-orange-300 via-orange-400 to-orange-600', // Bronze
  'from-purple-400 via-purple-500 to-purple-700',
  'from-blue-400 via-blue-500 to-blue-700',
  'from-green-400 via-green-500 to-green-700',
  'from-red-400 via-red-500 to-red-700',
  'from-indigo-400 via-indigo-500 to-indigo-700',
  'from-pink-400 via-pink-500 to-pink-700',
  'from-teal-400 via-teal-500 to-teal-700',
];

const RANK_COLORS = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-orange-400',
  default: 'text-white'
};

const RANK_ICONS = {
  1: '👑',
  2: '🥈',
  3: '🥉',
  default: '⚡'
};

const CALL_RANK_ICONS = {
  1: '👑',
  2: '🥈',
  3: '🥉',
  default: '📞'
};

type Sale = {
  ogaName: string;
  customerName: string;
  amount: number;
  newAdmission: string;
  createdAt?: string;
};

type Call = {
  _id: string;
  ogaName: string;
  callCompleted: string;
  callType: string;
  callStatus: string;
  notes: string;
  createdAt: string;
};

type OGAStat = {
  name: string;
  total: number;
  count: number;
  avgSale: number;
  lastSale?: string;
};

type CallStat = {
  name: string;
  totalCalls: number;
  newCalls: number;
  followupCalls: number;
  completedCalls: number;
  convertedCalls: number;
  conversionPercentage: number;
  lastCall?: string;
};

function getLeaderboard(sales: Sale[]): OGAStat[] {
  const leaderboard: Record<string, OGAStat> = {};
  for (const sale of sales) {
    if (!leaderboard[sale.ogaName]) {
      leaderboard[sale.ogaName] = {
        name: sale.ogaName,
        total: 0,
        count: 0,
        avgSale: 0,
        lastSale: sale.createdAt
      };
    }
    leaderboard[sale.ogaName].total += Number(sale.amount);
    if (sale.newAdmission === 'yes') {
      leaderboard[sale.ogaName].count += 1;
    }
    if (sale.createdAt && (!leaderboard[sale.ogaName].lastSale || sale.createdAt > leaderboard[sale.ogaName].lastSale!)) {
      leaderboard[sale.ogaName].lastSale = sale.createdAt;
    }
  }
  return Object.values(leaderboard)
    .map(oga => ({
      ...oga,
      avgSale: oga.count > 0 ? oga.total / oga.count : 0
    }))
    .sort((a, b) => b.total - a.total);
}

function getCallLeaderboard(calls: Call[]): CallStat[] {
  const leaderboard: Record<string, CallStat> = {};
  
  calls.forEach((call) => {
    // Skip NATC calls from total count
    if (call.callStatus === 'NATC') {
      return;
    }
    
    if (!leaderboard[call.ogaName]) {
      leaderboard[call.ogaName] = {
        name: call.ogaName,
        totalCalls: 0,
        newCalls: 0,
        followupCalls: 0,
        completedCalls: 0,
        convertedCalls: 0,
        conversionPercentage: 0,
        lastCall: call.createdAt
      };
    }
    
    const stat = leaderboard[call.ogaName];
    stat.totalCalls += 1;
    
    // Count call types
    if (call.callType === 'new') {
      stat.newCalls += 1;
    } else if (call.callType === 'followup') {
      stat.followupCalls += 1;
    }
    
    // Count completed calls (QUALIFIED and POSITIVE)
    if (call.callStatus === 'QUALIFIED' || call.callStatus === 'POSITIVE') {
      stat.completedCalls += 1;
    }
    
    // Count converted calls (only POSITIVE)
    if (call.callStatus === 'POSITIVE') {
      stat.convertedCalls += 1;
    }
    
    // Update last call
    if (call.createdAt && (!stat.lastCall || call.createdAt > stat.lastCall)) {
      stat.lastCall = call.createdAt;
    }
  });
  
  // Calculate conversion percentages
  Object.values(leaderboard).forEach(stat => {
    stat.conversionPercentage = stat.completedCalls > 0 ? 
      ((stat.convertedCalls / stat.completedCalls) * 100) : 0;
  });
  
  return Object.values(leaderboard)
    .sort((a, b) => b.convertedCalls - a.convertedCalls || b.conversionPercentage - a.conversionPercentage);
}

function getRankColor(rank: number) {
  if (rank === 1) return RANK_COLORS[1];
  if (rank === 2) return RANK_COLORS[2];
  if (rank === 3) return RANK_COLORS[3];
  return RANK_COLORS.default;
}

function getRankIcon(rank: number, isCall = false) {
  if (rank === 1) return isCall ? CALL_RANK_ICONS[1] : RANK_ICONS[1];
  if (rank === 2) return isCall ? CALL_RANK_ICONS[2] : RANK_ICONS[2];
  if (rank === 3) return isCall ? CALL_RANK_ICONS[3] : RANK_ICONS[3];
  return isCall ? CALL_RANK_ICONS.default : RANK_ICONS.default;
}

function groupLeaderboardByTotal(leaderboard: OGAStat[]) {
  const groups: { total: number; ogas: OGAStat[] }[] = [];
  leaderboard.forEach(oga => {
    const group = groups.find(g => g.total === oga.total);
    if (group) {
      group.ogas.push(oga);
    } else {
      groups.push({ total: oga.total, ogas: [oga] });
    }
  });
  return groups.sort((a, b) => b.total - a.total);
}

function groupLeaderboardByConverted(leaderboard: CallStat[]) {
  const groups: { converted: number; ogas: CallStat[] }[] = [];
  leaderboard.forEach(oga => {
    const group = groups.find(g => g.converted === oga.convertedCalls);
    if (group) {
      group.ogas.push(oga);
    } else {
      groups.push({ converted: oga.convertedCalls, ogas: [oga] });
    }
  });
  return groups.sort((a, b) => b.converted - a.converted);
}

function filterSalesByDate(sales: Sale[], date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return sales.filter(sale => {
    if (!sale.createdAt) return false;
    const saleDate = new Date(sale.createdAt);
    return saleDate.getFullYear() === y && saleDate.getMonth() === m && saleDate.getDate() === d;
  });
}

function filterCallsByDate(calls: Call[], date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return calls.filter(call => {
    if (!call.createdAt) return false;
    const callDate = new Date(call.createdAt);
    return callDate.getFullYear() === y && callDate.getMonth() === m && callDate.getDate() === d;
  });
}

function getYesterday(date: Date) {
  const yest = new Date(date);
  yest.setDate(date.getDate() - 1);
  return yest;
}

export default function CombinedLeaderboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pulseEffect, setPulseEffect] = useState<number | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [popper, setPopper] = useState<{ ogaName: string; amount: number } | null>(null);
  const [currentView, setCurrentView] = useState<'sales' | 'calls'>('sales');
  const lastSaleId = useRef<string | null>(null);

  // Fetch data from API in real time
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, callsRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/calls')
        ]);
        
        const salesData = await salesRes.json();
        const callsData = await callsRes.json();
        
        setSales(salesData);
        setCalls(callsData);
        setLastUpdateTime(new Date());
        setPulseEffect(Date.now());
        setTimeout(() => setPulseEffect(null), 2000);
        
        // Popper logic: show when new sale comes in
        if (salesData.length > 0) {
          const latest = salesData[salesData.length - 1];
          if (latest.createdAt && latest.createdAt !== lastSaleId.current) {
            lastSaleId.current = latest.createdAt;
            setPopper({ ogaName: latest.ogaName, amount: latest.amount });
          }
        }
      } catch (e) {
        // fallback: do nothing
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update current time every second for live feel
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Alternate between sales and calls every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentView(prev => prev === 'sales' ? 'calls' : 'sales');
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  const today = new Date();
  const todaySales = filterSalesByDate(sales, today);
  const todayCalls = filterCallsByDate(calls, today);
  
  let displaySales = todaySales;
  let displayCalls = todayCalls;
  let showingYesterday = false;
  
  if (todaySales.length === 0 && todayCalls.length === 0) {
    const yesterday = getYesterday(today);
    const yesterdaySales = filterSalesByDate(sales, yesterday);
    const yesterdayCalls = filterCallsByDate(calls, yesterday);
    displaySales = yesterdaySales;
    displayCalls = yesterdayCalls;
    showingYesterday = true;
  }
  
  const salesLeaderboard = getLeaderboard(displaySales);
  const callsLeaderboard = getCallLeaderboard(displayCalls);
  const groupedSalesLeaderboard = groupLeaderboardByTotal(showingYesterday ? salesLeaderboard.slice(0, 3) : salesLeaderboard);
  const groupedCallsLeaderboard = groupLeaderboardByConverted(showingYesterday ? callsLeaderboard.slice(0, 3) : callsLeaderboard);
  
  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalSalesToday = todaySales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalCalls = calls.filter(call => call.callStatus !== 'NATC').length;
  const totalCallsToday = todayCalls.filter(call => call.callStatus !== 'NATC').length;
  
  const topSalesPerformer = salesLeaderboard[0];
  const secondSalesPlace = salesLeaderboard[1];
  const salesLeadGap = topSalesPerformer && secondSalesPlace ? topSalesPerformer.total - secondSalesPlace.total : 0;
  
  const topCallPerformer = callsLeaderboard[0];
  const secondCallPlace = callsLeaderboard[1];
  const callLeadGap = topCallPerformer && secondCallPlace ? topCallPerformer.convertedCalls - secondCallPlace.convertedCalls : 0;

  // Use a stable callback for popper dismissal
  const handlePopperDone = React.useCallback(() => setPopper(null), []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 relative overflow-hidden">
      <SalePopper
        ogaName={popper?.ogaName || ''}
        amount={popper?.amount || 0}
        show={!!popper}
        onDone={handlePopperDone}
      />

      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute top-32 right-20 w-24 h-24 bg-purple-400 rounded-full opacity-10 animate-bounce"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-blue-400 rounded-full opacity-10 animate-pulse delay-700"></div>
        <div className="absolute bottom-32 right-1/3 w-28 h-28 bg-green-400 rounded-full opacity-10 animate-bounce delay-1000"></div>
      </div>

      {/* Header Section */}
      <div className="relative z-10 pt-8 pb-6">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <AnimatePresence mode="wait">
            <motion.h1
              key={currentView}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
              className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 mb-4 tracking-wider drop-shadow-2xl"
            >
              {currentView === 'sales' ? '🚀 SALES LEADERBOARD' : '📞 CALL LEADERBOARD'}
            </motion.h1>
          </AnimatePresence>
          
          <div className="flex justify-center items-center gap-8 text-white/80 text-lg font-semibold">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span>LIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentView}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="text-4xl font-extrabold text-green-400"
                >
                  {currentView === 'sales' 
                    ? `₹${totalSalesToday.toLocaleString()}` 
                    : totalCallsToday
                  }
                </motion.span>
              </AnimatePresence>
              <span className="text-xl font-bold text-white/80">
                {currentView === 'sales' ? 'Total Sales' : 'Total Calls'}
              </span>
            </div>
            <div>{currentTime.toLocaleTimeString()}</div>
          </div>
        </motion.div>

        {/* Competition Stats */}
        <AnimatePresence mode="wait">
          {currentView === 'sales' && topSalesPerformer && secondSalesPlace && (
            <motion.div
              key="sales-stats"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex justify-center mt-6"
            >
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl px-8 py-4 border border-red-400/30">
                <div className="text-center text-white">
                  <div className="text-sm font-semibold text-red-300">🔥 LEAD GAP</div>
                  <div className="text-2xl font-black text-yellow-400">₹{salesLeadGap.toLocaleString()}</div>
                  <div className="text-xs text-white/70">{secondSalesPlace.name} needs to catch up!</div>
                </div>
              </div>
            </motion.div>
          )}
          
          {currentView === 'calls' && topCallPerformer && secondCallPlace && (
            <motion.div
              key="call-stats"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex justify-center mt-6"
            >
              <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl px-8 py-4 border border-indigo-400/30">
                <div className="text-center text-white">
                  <div className="text-sm font-semibold text-indigo-300">🔥 LEAD GAP</div>
                  <div className="text-2xl font-black text-indigo-400">{callLeadGap} Calls</div>
                  <div className="text-xs text-white/70">{secondCallPlace.name} needs to catch up!</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Leaderboard */}
      <div className="relative z-10 px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          {showingYesterday && (
            <div className="text-center text-yellow-300 text-lg font-semibold mb-4">
              Showing yesterday's top 3 (no data yet today)
            </div>
          )}
          
          <AnimatePresence mode="wait">
            {currentView === 'sales' && (
              <motion.div
                key="sales-leaderboard"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.5 }}
                className="grid gap-4"
              >
                {groupedSalesLeaderboard.slice(0, 8).map((group, groupIndex) => {
                  const rank = groupIndex + 1;
                  const isTop3 = rank <= 3;
                  return (
                    <motion.div
                      key={group.total + '-' + group.ogas.map(o => o.name).join(',')}
                      initial={{ x: -200, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 200, opacity: 0 }}
                      transition={{ 
                        duration: 0.8, 
                        delay: groupIndex * 0.1,
                        type: "spring",
                        stiffness: 100
                      }}
                      className={`relative overflow-hidden rounded-3xl ${
                        isTop3 ? 'transform scale-105' : ''
                      }`}
                      style={{
                        background: rank === 1 
                          ? 'linear-gradient(135deg, rgba(255,215,0,0.3) 0%, rgba(255,193,7,0.2) 100%)'
                          : rank === 2
                          ? 'linear-gradient(135deg, rgba(192,192,192,0.3) 0%, rgba(169,169,169,0.2) 100%)'
                          : rank === 3
                          ? 'linear-gradient(135deg, rgba(205,127,50,0.3) 0%, rgba(184,115,51,0.2) 100%)'
                          : 'linear-gradient(135deg, rgba(100,116,139,0.3) 0%, rgba(71,85,105,0.2) 100%)'
                      }}
                    >
                      <div className="relative z-10 flex items-center p-6 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <motion.div
                            animate={pulseEffect && rank === 1 ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.5 }}
                            className={`text-6xl font-black ${getRankColor(rank)} drop-shadow-lg flex items-center gap-2`}
                          >
                            <span>{rank}</span>
                            <span className="text-4xl">{getRankIcon(rank)}</span>
                          </motion.div>
                          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-12">
                            {group.ogas.map((oga, idx) => (
                              <div key={oga.name} className="flex items-center gap-8 border-r border-white/20 pr-8 last:border-r-0 last:pr-0">
                                <div className="text-3xl font-black text-white drop-shadow-lg truncate">
                                  {oga.name}
                                </div>
                                <div className="flex gap-10 ml-4">
                                  <div className="text-center">
                                    <div className="text-2xl font-black text-green-400">₹{oga.total.toLocaleString()}</div>
                                    <div className="text-xs text-white/70">Total Sales</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-black text-blue-400">{oga.count}</div>
                                    <div className="text-xs text-white/70">Sales Count</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-black text-purple-400">₹{oga.avgSale.toLocaleString()}</div>
                                    <div className="text-xs text-white/70">Avg Sale</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
            
            {currentView === 'calls' && (
              <motion.div
                key="calls-leaderboard"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.5 }}
                className="grid gap-4"
              >
                {groupedCallsLeaderboard.slice(0, 8).map((group, groupIndex) => {
                  const rank = groupIndex + 1;
                  const isTop3 = rank <= 3;
                  return (
                    <motion.div
                      key={group.converted + '-' + group.ogas.map(o => o.name).join(',')}
                      initial={{ x: -200, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 200, opacity: 0 }}
                      transition={{ 
                        duration: 0.8, 
                        delay: groupIndex * 0.1,
                        type: "spring",
                        stiffness: 100
                      }}
                      className={`relative overflow-hidden rounded-3xl ${
                        isTop3 ? 'transform scale-105' : ''
                      }`}
                      style={{
                        background: rank === 1 
                          ? 'linear-gradient(135deg, rgba(255,215,0,0.3) 0%, rgba(255,193,7,0.2) 100%)'
                          : rank === 2
                          ? 'linear-gradient(135deg, rgba(192,192,192,0.3) 0%, rgba(169,169,169,0.2) 100%)'
                          : rank === 3
                          ? 'linear-gradient(135deg, rgba(205,127,50,0.3) 0%, rgba(184,115,51,0.2) 100%)'
                          : 'linear-gradient(135deg, rgba(100,116,139,0.3) 0%, rgba(71,85,105,0.2) 100%)'
                      }}
                    >
                      <div className="relative z-10 flex items-center p-6 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <motion.div
                            animate={pulseEffect && rank === 1 ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.5 }}
                            className={`text-6xl font-black ${getRankColor(rank)} drop-shadow-lg flex items-center gap-2`}
                          >
                            <span>{rank}</span>
                            <span className="text-4xl">{getRankIcon(rank, true)}</span>
                          </motion.div>
                          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-12">
                            {group.ogas.map((oga, idx) => (
                              <div key={oga.name} className="flex items-center gap-8 border-r border-white/20 pr-8 last:border-r-0 last:pr-0">
                                <div className="text-3xl font-black text-white drop-shadow-lg truncate">
                                  {oga.name}
                                </div>
                                <div className="flex gap-10 ml-4">
                                  <div className="text-center">
                                    <div className="text-2xl font-black text-indigo-300">{oga.totalCalls}</div>
                                    <div className="text-xs text-white/70">Total Calls</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-black text-blue-300">{oga.newCalls}</div>
                                    <div className="text-xs text-white/70">New</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-black text-purple-300">{oga.followupCalls}</div>
                                    <div className="text-xs text-white/70">Follow-up</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-black text-green-300">{oga.convertedCalls}</div>
                                    <div className="text-xs text-white/70">Converted</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-black text-yellow-300">{oga.conversionPercentage.toFixed(1)}%</div>
                                    <div className="text-xs text-white/70">Conversion</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
} 