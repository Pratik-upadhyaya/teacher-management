"use client";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { setTokens } from "@/lib/api";

// ── Validation ─────────────────────────────────────────────────────────────

interface LoginErrors {
  email?: string;
  password?: string;
}
//validaiton updates w.r.t, user profile.

function validateLogin(email: string, password: string): LoginErrors {
  const errs: LoginErrors = {};

  if (!email.trim()) {
    errs.email = "इमेल ठेगाना आवश्यक छ। (Email is required)";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errs.email = "मान्य इमेल ठेगाना प्रविष्ट गर्नुहोस्। (Enter a valid email)";
  }

  if (!password) {
    errs.password = "पासवर्ड आवश्यक छ। (Password is required)";
  } else if (password.length < 6) {
    errs.password = "पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्छ। (Min 6 characters)";
  }

  return errs;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear field error as user types
  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value);
    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");

    const errs = validateLogin(email, password);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

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

      if (!res.ok) throw new Error("इमेल वा पासवर्ड गलत छ। (Invalid email or password)");

      const data = await res.json();
      setTokens(data.access, data.refresh);
      localStorage.setItem("user_role", data.role || "teacher");

      const meRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/teachers/me/`,
        { headers: { Authorization: `Bearer ${data.access}` } }
      );
      if (meRes.ok) {
        const me = await meRes.json();
        localStorage.setItem("teacher_name", me.name);
      }

      if (data.role === "admin" || data.role === "sub-admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Shared input class — red border when field has error
  const inputBase =
    "w-full border rounded-lg pr-4 py-2.5 text-sm focus:outline-none transition";
  const fieldClass = (hasError: boolean) =>
    `${inputBase} ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400"
        : "border-gray-200 focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044]"
    }`;

  return (
    <div className="min-h-screen bg-[#eaf0fb] flex flex-col">

      {/* Top navbar — official gov branding (full letterhead) */}
      <nav className="bg-[#0f2044] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://giwmscdnone.gov.np/static/assets/image/Emblem_of_Nepal.png"
            alt="Government of Nepal"
            className="h-16 w-16 object-contain flex-shrink-0"
          />
          <div className="leading-snug">
            <p className="text-white font-semibold text-sm sm:text-base">
              नेपाल सरकार
            </p>
            <p className="text-white/90 font-medium text-sm sm:text-base">
              शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय
            </p>
            <p className="text-white font-bold text-lg sm:text-xl">
              शिक्षा विकास तथा समन्वय इकाइ
            </p>
            <p className="text-white/60 text-xs sm:text-sm">
              पोखरा-०१, भिमकाली पाटन, कास्की, नेपाल
            </p>
          </div>
        </div>
        <button className="text-white/80 text-sm border border-white/20 px-3 py-1 rounded-lg hover:bg-white/10 transition self-start">
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

          {/* API error banner */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {apiError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

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
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="teacher@shree.edu.np"
                  className={`${fieldClass(!!errors.email)} pl-9`}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
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
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••••"
                  className={`${fieldClass(!!errors.password)} pl-9`}
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
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
            <p className="text-center text-sm text-gray-400 mt-2">
              No account?{" "}
              <a href="/register" className="text-[#2563eb] hover:underline font-medium">
                Register as a Teacher →
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}