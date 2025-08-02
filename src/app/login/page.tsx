"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from 'react-hot-toast';
import Link from "next/link";

function filterSalesByDate(sales: any[], date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return sales.filter(sale => {
    if (!sale.createdAt) return false;
    const saleDate = new Date(sale.createdAt);
    return saleDate.getFullYear() === y && saleDate.getMonth() === m && saleDate.getDate() === d;
  });
}

function filterSalesByWeek(sales: any[], date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return sales.filter(sale => {
    if (!sale.createdAt) return false;
    const saleDate = new Date(sale.createdAt);
    return saleDate >= start && saleDate < end;
  });
}

function filterSalesByMonth(sales: any[], date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return sales.filter(sale => {
    if (!sale.createdAt) return false;
    const saleDate = new Date(sale.createdAt);
    return saleDate.getFullYear() === y && saleDate.getMonth() === m;
  });
}

export default function LoginAndDashboard() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ customerName: string; amount: number; newAdmission: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      });
      if (!res.ok) {
        setError("Invalid employee code or password");
        return;
      }
      const user = await res.json();
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      
      // Redirect based on role
      if (user.role === 'teamleader') {
        router.push('/team-leader');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load user from localStorage
  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    if (u) {
      const userData = JSON.parse(u);
      setUser(userData);
      
      // Redirect based on role if user is already logged in
      if (userData.role === 'teamleader') {
        router.push('/team-leader');
      } else {
        router.push('/dashboard');
      }
    }
  }, [router]);

  // Fetch sales for user
  useEffect(() => {
    if (!user) return;
    fetch("/api/sales")
      .then(res => res.json())
      .then(data => setSales(data.filter((s: any) => s.ogaName === user.name)));
  }, [user]);

  if (!user) {
    // Show login form
    return (
      <div className="login-bg">
        <div className="pattern-overlay"></div>

        <form
          onSubmit={handleLogin}
          className="relative w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/70">Sign in to your account</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-white/90 font-medium mb-2">Employee Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your employee code"
                className="modern-input"
              />
            </div>

         <div>
  <label className="block text-white/90 font-medium mb-2">Password</label>
  <div className="relative">
    <input
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Enter your password"
      className="modern-input pr-10"
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-0 flex items-center pr-3"
    >
      {showPassword ? (
        /* Eye Slash (Hide Password) */
        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122L3 3m6.878 6.878L12 12m0 0l3.878 3.878M12 12L9.878 9.878m8.242 8.242L21 21m-2.878-2.878A9.97 9.97 0 0112 19c-4.478 0-8.268-2.943-9.543-7a10.025 10.025 0 012.132-5.207m0 0A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-2.132 5.207" />
        </svg>
      ) : (
        /* Eye (Show Password) */
        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  </div>
</div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all duration-200 ${
                isLoading
                  ? 'bg-gradient-to-r from-blue-400 to-purple-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02]'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        <style jsx>{`
          .login-bg {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%);
            padding: 1rem;
            position: relative;
          }
          .pattern-overlay {
            position: absolute;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            opacity: 0.3;
          }
          .modern-input {
            width: 100%;
            padding: 1rem 1.25rem;
            border-radius: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 1rem;
            outline: none;
            transition: all 0.3s ease;
            color: white;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
          }
          .modern-input:focus {
            border: 1px solid rgba(99, 102, 241, 0.8);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            background: rgba(255, 255, 255, 0.15);
          }
          .modern-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
        `}</style>
      </div>
    );
  }

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setCode("");
    setPassword("");
  };

  // Show dashboard only
  const today = new Date();
  const daily = filterSalesByDate(sales, today);
  const monthly = filterSalesByMonth(sales, today);
  const target = 300000;

  // Calculate days pending in the current month
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
const daysPending = lastDayOfMonth.getDate() - today.getDate();


  const achievedTarget = monthly.reduce((sum, s) => sum + s.amount, 0);
  const pendingTarget = target - achievedTarget;
  const todayCollection = daily.reduce((sum, s) => sum + s.amount, 0);

  // Calculate previous month
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthSales = filterSalesByMonth(sales, prevMonthDate);
  const lastMonthAchieved = lastMonthSales.reduce((sum, s) => sum + s.amount, 0);

  // Show last month collection only if it's not the first month (optional)
  const showLastMonth = today.getMonth() > 0 || today.getFullYear() > sales[0]?.createdAt?.getFullYear();

  // Edit/delete handlers
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sale?')) return;
    await fetch(`/api/sales?id=${id}`, { method: 'DELETE' });
    // Refresh sales
    fetch("/api/sales")
      .then(res => res.json())
      .then(data => setSales(data.filter((s: any) => s.ogaName === user.name)));
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
    await fetch(`/api/sales`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: editingId, ...editData }),
    });
    setEditingId(null);
    setEditData(null);
    // Refresh sales
    fetch("/api/sales")
      .then(res => res.json())
      .then(data => setSales(data.filter((s: any) => s.ogaName === user.name)));
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
            <p className="text-3xl font-bold">₹{300000 .toLocaleString()}</p>
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

          {/* Additional Card - Amber to Yellow */}
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
                      {editingId === sale._id ? (
                        <input
                          className="table-input bg-gray-800 text-white"
                          value={editData?.customerName || ''}
                          onChange={e => setEditData({ ...editData!, customerName: e.target.value })}
                        />
                      ) : (
                        <span className="font-medium text-slate-900">{sale.customerName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === sale._id ? (
                        <input
                          className="table-input bg-gray-800 text-white"
                          type="number"
                          value={editData?.amount || ''}
                          onChange={e => setEditData({ ...editData!, amount: Number(e.target.value) })}
                        />
                      ) : (
                        <span className="font-semibold text-emerald-600">₹{sale.amount.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === sale._id ? (
                        <select
                          className="table-input bg-gray-800 text-white"
                          value={editData?.newAdmission || ''}
                          onChange={e => setEditData({ ...editData!, newAdmission: e.target.value })}
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${sale.newAdmission === 'yes'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-800'
                          }`}>
                          {sale.newAdmission === 'yes' ? 'Yes' : 'No'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : ''}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {editingId === sale._id ? (
                          <>
                            <button
                              onClick={handleEditSubmit}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Save"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditData(null); }}
                              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Cancel"
                              type="button"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEdit(sale)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(sale._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .table-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s ease;
          background: white;
        }
        .table-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .table-input.bg-gray-800 {
          background: #1f2937 !important; /* Tailwind gray-800 */
          color: #fff !important;
          border: 1.5px solid #6366f1;
        }
        .table-input.bg-gray-800:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
      `}</style>
    </div>
  );
}