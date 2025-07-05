import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

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
export async function GET() {
  const client = await clientPromise;
  const db = client.db();
  const users = db.collection('users');
  const sales = db.collection('sales');
  
  // Get all users (excluding team leaders)
  const allUsers = await users.find({ role: { $ne: 'teamleader' } }).toArray();
  const allSales = await sales.find({}).toArray();
  
  const today = new Date();
  const lastMonth = getLastMonthDate();
  
  const analytics = allUsers.map(user => {
    const userSales = allSales.filter(sale => sale.ogaName === user.name);
    const todaySales = filterSalesByDate(userSales, today);
    const thisMonthSales = filterSalesByMonth(userSales, today);
    const lastMonthSales = filterSalesByMonth(userSales, lastMonth);
    
    const todayCollection = todaySales.reduce((sum, sale) => sum + sale.amount, 0);
    const thisMonthCollection = thisMonthSales.reduce((sum, sale) => sum + sale.amount, 0);
    const lastMonthCollection = lastMonthSales.reduce((sum, sale) => sum + sale.amount, 0);
    
    // Calculate days pending (days since last sale)
    let daysPending = 0;
    if (userSales.length > 0) {
      const lastSale = userSales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      const lastSaleDate = new Date(lastSale.createdAt);
      const daysDiff = Math.floor((today - lastSaleDate) / (1000 * 60 * 60 * 24));
      daysPending = daysDiff;
    }
    
    // Calculate target achievement
    const target = user.target || 0;
    const achievedTarget = thisMonthCollection;
    const pendingTarget = Math.max(0, target - achievedTarget);
    
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
      daysPending: daysPending,
      totalSales: userSales.length,
      todaySales: todaySales.length,
      thisMonthSales: thisMonthSales.length
    };
  });
  
  return NextResponse.json(analytics);
} 