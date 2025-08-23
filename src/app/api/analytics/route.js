import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getTenantContextFromRequest } from '@/lib/mongoTenant';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Helper functions for date filtering
function filterSalesByDate(sales, date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return sales.filter(sale => {
    if (!sale.createdAt) return false;
    const saleDate = new Date(sale.createdAt);
    return saleDate.getFullYear() === y && saleDate.getMonth() === m && saleDate.getDate() === d;
  });
}

function filterSalesByMonth(sales, date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return sales.filter(sale => {
    if (!sale.createdAt) return false;
    const saleDate = new Date(sale.createdAt);
    return saleDate.getFullYear() === y && saleDate.getMonth() === m;
  });
}

function getLastMonthDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date;
}

// Get analytics for team leader
export async function GET(request) {
  const { tenantSubdomain } = await getTenantContextFromRequest(request);
  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('users');
  const sales = db.collection('sales');
  const dailyReports = db.collection('daily_reports');

  // Get all users (excluding team leaders)
  const userFilter = Object.assign({ role: { $ne: 'teamleader' } }, tenantSubdomain ? { tenantSubdomain } : {});
  const allUsers = await users.find(userFilter).toArray();
  const allSales = await sales.find(tenantSubdomain ? { tenantSubdomain } : {}).toArray();

  // Get all daily reports for the current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const reportFilter = {
    date: {
      $gte: firstDayOfMonth.toISOString(),
      $lte: lastDayOfMonth.toISOString(),
    },
    ...(tenantSubdomain ? { tenantSubdomain } : {}),
  };
  const allReports = await dailyReports.find(reportFilter).toArray();

  const today = new Date();
  const lastMonth = getLastMonthDate();

  const analytics = allUsers.map(user => {
    const userSales = allSales.filter(sale => {
      const exactMatch = sale.ogaName === user.name;
      const caseInsensitiveMatch = sale.ogaName.toLowerCase() === user.name.toLowerCase();
      const partialMatch = sale.ogaName.toLowerCase().includes(user.name.toLowerCase()) || 
                         user.name.toLowerCase().includes(sale.ogaName.toLowerCase());
      return exactMatch || caseInsensitiveMatch || partialMatch;
    });
    const todaySales = filterSalesByDate(userSales, today);
    const thisMonthSales = filterSalesByMonth(userSales, today);
    const lastMonthSales = filterSalesByMonth(userSales, lastMonth);

    const todayCollection = todaySales.reduce((sum, sale) => sum + sale.amount, 0);
    const thisMonthCollection = thisMonthSales.reduce((sum, sale) => sum + sale.amount, 0);
    const lastMonthCollection = lastMonthSales.reduce((sum, sale) => sum + sale.amount, 0);

    // Calculate days remaining in the current month (same logic as sales dashboard)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysRemaining = lastDayOfMonth.getDate() - today.getDate();

    // Calculate target achievement
    const target = user.target || 0;
    const achievedTarget = thisMonthCollection;
    const pendingTarget = Math.max(0, target - achievedTarget);

    // Calculate total leads assigned this month from daily reports
    let totalLeads = 0;
    for (const report of allReports) {
      if (Array.isArray(report.salespersons)) {
        const sp = report.salespersons.find(sp => sp.name && sp.name.toLowerCase() === user.name.toLowerCase());
        if (sp && sp.prospects) {
          totalLeads += parseInt(sp.prospects) || 0;
        }
      }
    }

    return {
      _id: user._id,
      name: user.name,
      code: user.code,
      email: user.email,
      target: target,
      achievedTarget: achievedTarget,
      pendingTarget: pendingTarget,
      todayCollection: todayCollection,
      lastMonthCollection: lastMonthCollection,
      daysPending: daysRemaining, // Keeping field name for compatibility, but now represents days remaining
      totalSales: userSales.length,
      todaySales: todaySales.length,
      thisMonthSales: thisMonthSales.length,
      totalLeads: totalLeads,
    };
  });

  return NextResponse.json(analytics);
} 