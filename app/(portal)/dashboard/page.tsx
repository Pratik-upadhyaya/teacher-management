"use client";
import { useEffect, useState } from "react";
import { FileText, School, BookOpen, Calendar } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

type Teacher = {
  name?: string;
  fatherName?: string;
  phone?: string;
  email?: string;
  district?: string;
  municipality?: string;
  wardNo?: string;
  schoolName?: string;
  tokenNo?: string;
  subject?: string;
  level?: string;
  grade?: string;
  teacherType?: string;
  appointmentDate?: string;
  promotionDate?: string;
  qualification?: string;
  status?: "pending" | "approved" | "rejected";
  created_at?: string;
  citizenship?: string | null;
  degree?: string | null;
  transcript?: string | null;
  teachingLicense?: string | null;
  appointmentLetter?: string | null;
};

const DOCUMENT_FIELDS: { key: keyof Teacher; label: string }[] = [
  { key: "citizenship", label: "Citizenship" },
  { key: "degree", label: "Degree" },
  { key: "transcript", label: "Transcript" },
  { key: "teachingLicense", label: "Teaching License" },
  { key: "appointmentLetter", label: "Appointment Letter" },
];

export default function DashboardPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        const token = localStorage.getItem("access");
        const res = await fetch(`${API_BASE_URL}/api/teachers/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setTeacher(data);
        if (data.name) localStorage.setItem("teacher_name", data.name);
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

  const uploadedDocs = DOCUMENT_FIELDS.filter((d) => !!teacher?.[d.key]);

  const memberSince = teacher?.created_at
    ? new Date(teacher.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })
    : "—";

  const stats = [
    {
      label: "School",
      value: teacher?.schoolName ?? "—",
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
      value: `${uploadedDocs.length} / ${DOCUMENT_FIELDS.length}`,
      icon: FileText,
      color: "text-orange-500",
      bg: "bg-orange-50",
      href: "/documents",
    },
    {
      label: "Member Since",
      value: memberSince,
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const statusLabel =
    teacher?.status === "approved"
      ? "Approved by Admin"
      : teacher?.status === "rejected"
      ? "Application Rejected"
      : "Pending Approval";

  const statusColor =
    teacher?.status === "approved"
      ? "bg-green-500"
      : teacher?.status === "rejected"
      ? "bg-red-500"
      : "bg-yellow-400";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-[#0f2044]">
          Good morning, {teacher?.name?.split(" ")[0] ?? "Teacher"} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {teacher?.schoolName} · {teacher?.district}
        </p>
      </div>

      {/* Status badge */}
      <div className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 py-1.5 text-sm">
        <span className={`w-2 h-2 rounded-full ${statusColor}`} />
        <span className="text-gray-600 font-medium">{statusLabel}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((s) => {
          const CardInner = (
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 h-full hover:border-[#0f2044]/20 transition">
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
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {CardInner}
            </Link>
          ) : (
            <div key={s.label}>{CardInner}</div>
          );
        })}
      </div>

      {/* Info table */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-[#0f2044] mb-4">My Information</h2>
        <div className="divide-y divide-gray-50">
          {[
            ["Father's Name", teacher?.fatherName],
            ["Token No.", teacher?.tokenNo],
            ["Subject", teacher?.subject],
            ["Level", teacher?.level],
            ["Grade", teacher?.grade],
            ["Teacher Type", teacher?.teacherType],
            ["Qualification", teacher?.qualification],
            ["Appointment Date", teacher?.appointmentDate],
            ["Promotion Date", teacher?.promotionDate],
            ["School", teacher?.schoolName],
            ["District", teacher?.district],
            ["Municipality", teacher?.municipality],
            ["Ward No.", teacher?.wardNo],
            ["Phone", teacher?.phone],
            ["Email", teacher?.email],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2.5 text-sm">
              <span className="text-gray-400">{label}</span>
              <span className="font-medium text-gray-700">{value ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}