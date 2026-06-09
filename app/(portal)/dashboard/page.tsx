"use client";
import { useEffect, useState } from "react";
import { FileText, School, BookOpen, Calendar } from "lucide-react";

export default function DashboardPage() {
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        const token = localStorage.getItem("access");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/teachers/me/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setTeacher(data);
        // Save name so the navbar can show it
        localStorage.setItem("teacher_name", data.name);
      } catch {
        // Token expired — will be handled by layout redirect
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#0f2044] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    {
      label: "School",
      value: teacher?.school?.name ?? "—",
      icon: School,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Subject",
      value: teacher?.subject ?? "—",
      icon: BookOpen,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Documents",
      value: teacher?.document_count ?? "0",
      icon: FileText,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
    {
      label: "Member Since",
      value: teacher?.join_date ?? "—",
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-[#0f2044]">
          Good morning, {teacher?.name?.split(" ")[0] ?? "Teacher"} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {teacher?.school?.name} · {teacher?.school?.district}
        </p>
      </div>

      {/* Status badge */}
      <div className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 py-1.5 text-sm">
        <span
          className={`w-2 h-2 rounded-full ${
            teacher?.status === "ACTIVE" ? "bg-green-500" : "bg-yellow-400"
          }`}
        />
        <span className="text-gray-600 font-medium">
          {teacher?.status === "ACTIVE" ? "Approved by Admin" : "Pending Approval"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4"
          >
            <div className={`${s.bg} ${s.color} p-3 rounded-xl`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                {s.label}
              </p>
              <p className="font-semibold text-gray-800 mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Info table */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#0f2044] mb-4">My Information</h2>
        <div className="divide-y divide-gray-50">
          {[
            ["TSC No.", teacher?.tsc_no],
            ["Position", teacher?.position],
            ["Classes", teacher?.classes],
            ["District", teacher?.school?.district],
            ["Phone", teacher?.phone],
            ["Email", teacher?.email],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between py-2.5 text-sm"
            >
              <span className="text-gray-400">{label}</span>
              <span className="font-medium text-gray-700">{value ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}