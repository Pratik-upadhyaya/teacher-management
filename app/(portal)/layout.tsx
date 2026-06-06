"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  User,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
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

  useEffect(() => {
    // Redirect to login if no token
    const token = localStorage.getItem("access");
    if (!token) {
      router.replace("/login");
      return;
    }

    // Load teacher name from localStorage (we'll save it on login later)
    const name = localStorage.getItem("teacher_name") || "Teacher";
    setTeacherName(name);
    const parts = name.trim().split(" ");
    setInitials(
      parts.length >= 2
        ? parts[0][0] + parts[1][0]
        : parts[0][0]
    );
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("teacher_name");
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#eaf0fb]">

      {/* Top navbar */}
      <nav className="bg-[#0f2044] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <div className="w-5 h-5 bg-white rounded-sm" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Teacher Portal</p>
            <p className="text-white/60 text-xs">
              Gandaki Pradesh · गण्डकी प्रदेश
            </p>
          </div>
        </div>

        {/* Right side — name + avatar */}
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-sm hidden sm:block">
            {teacherName}
          </span>
          <div className="w-9 h-9 bg-blue-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {initials.toUpperCase()}
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
          <nav className="flex-1 p-3 space-y-1 pt-4">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-[#0f2044] text-white"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </a>
              );
            })}
          </nav>

          {/* Logout at bottom */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition w-full"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}