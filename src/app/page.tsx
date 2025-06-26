"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <h1 className="text-5xl md:text-7xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-12 drop-shadow-2xl">
        Welcome to Sales Portal
      </h1>
      <div className="flex flex-col md:flex-row gap-8">
        <Link href="/leaderboard">
          <button className="px-10 py-6 rounded-2xl bg-gradient-to-r from-yellow-400 to-pink-500 text-white text-3xl font-bold shadow-lg hover:scale-105 transition-transform">
            🏆 View Leaderboard
          </button>
        </Link>
        <Link href="/form">
          <button className="px-10 py-6 rounded-2xl bg-gradient-to-r from-blue-400 to-purple-500 text-white text-3xl font-bold shadow-lg hover:scale-105 transition-transform">
            ➕ Add Sale
          </button>
        </Link>
      </div>
    </div>
  );
}
