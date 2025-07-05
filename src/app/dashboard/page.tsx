"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from 'react-hot-toast';
import Link from "next/link";

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
  role?: string;
  target?: number;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ customerName: string; amount: number; newAdmission: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    
    // Redirect team leaders to their dashboard
    if (u.role === 'teamleader') {
      router.push("/team-leader");
      return;
    }
    
    // Fetch current user data from database to get updated target
    fetch(`/api/users/current?code=${u.code}`)
      .then(res => res.json())
      .then(userData => {
        if (userData.success) {
          // Update localStorage with fresh data
          const updatedUser = { ...u, ...userData.user };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);
        } else {
          setUser(u);
        }
      })
      .catch(() => {
        setUser(u);
      });
    
    fetch("/api/sales")
      .then(res => res.json())
      .then((data: Sale[]) => setSales(data.filter((s: Sale) => s.ogaName === u.name)));
  }, [router]);

  if (!user) return null;

  const today = new Date();
  const daily = filterSalesByDate(sales, today);
  const weekly = filterSalesByWeek(sales, today);
  const monthly = filterSalesByMonth(sales, today);
  const target = user.target || 300000;

  // Calculate days pending in the current month
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysPending = lastDayOfMonth.getDate() - today.getDate();

  const achievedTarget = monthly.reduce((sum, s) => sum + s.amount, 0);
  const pendingTarget = Math.max(0, target - achievedTarget);
  const todayCollection = daily.reduce((sum, s) => sum + s.amount, 0);

  // Calculate previous month
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthSales = filterSalesByMonth(sales, prevMonthDate);
  const lastMonthAchieved = lastMonthSales.reduce((sum, s) => sum + s.amount, 0);

  // Show last month collection only if it's not the first month
  const showLastMonth = today.getMonth() > 0 || today.getFullYear() > (sales[0]?.createdAt ? new Date(sales[0].createdAt).getFullYear() : 0);

  // Edit/delete handlers
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sale?')) return;
    try {
      await fetch(`/api/sales?id=${id}`, { method: 'DELETE' });
      toast.success('Sale deleted successfully');
      // Refresh sales
      fetch("/api/sales")
        .then(res => res.json())
        .then(data => setSales(data.filter((s: any) => s.ogaName === user.name)));
    } catch (error) {
      toast.error('Failed to delete sale');
    }
  };

  const handleEdit = (sale: any) => {
    setEditingId(sale._id);
    setEditData({
      customerName: sale.customerName,
      amount: sale.amount,
      newAdmission: sale.newAdmission,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editData) return;
    try {
      await fetch(`/api/sales`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editingId, ...editData }),
      });
      toast.success('Sale updated successfully');
      setEditingId(null);
      setEditData(null);
      // Refresh sales
      fetch("/api/sales")
        .then(res => res.json())
        .then(data => setSales(data.filter((s: any) => s.ogaName === user.name)));
    } catch (error) {
      toast.error('Failed to update sale');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-6">
      <Toaster position="top-center" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
                Welcome back, {user.name}
              </h1>
              <div className="flex flex-wrap gap-4 text-slate-600">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-4 0V5a2 2 0 014 0v1" />
                  </svg>
                  {user.code}
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Target Card - Emerald to Teal */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-xl p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-emerald-100 text-lg font-medium mb-1">Target</h3>
            <p className="text-3xl font-bold">₹{target.toLocaleString()}</p>
          </div>

          {/* Achieved Target Card - Purple to Pink */}
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-xl p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
            <h3 className="text-purple-100 text-lg font-medium mb-1">Achieved Target</h3>
            <p className="text-3xl font-bold">₹{achievedTarget > 0 ? achievedTarget.toLocaleString() : "0"}</p>
          </div>

          {/* Pending Target Card - Blue to Indigo */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-xl p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-blue-100 text-lg font-medium mb-1">Pending Target</h3>
            <p className="text-3xl font-bold">₹{pendingTarget > 0 ? pendingTarget.toLocaleString() : "0"}</p>
          </div>

          {/* Today's Collection Card - Orange to Red */}
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-xl p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-orange-100 text-sm font-medium">{daily.length} sales</span>
            </div>
            <h3 className="text-orange-100 text-lg font-medium mb-1">Today's Collection</h3>
            <p className="text-3xl font-bold">₹{todayCollection > 0 ? todayCollection.toLocaleString() : "0"}</p>
          </div>

          {/* Last Month Collection Card - Cyan to Blue */}
          {showLastMonth && (
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 rounded-xl p-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-cyan-100 text-lg font-medium mb-1">Last Month Collection</h3>
              <p className="text-3xl font-bold">
                ₹{today.getDate() === 1 ? lastMonthAchieved.toLocaleString() : "0"}
              </p>
            </div>
          )}

          {/* Days Pending Card - Violet to Purple */}
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-xl p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <h3 className="text-violet-100 text-lg font-medium mb-1">Days Pending</h3>
            <p className="text-3xl font-bold">{daysPending >= 0 ? daysPending : 0} Days</p>
          </div>
        </div>

        {/* Add Sale Button */}
        <div className="flex justify-end mt-3">
          <Link href="/form">
            <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Sale
            </button>
          </Link>
        </div>

        {/* Sales Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl mt-5 shadow-xl border border-white/50 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              All Sales Records
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">New Admission</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sales.map((sale: any, index) => (
                  <tr key={sale._id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{sale.customerName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-green-600">₹{sale.amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sale.newAdmission === 'Yes' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sale.newAdmission}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-500">
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(sale)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(sale._id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editingId && editData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Edit Sale</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={editData.customerName}
                    onChange={(e) => setEditData({...editData, customerName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    required
                    value={editData.amount}
                    onChange={(e) => setEditData({...editData, amount: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Admission</label>
                  <select
                    value={editData.newAdmission}
                    onChange={(e) => setEditData({...editData, newAdmission: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    Update Sale
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditData(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
