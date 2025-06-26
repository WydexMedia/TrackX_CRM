"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SalePopper from './SalePopper';

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

type Sale = {
  ogaName: string;
  customerName: string;
  phone: string;
  email: string;
  confirmEmail: string;
  address: string;
  amount: number;
  createdAt?: string;
};

type OGAStat = {
  name: string;
  total: number;
  count: number;
  avgSale: number;
  lastSale?: string;
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
    leaderboard[sale.ogaName].count += 1;
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

// Helper to get color/icon for rank
function getRankColor(rank: number) {
  if (rank === 1) return RANK_COLORS[1];
  if (rank === 2) return RANK_COLORS[2];
  if (rank === 3) return RANK_COLORS[3];
  return RANK_COLORS.default;
}
function getRankIcon(rank: number) {
  if (rank === 1) return RANK_ICONS[1];
  if (rank === 2) return RANK_ICONS[2];
  if (rank === 3) return RANK_ICONS[3];
  return RANK_ICONS.default;
}

export default function CompetitiveLeaderboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pulseEffect, setPulseEffect] = useState<number | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [popper, setPopper] = useState<{ ogaName: string; amount: number } | null>(null);
  const lastSaleId = useRef<string | null>(null);

  // Fetch sales from API in real time
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await fetch('/api/sales');
        const data = await res.json();
        setSales(data);
        setLastUpdateTime(new Date());
        setPulseEffect(Date.now());
        setTimeout(() => setPulseEffect(null), 2000);
        // Popper logic: show when new sale comes in
        if (data.length > 0) {
          const latest = data[data.length - 1];
          if (latest.createdAt && latest.createdAt !== lastSaleId.current) {
            lastSaleId.current = latest.createdAt;
            setPopper({ ogaName: latest.ogaName, amount: latest.amount });
          }
        }
      } catch (e) {
        // fallback: do nothing
      }
    };
    fetchSales();
    const interval = setInterval(fetchSales, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update current time every second for live feel
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const leaderboard = getLeaderboard(sales);
  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const topPerformer = leaderboard[0];
  const secondPlace = leaderboard[1];
  const leadGap = topPerformer && secondPlace ? topPerformer.total - secondPlace.total : 0;

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
          <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 mb-4 tracking-wider drop-shadow-2xl">
            🚀 SALES LEADERBOARD
          </h1>
          <div className="flex justify-center items-center gap-8 text-white/80 text-lg font-semibold">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span>LIVE</span>
            </div>
            <div>Total Sales: ₹{totalSales.toLocaleString()}</div>
            <div>{currentTime.toLocaleTimeString()}</div>
          </div>
        </motion.div>

        {/* Competition Stats */}
        {topPerformer && secondPlace && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex justify-center mt-6"
          >
            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl px-8 py-4 border border-red-400/30">
              <div className="text-center text-white">
                <div className="text-sm font-semibold text-red-300">🔥 LEAD GAP</div>
                <div className="text-2xl font-black text-yellow-400">₹{leadGap.toLocaleString()}</div>
                <div className="text-xs text-white/70">{secondPlace.name} needs to catch up!</div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="relative z-10 px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-4">
            <AnimatePresence>
              {leaderboard.slice(0, 8).map((oga, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                const percentage = topPerformer ? (oga.total / topPerformer.total) * 100 : 0;
                
                return (
                  <motion.div
                    key={oga.name}
                    initial={{ x: -200, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 200, opacity: 0 }}
                    transition={{ 
                      duration: 0.8, 
                      delay: index * 0.1,
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
                    {/* Progress Bar Background */}
                    <div className="absolute inset-0 opacity-20">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 2, delay: index * 0.1 }}
                        className={`h-full bg-gradient-to-r ${COMPETITIVE_GRADIENTS[rank % COMPETITIVE_GRADIENTS.length]}`}
                      />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex items-center p-6 backdrop-blur-sm border border-white/10">
                      {/* Rank Section */}
                      <div className="flex items-center gap-4 min-w-0">
                        <motion.div
                          animate={pulseEffect && rank === 1 ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 0.5 }}
                          className={`text-6xl font-black ${getRankColor(rank)} drop-shadow-lg flex items-center gap-2`}
                        >
                          <span>{rank}</span>
                          <span className="text-4xl">{getRankIcon(rank)}</span>
                        </motion.div>

                        {/* Name and Performance */}
                        <div className="flex-1 min-w-0">
                          <div className="text-3xl font-black text-white drop-shadow-lg mb-1 truncate">
                            {oga.name}
                          </div>
                          <div className="flex flex-wrap gap-6 text-white/90">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-white/60">Total Sales</span>
                              <span className="text-2xl font-bold text-green-400">₹{oga.total.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-white/60">Sales Count</span>
                              <span className="text-xl font-semibold text-blue-400">{oga.count}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-white/60">Avg Sale</span>
                              <span className="text-xl font-semibold text-purple-400">₹{Math.round(oga.avgSale).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Performance Indicator */}
                        <div className="text-right">
                          <div className="text-2xl font-black text-white/80 mb-1">
                            {percentage.toFixed(0)}%
                          </div>
                          <div className="text-sm text-white/60">of leader</div>
                        </div>
                      </div>

                      {/* Special Effects for Top 3 */}
                      {rank === 1 && (
                        <motion.div
                          animate={{ 
                            rotate: [0, 10, -10, 0],
                            scale: pulseEffect ? [1, 1.3, 1] : 1
                          }}
                          transition={{ 
                            rotate: { duration: 2, repeat: Infinity },
                            scale: { duration: 0.5 }
                          }}
                          className="absolute -top-4 -right-4 text-6xl z-20"
                        >
                          👑
                        </motion.div>
                      )}

                      {rank === 2 && (
                        <motion.div
                          animate={{ 
                            y: [0, -5, 0],
                            opacity: [0.7, 1, 0.7]
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute -top-2 -right-2 text-4xl z-20"
                        >
                          🔥
                        </motion.div>
                      )}

                      {rank === 3 && (
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute -top-2 -right-2 text-4xl z-20"
                        >
                          ⭐
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Motivational Footer */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 text-center pb-8"
      >
        <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 mb-2">
          🎯 Every Sale Counts • Push Harder • Climb Higher! 🚀
        </div>
        <div className="text-white/60 text-sm">
          Last updated: {lastUpdateTime.toLocaleTimeString()} • Next update in real-time
        </div>
      </motion.div>
    </div>
  );
}