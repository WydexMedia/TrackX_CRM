"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Trophy, TrendingUp, DollarSign, Award } from "lucide-react";
// Clerk handles authentication automatically via cookies - no need for fetch

type Sale = {
  ogaName: string;
  customerName: string;
  amount: number;
  newAdmission: string;
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
    if (((sale.newAdmission ?? '') + '').trim().toLowerCase() === 'yes') {
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

function filterSalesByDate(sales: Sale[], date: Date) {
  const targetDay = new Date(date).toISOString().split('T')[0];
  return sales.filter(sale => {
    if (!sale.createdAt) return false;
    const saleDay = new Date(sale.createdAt).toISOString().split('T')[0];
    return saleDay === targetDay;
  });
}

export default function DailyLeaderboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const fetchSales = async () => {
      try {
        // Use public leaderboard endpoint to get all tenant sales
        const res = await fetch('/api/public/leaderboard');
        const data = await res.json();
        setSales(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to fetch sales data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
    const interval = setInterval(fetchSales, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const today = new Date();
  const todaySales = filterSalesByDate(sales, today);
  const leaderboard = getLeaderboard(todaySales);
  const totalSalesToday = todaySales.reduce((sum, sale) => sum + sale.amount, 0);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: "🥇", label: "#1", color: "bg-yellow-400 text-yellow-900" };
    if (rank === 2) return { icon: "🥈", label: "#2", color: "bg-slate-300 text-slate-700" };
    if (rank === 3) return { icon: "🥉", label: "#3", color: "bg-orange-400 text-orange-900" };
    return { icon: "⭐", label: `#${rank}`, color: "bg-slate-200 text-slate-700" };
  };

  const getRankCardStyle = (rank: number) => {
    if (rank === 1) return "border-l-4 border-l-yellow-400 bg-yellow-50/30";
    if (rank === 2) return "border-l-4 border-l-slate-400 bg-slate-50/30";
    if (rank === 3) return "border-l-4 border-l-orange-400 bg-orange-50/30";
    return "border-l-4 border-l-slate-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="w-80 border border-slate-200/60 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="inline-block h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-slate-700 font-medium">Loading leaderboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white p-2.5 rounded-lg shadow-sm">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Today's Leaderboard</h1>
                <p className="text-sm text-slate-600 mt-0.5">Real-time sales rankings for {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-slate-600">Live</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-900">{currentTime.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border border-slate-200/60 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Today's Total Sales</p>
                  <p className="text-2xl font-bold text-slate-900">₹{totalSalesToday.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 p-2.5 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/60 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-slate-900">{todaySales.length}</p>
                </div>
                <div className="bg-blue-100 p-2.5 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200/60 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Active Sellers</p>
                  <p className="text-2xl font-bold text-slate-900">{leaderboard.length}</p>
                </div>
                <div className="bg-purple-100 p-2.5 rounded-lg">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Table */}
        <Card className="border border-slate-200/60 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-200/60">
            <CardTitle className="text-lg text-slate-900">Rankings</CardTitle>
            <p className="text-sm text-slate-600 mt-1">Performance leaderboard for today</p>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No sales yet today</h3>
                <p className="text-sm text-slate-500 mt-2">The leaderboard will update as sales come in</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH className="w-20">Rank</TH>
                      <TH>Sales Person</TH>
                      <TH className="text-right">Sales Count</TH>
                      <TH className="text-right">Total Sales</TH>
                      <TH className="text-right">Average Sale</TH>
                      <TH className="text-right">Last Sale</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {leaderboard.map((oga, index) => {
                      const rank = index + 1;
                      const badge = getRankBadge(rank);
                      const cardStyle = getRankCardStyle(rank);
                      
                      return (
                        <TR key={oga.name} className={`${cardStyle} hover:bg-slate-50/50 transition-colors`}>
                          <TD>
                            <Badge className={`${badge.color} font-bold`}>
                              {badge.icon} {badge.label}
                            </Badge>
                          </TD>
                          <TD>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                                <span className="text-sm font-bold text-white">
                                  {oga.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </span>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{oga.name}</div>
                                {rank <= 3 && (
                                  <div className="text-xs text-slate-500">
                                    {rank === 1 ? "Leading the pack! 🎯" : rank === 2 ? "Great performance! 💪" : "Strong showing! ⭐"}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TD>
                          <TD className="text-right">
                            <div className="font-semibold text-slate-900">{oga.count}</div>
                            <div className="text-xs text-slate-500">sales</div>
                          </TD>
                          <TD className="text-right">
                            <div className="text-lg font-bold text-green-600">₹{oga.total.toLocaleString()}</div>
                          </TD>
                          <TD className="text-right">
                            <div className="font-medium text-slate-700">₹{Math.round(oga.avgSale).toLocaleString()}</div>
                          </TD>
                          <TD className="text-right">
                            <div className="text-sm text-slate-600">
                              {oga.lastSale ? new Date(oga.lastSale).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </div>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competition Insight */}
        {leaderboard.length > 1 && (
          <Card className="mt-6 border border-slate-200/60 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Competition Status</div>
                    <div className="text-xs text-slate-600">Gap between 1st and 2nd place</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">₹{(leaderboard[0].total - leaderboard[1].total).toLocaleString()}</div>
                  <div className="text-xs text-slate-500">{leaderboard[1].name} needs to catch up</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Auto-refresh notice */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Auto-refreshing every 30 seconds • Last updated: {currentTime.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}

