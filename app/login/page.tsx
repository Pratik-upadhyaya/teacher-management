"use client";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/token/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );

    if (!res.ok) throw new Error("Invalid email or password.");

    const data = await res.json();
localStorage.setItem("access", data.access);
localStorage.setItem("refresh", data.refresh);

// Fetch teacher profile to save name for navbar
const meRes = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/teachers/me/`,
  { headers: { Authorization: `Bearer ${data.access}` } }
);
if (meRes.ok) {
  const me = await meRes.json();
  localStorage.setItem("teacher_name", me.name);
}

if (data.role === "admin") {
  window.location.href = "/admin";
} else {
  window.location.href = "/dashboard";
}
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen bg-[#eaf0fb] flex flex-col">

      {/* Top navbar */}
      <nav className="bg-[#0f2044] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <div className="w-5 h-5 bg-white rounded-sm" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Education Office</p>
            <p className="text-white/60 text-xs">
              Gandaki Pradesh · गण्डकी प्रदेश
            </p>
          </div>
        </div>
        <button className="text-white/80 text-sm border border-white/20 px-3 py-1 rounded-lg hover:bg-white/10 transition">
          NP / EN
        </button>
      </nav>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm w-full max-w-md p-6 sm:p-8">

          {/* Lock icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-[#eaf0fb] p-4 rounded-2xl">
              <Lock size={28} className="text-[#0f2044]" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[#0f2044]">
              Sign in to your account
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              आफ्नो खातामा प्रवेश गर्नुहोस्
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address{" "}
                <span className="text-gray-400 font-normal">/ इमेल ठेगाना</span>
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@shree.edu.np"
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password{" "}
                <span className="text-gray-400 font-normal">/ पासवर्ड</span>
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
                />
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-[#0f2044]"
                />
                Remember me
              </label>
              <a href="#" className="text-sm text-[#2563eb] hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f2044] hover:bg-[#1a3260] text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign In / प्रवेश गर्नुहोस्"}
            </button>

            <p className="text-center text-sm text-gray-400">
            Are you a principal?{" "}
            <a href="/principal" className="text-[#2563eb] hover:underline font-medium">
            Fill School Information →
            </a>
            </p>
            {/* Register link */}
            <p className="text-center text-sm text-gray-400 mt-2">
              No account?{" "}
              <a href="/register" className="text-[#2563eb] hover:underline font-medium">
                Register as Teacher →
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}