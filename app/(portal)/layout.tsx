"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  User,
  LogOut,
  School,
  Menu,
  X,
  CalendarDays,
  ArrowRightLeft,
} from "lucide-react";
import { getAccessToken, logout, authFetch } from "@/lib/api";

const BASE_NAV = [
  { href: "/dashboard", label: "Dashboard", labelNp: "ड्यासबोर्ड", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", labelNp: "कागजातहरू", icon: FileText },
  { href: "/leaves", label: "Holidays", labelNp: "बिदा", icon: CalendarDays },
  { href: "/transfer", label: "Transfer", labelNp: "सरुवा", icon: ArrowRightLeft },
  { href: "/principal", label: "School Info", labelNp: "विद्यालय विवरण", icon: School },
  { href: "/profile", label: "Profile", labelNp: "प्रोफाइल", icon: User },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [teacherName, setTeacherName] = useState("Teacher");
  const [initials, setInitials] = useState("T");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  // Another teacher at the same school (matched by EMIS code) has already
  // submitted School Information -- only one submission per school is
  // needed, so hide the nav item for everyone else. Defaults to shown
  // (undetermined) so the nav doesn't flash empty before this resolves.
  const [hideSchoolInfoNav, setHideSchoolInfoNav] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const name = localStorage.getItem("teacher_name") || "Teacher";
    setTeacherName(name);
    const parts = name.trim().split(" ");
    setInitials(
      parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0]
    );
    setAuthorized(true);

    authFetch("/api/teachers/me/")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.school_info_status === "submitted_by_other") {
          setHideSchoolInfoNav(true);
        }
      })
      .catch(() => {
        // Non-fatal -- worst case the nav item just stays visible.
      });
  }, [router]);

  async function handleLogout() {
    await logout();
    localStorage.removeItem("teacher_name");
    router.push("/login");
  }

  const NAV = BASE_NAV.filter(
    ({ href }) => href !== "/principal" || !hideSchoolInfoNav
  );

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#eaf0fb] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0f2044] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#eaf0fb]">

      {/* Top navbar */}
      <nav className="bg-[#0f2044] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden text-white p-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="bg-white/10 p-2 rounded-lg hidden md:block">
            <div className="w-5 h-5 bg-white rounded-sm" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Teacher Portal / शिक्षक पोर्टल</p>
            <p className="text-white/60 text-xs hidden sm:block">
              Gandaki Pradesh · गण्डकी प्रदेश
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-sm hidden sm:block">
            {teacherName}
          </span>
          <div className="w-9 h-9 bg-blue-400 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
            {initials.toUpperCase()}
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden relative">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-30
            w-56 bg-white border-r border-gray-100
            flex flex-col shrink-0
            transform transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0
          `}
        >
          {/* Close button — mobile only */}
          <div className="flex items-center justify-between px-4 py-3 md:hidden border-b border-gray-100">
            <p className="text-sm font-semibold text-[#0f2044]">Menu / मेनु</p>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400">
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1 pt-4">
            {NAV.map(({ href, label, labelNp, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-[#0f2044] text-white"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <Icon size={16} />
                  <span>
                    {label}
                    <span className={active ? "text-white/60" : "text-gray-400"}>
                      {" "}
                      / {labelNp}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition w-full"
            >
              <LogOut size={16} />
              Logout / लगआउट
            </button>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}