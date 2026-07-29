"use client";
import { useEffect, useState } from "react";
import { FileText, School, BookOpen, Calendar } from "lucide-react";
import Link from "next/link";
import { authFetch } from "@/lib/api";
import {
  SUBJECT_LABELS,
  LEVEL_LABELS,
  GRADE_LABELS,
  TEACHER_TYPE_LABELS,
  QUALIFICATION_LABELS,
  formatTeacherField,
} from "@/lib/teacherLabels";

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
  minQualification?: string;
  highestQualification?: string;
  status?: "pending" | "approved" | "rejected";
  created_at?: string;
  citizenship?: string | null;
  degree?: string | null;
  photo?: string | null;
  teachingLicense?: string | null;
  appointmentLetter?: string | null;
  seeSlcCertificate?: string | null;
};

const DOCUMENT_FIELDS: { key: keyof Teacher; label: string }[] = [
  { key: "citizenship", label: "Citizenship / नागरिकता" },
  { key: "degree", label: "Degree / प्रमाणपत्र" },
  { key: "photo", label: "Passport Size Photo / पासपोर्ट साइजको फोटो" },
  { key: "teachingLicense", label: "Teaching License / शिक्षण अनुमतिपत्र" },
  { key: "appointmentLetter", label: "Appointment Letter / नियुक्तिपत्र" },
  { key: "seeSlcCertificate", label: "SEE/SLC Certificate / एसईई/एसएलसी प्रमाणपत्र" },
];

export default function DashboardPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await authFetch("/api/teachers/me/");
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
      label: "School / विद्यालय",
      value: teacher?.schoolName ?? "—",
      icon: School,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Subject / विषय",
      value: formatTeacherField(SUBJECT_LABELS, teacher?.subject),
      icon: BookOpen,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Documents / कागजातहरू",
      value: `${uploadedDocs.length} / ${DOCUMENT_FIELDS.length}`,
      icon: FileText,
      color: "text-orange-500",
      bg: "bg-orange-50",
      href: "/documents",
    },
    {
      label: "Member Since / देखि सदस्य",
      value: memberSince,
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetingNp =
    hour < 12 ? "शुभ प्रभात" : hour < 17 ? "नमस्ते" : "शुभ साँझ";

  const statusLabel =
    teacher?.status === "approved"
      ? "Approved by Admin / प्रशासकद्वारा स्वीकृत"
      : teacher?.status === "rejected"
      ? "Application Rejected / आवेदन अस्वीकृत"
      : "Pending Approval / स्वीकृतिको प्रतीक्षामा";

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
          {greeting}, {teacher?.name?.split(" ")[0] ?? "Teacher"} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {greetingNp} · {teacher?.schoolName} · {teacher?.district}
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
        <h2 className="font-semibold text-[#0f2044] mb-4">
          My Information / मेरो विवरण
        </h2>
        <div className="divide-y divide-gray-50">
          {[
            ["Father's Name / बुबाको नाम", teacher?.fatherName],
            ["Token No. / टोकन नं.", teacher?.tokenNo],
            ["Subject / विषय", formatTeacherField(SUBJECT_LABELS, teacher?.subject)],
            ["Level / तह", formatTeacherField(LEVEL_LABELS, teacher?.level)],
            ["Grade / श्रेणी", formatTeacherField(GRADE_LABELS, teacher?.grade)],
            ["Teacher Type / शिक्षक प्रकार", formatTeacherField(TEACHER_TYPE_LABELS, teacher?.teacherType)],
            ["Minimum Qualification / न्यूनतम योग्यता", formatTeacherField(QUALIFICATION_LABELS, teacher?.minQualification)],
            ["Highest Qualification / उच्चतम योग्यता", formatTeacherField(QUALIFICATION_LABELS, teacher?.highestQualification)],
            ["Appointment Date / नियुक्ती मिति", teacher?.appointmentDate],
            ["Promotion Date / बढुवा मिति", teacher?.promotionDate],
            ["School / विद्यालय", teacher?.schoolName],
            ["District / जिल्ला", teacher?.district],
            ["Municipality / नगरपालिका", teacher?.municipality],
            ["Ward No. / वडा नं.", teacher?.wardNo],
            ["Phone / फोन", teacher?.phone],
            ["Email / इमेल", teacher?.email],
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