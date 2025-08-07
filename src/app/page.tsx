"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4 sm:p-6">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-6 sm:mb-8 md:mb-12 drop-shadow-2xl leading-tight">
          Welcome to Sales Portal
        </h1>
        
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
          <Link href="/leaderboard" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-4 sm:px-6 md:px-10 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-yellow-400 to-pink-500 text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold shadow-lg hover:scale-105 transition-transform duration-200 active:scale-95">
              🏆 Sales Leaderboard
            </button>
          </Link>
          
          <Link href="/call-leaderboard" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-4 sm:px-6 md:px-10 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-400 to-purple-500 text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold shadow-lg hover:scale-105 transition-transform duration-200 active:scale-95">
              📞 Call Leaderboard
            </button>
          </Link>
          
          <Link href="/combined-leaderboard" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-4 sm:px-6 md:px-10 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold shadow-lg hover:scale-105 transition-transform duration-200 active:scale-95">
              🔄 Combined Leaderboard
            </button>
          </Link>
          
          <Link href="/form" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-4 sm:px-6 md:px-10 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-400 to-purple-500 text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold shadow-lg hover:scale-105 transition-transform duration-200 active:scale-95">
              ➕ Add Sale
            </button>
          </Link>
          
          <Link href="/login" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-4 sm:px-6 md:px-10 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-green-400 to-blue-500 text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold shadow-lg hover:scale-105 transition-transform duration-200 active:scale-95">
              📊 Dashboard
            </button>
          </Link>
          
          <Link href="/login" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-4 sm:px-6 md:px-10 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-400 to-orange-500 text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold shadow-lg hover:scale-105 transition-transform duration-200 active:scale-95">
              👥 Login
            </button>
          </Link>
        </div>
        
        {/* Mobile-friendly description */}
        <p className="mt-6 sm:mt-8 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4">
          Access your sales dashboard, manage team performance, track calls, and view leaderboards all in one place.
        </p>
      </div>
    </div>
  );
}
