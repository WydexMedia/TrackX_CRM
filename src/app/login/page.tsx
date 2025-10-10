"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from 'react-hot-toast';
import Link from "next/link";
import { setupPeriodicTokenValidation } from '@/lib/tokenValidation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCeoSetup, setShowCeoSetup] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<string>("");
  const [showSessionConfirm, setShowSessionConfirm] = useState(false);
  const [blockLogin, setBlockLogin] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<{email: string, password: string} | null>(null);

  // Debug dialog state
  useEffect(() => {
    console.log('Dialog state changed:', showSessionConfirm);
    console.log('Current showSessionConfirm value:', showSessionConfirm);
    console.log('Type of showSessionConfirm:', typeof showSessionConfirm);
  }, [showSessionConfirm]);

  const router = useRouter();

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // If confirmation is visible or login is blocked, ignore submit
    if (showSessionConfirm || blockLogin) {
      console.log('Ignoring submit because confirmation dialog is open');
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        if (res.status === 409) {
          const errorData = await res.json();
          console.log('409 Error received:', errorData);
          if (errorData.code === 'ACTIVE_SESSION_CONFIRMATION_REQUIRED') {
            // Show confirmation dialog
            console.log('Showing session confirmation dialog');
            console.log('Error data:', errorData);
            setPendingLoginData({ email, password });
            setShowSessionConfirm(true);
            setBlockLogin(true);
            setError(errorData.message); // Show the message on screen
            console.log('Dialog state should be true now');
            return;
          } else {
            setError(errorData.message || "Active session detected. Please log out from the other device or contact admin.");
          }
        } else if (res.status === 401) {
          setError("Invalid email or password");
        } else {
          setError("Login failed. Please try again.");
        }
        return;
      }
      const user = await res.json();
      // Broadcast immediate validation to other tabs/devices
      try { localStorage.setItem('tokenRevokedAt', String(Date.now())); } catch {}
      
      // Check if user needs to be redirected to their tenant subdomain
      if (user.needsRedirect && user.redirectTo) {
        console.log('Redirecting user to tenant subdomain:', user.redirectTo);
        // Do not store user on main domain to avoid stale localStorage issues
        window.location.href = user.redirectTo;
        return;
      }
      
      // Store user data and token separately
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", user.token);
      setUser(user);
      
      // If CEO, check if setup is required
      if (user.role === 'CEO') {
        console.log('CEO login detected, checking setup status...');
        try {
          const settingsRes = await fetch('/api/ceo/settings');
          const settings = await settingsRes.json();
          console.log('CEO settings response:', settings);
          const needsSetup = !settings?.portalType;
          console.log('CEO needs setup:', needsSetup);
          if (needsSetup) {
            console.log('Showing CEO setup modal');
            setShowCeoSetup(true);
            return; // pause navigation until setup done
          }
          console.log('CEO setup complete, redirecting to /ceo');
          console.log('CEO setup complete, using window.location redirect');
          window.location.href = '/ceo';
          setIsLoading(false);
          return;
        } catch (error) {
          console.log('CEO settings fetch error:', error);
          router.push('/ceo');
          console.log('CEO error fallback redirect to /ceo');
          setIsLoading(false);
          window.location.href = '/ceo';
          return;
        }
      }

      // Redirect based on role
      if (user.role === 'CEO') {
        console.log('CEO fallback redirect to /ceo');
        window.location.href = '/ceo';
        return;
      }
      if (user.role === 'teamleader') {
        router.push('/team-leader');
      } else if (user.role === 'jl') {
        router.push('/junior-leader');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session confirmation
  const handleSessionConfirm = async (proceed: boolean) => {
    console.log('handleSessionConfirm called with proceed:', proceed);
    console.log('pendingLoginData:', pendingLoginData);
    
    setShowSessionConfirm(false);
    
    if (!proceed || !pendingLoginData) {
      console.log('Not proceeding or no pending login data');
      setPendingLoginData(null);
      return;
    }

    console.log('Proceeding with login confirmation...');
    setIsLoading(true);
    setError("");

    try {
      console.log('Calling /api/users/login-confirm with:', pendingLoginData);
      const res = await fetch("/api/users/login-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingLoginData),
      });

      console.log('Login confirm response status:', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.log('Login confirm error:', errorText);
        setError("Login confirmation failed. Please try again.");
        setPendingLoginData(null);
        return;
      }

      const user = await res.json();
      
      // Check if user needs to be redirected to their tenant subdomain
      if (user.needsRedirect && user.redirectTo) {
        console.log('Redirecting user to tenant subdomain:', user.redirectTo);
        // Do not store user on main domain to avoid stale localStorage issues
        window.location.href = user.redirectTo;
        return;
      }
      
      // Store user data and token separately
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", user.token);
      setUser(user);
      
      // If CEO, check if setup is required
      if (user.role === 'CEO') {
        console.log('CEO login detected, checking setup status...');
        try {
          const settingsRes = await fetch('/api/ceo/settings');
          const settings = await settingsRes.json();
          console.log('CEO settings response:', settings);
          const needsSetup = !settings?.portalType;
          console.log('CEO needs setup:', needsSetup);
          if (needsSetup) {
            console.log('Showing CEO setup modal');
            setShowCeoSetup(true);
            return; // pause navigation until setup done
          }
          console.log('CEO setup complete, redirecting to /ceo');
          console.log('CEO setup complete, using window.location redirect');
          window.location.href = '/ceo';
          return;
        } catch (error) {
          console.log('CEO settings fetch error:', error);
          router.push('/ceo');
          console.log('CEO error fallback redirect to /ceo');
          setIsLoading(false);
          window.location.href = '/ceo';
          return;
        }
      }
      
      if (user.role === 'teamleader') {
        router.push('/team-leader');
      } else if (user.role === 'jl') {
        router.push('/junior-leader');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      setPendingLoginData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCeoSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortal) return;
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      const parts = host.split('.');
      const inferredSub = parts.length > 2 ? parts[0] : '';
      const res = await fetch('/api/ceo/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalType: selectedPortal, subdomain: inferredSub })
      });
      if (res.ok) {
        setShowCeoSetup(false);
        router.push('/ceo');
      }
    } catch {}
  };

  // Load user from localStorage
  useEffect(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const parts = hostname.split('.');
    const hasSubdomain = parts.length > 2 && parts[0] !== 'www';

    const u = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    if (!u) return;
    const userData = JSON.parse(u);
    setUser(userData);

    // If on main domain, do not redirect based on stale localStorage
    if (!hasSubdomain) {
      return;
    }

    // On tenant domain, allow role-based redirect within the tenant
    if (userData.role === 'CEO') {
      window.location.href = '/ceo';
    } else if (userData.role === 'teamleader') {
      router.push('/team-leader');
    } else if (userData.role === 'jl') {
      router.push('/junior-leader');
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  // Show login form only
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 opacity-50">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236b7280' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to TrackX</h1>
          <p className="text-gray-600">Enter your login details to continue</p>
        </div>

        {/* Login Form */}
        <Card className="w-full max-w-md bg-white shadow-xl border-0">
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Please enter email"
                  className="w-full h-12 px-4 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-12 px-4 pr-12 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 h-auto p-1"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122L3 3m6.878 6.878L12 12m0 0l3.878 3.878M12 12L9.878 9.878m8.242 8.242L21 21m-2.878-2.878A9.97 9.97 0 0112 19c-4.478 0-8.268-2.943-9.543-7a10.025 10.025 0 012.132-5.207m0 0A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-2.132 5.207" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                  {error.includes("already logged in") && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Fallback button clicked - confirming login');
                          setShowSessionConfirm(false);
                          setBlockLogin(true);
                          setPendingLoginData({ email, password });
                          // Call confirm flow directly
                          try {
                            const res = await fetch('/api/users/login-confirm', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email, password })
                            });
                            if (!res.ok) {
                              const t = await res.text();
                              console.log('Confirm via fallback failed:', t);
                              setError('Login confirmation failed. Please try again.');
                              setBlockLogin(false);
                              return;
                            }
                            const user = await res.json();
                            // Broadcast to other tabs/devices to validate token now
                            try { localStorage.setItem('tokenRevokedAt', String(Date.now())); } catch {}
                            localStorage.setItem('user', JSON.stringify(user));
                            localStorage.setItem('token', user.token);
                            setUser(user);
                            if (user.needsRedirect && user.redirectTo) {
                              window.location.href = user.redirectTo;
                              return;
                            }
                            if (user.role === 'CEO') router.push('/ceo');
                            else if (user.role === 'teamleader') router.push('/team-leader');
                            else if (user.role === 'jl') router.push('/junior-leader');
                            else router.push('/dashboard');
                          } catch (err) {
                            console.error(err);
                            setError('Login confirmation failed. Please try again.');
                            setBlockLogin(false);
                          }
                        }}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        Continue with logout from other device
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
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
                  'Continue'
                )}
              </Button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary hover:text-primary/90 font-medium">
                  Request Demo
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="relative bg-white border-t border-gray-200 px-4 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 max-w-6xl mx-auto">
          <div className="flex items-center space-x-2 mb-2 sm:mb-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>English</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="#" className="hover:text-gray-700">Help</Link>
            <span>•</span>
            <Link href="#" className="hover:text-gray-700">Terms Of Service</Link>
            <span>•</span>
            <Link href="#" className="hover:text-gray-700">Privacy Policy</Link>
            <span>•</span>
            <Link href="#" className="hover:text-gray-700">Acceptable Use</Link>
          </div>
        </div>
      </div>
    </div>
  );
}