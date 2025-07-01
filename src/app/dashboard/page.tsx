"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Sale {
  _id?: string;
  customerName: string;
  amount: number;
  newAdmission: string;
  ogaName: string;
  createdAt?: string;
}

interface User {
  name: string;
  code: string;
  email: string;
}

function getUser() {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
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

function filterSalesByWeek(sales: Sale[], date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - start.getDay());
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return sales.filter(sale => {
    if (!sale.createdAt) return false;
    const saleDate = new Date(sale.createdAt);
    return saleDate >= start && saleDate < end;
  });
}

function filterSalesByMonth(sales: Sale[], date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return sales.filter(sale => {
    if (!sale.createdAt) return false;
    const saleDate = new Date(sale.createdAt);
    return saleDate.getFullYear() === y && saleDate.getMonth() === m;
  });
}

export default function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
    fetch("/api/sales")
      .then(res => res.json())
      .then((data: Sale[]) => setSales(data.filter((s: Sale) => s.ogaName === u.name)));
  }, [router]);

  if (!user) return null;

  const today = new Date();
  const daily = filterSalesByDate(sales, today);
  const weekly = filterSalesByWeek(sales, today);
  const monthly = filterSalesByMonth(sales, today);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 border border-gray-200">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Welcome, {user.name}</h1>
        <div className="text-center text-gray-600 mb-4">Employee Code: {user.code} | Email: {user.email}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-100 rounded-lg p-4 text-center">
            <div className="text-lg font-semibold text-green-700 mb-1">Today's Collection</div>
            <div className="text-3xl font-bold text-green-900">₹{daily.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</div>
            <div className="text-sm text-green-700">{daily.length} sales</div>
          </div>
          <div className="bg-blue-100 rounded-lg p-4 text-center">
            <div className="text-lg font-semibold text-blue-700 mb-1">This Week</div>
            <div className="text-3xl font-bold text-blue-900">₹{weekly.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</div>
            <div className="text-sm text-blue-700">{weekly.length} sales</div>
          </div>
          <div className="bg-purple-100 rounded-lg p-4 text-center">
            <div className="text-lg font-semibold text-purple-700 mb-1">This Month</div>
            <div className="text-3xl font-bold text-purple-900">₹{monthly.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</div>
            <div className="text-sm text-purple-700">{monthly.length} sales</div>
          </div>
        </div>
      </div>
    </div>
  );
}
