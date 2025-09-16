"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, Users, Monitor, X, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [killingSession, setKillingSession] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const adminAuth = sessionStorage.getItem("admin-auth");
    if (adminAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Simple password check - you can make this more secure
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";
      
      if (password === adminPassword) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin-auth", "true");
        setError("");
      } else {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin-auth");
    router.push("/admin");
  };

  const fetchActiveSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await fetch('/api/admin/sessions');
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
      } else {
        console.error('Failed to fetch sessions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const killSession = async (userId: string) => {
    setKillingSession(userId);
    try {
      const response = await fetch('/api/admin/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (data.success) {
        // Refresh sessions list
        await fetchActiveSessions();
      } else {
        console.error('Failed to revoke user tokens:', data.error);
      }
    } catch (error) {
      console.error('Error revoking user tokens:', error);
    } finally {
      setKillingSession(null);
    }
  };

  const killAllSessions = async () => {
    if (!confirm('Are you sure you want to revoke ALL user tokens? This will log out all users.')) {
      return;
    }
    
    setLoadingSessions(true);
    try {
      const response = await fetch('/api/admin/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ killAll: true })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Successfully killed ${data.killedCount} sessions`);
        await fetchActiveSessions();
      } else {
        console.error('Failed to kill all sessions:', data.error);
      }
    } catch (error) {
      console.error('Error killing all sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const toggleSessionsView = () => {
    setShowSessions(!showSessions);
    if (!showSessions) {
      fetchActiveSessions();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
              <p className="text-gray-600 mt-2">Enter password to access admin panel</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                    placeholder="Enter password"
                    required
                  />
                  <Lock className="w-5 h-5  text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-100 text-red-800 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? "Authenticating..." : "Access Admin Panel"}
              </button>
            </form>

            <div className="mt-6 text-center">
              
              <p className="text-xs text-gray-400 mt-2">
                Change this in your environment variables
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
                <p className="text-sm text-gray-500">Tenant Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSessionsView}
                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {showSessions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showSessions ? 'Hide Users' : 'View User Tokens'}
              </button>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* User Token Management Panel */}
      {showSessions && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">User Token Management</h2>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {sessions.length} users
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchActiveSessions}
                  disabled={loadingSessions}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                
                {sessions.length > 0 && (
                  <button
                    onClick={killAllSessions}
                    disabled={loadingSessions}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Revoke All Tokens
                  </button>
                )}
              </div>
            </div>

            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading sessions...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Monitor className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No active sessions found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">User</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Role</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Tenant</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">User ID</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Last Login</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sessions.map((session) => (
                        <tr key={session.userId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">{session.userName}</div>
                              <div className="text-gray-500">{session.userEmail}</div>
                              <div className="text-xs text-gray-400">Code: {session.userCode}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              session.userRole === 'CEO' ? 'bg-purple-100 text-purple-800' :
                              session.userRole === 'teamleader' ? 'bg-blue-100 text-blue-800' :
                              session.userRole === 'jl' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {session.userRole}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {session.tenantSubdomain}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                              {session.userId.substring(0, 8)}...
                            </code>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              session.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {session.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {session.lastLogin !== 'Unknown' ? new Date(session.lastLogin).toLocaleString() : 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => killSession(session.userId)}
                              disabled={killingSession === session.userId}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="Revoke all tokens for this user"
                            >
                              {killingSession === session.userId ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <X className="w-3 h-3" />
                              )}
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Content */}
      <main>{children}</main>
    </div>
  );
}
