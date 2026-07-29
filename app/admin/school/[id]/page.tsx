"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch } from "@/lib/api";
import TeacherQuotaSummary from "@/components/TeacherQuotaSummary";
import {
  ArrowLeft,
  Check,
  Printer,
  School as SchoolIcon,
  X,
} from "lucide-react";

type SchoolDetail = {
  id: number;
  school_name: string;
  emis_code: string;

  district: string | null;
  municipality: string | null;
  ward_no: string | null;
  address: string;
  contact: string;
  email: string | null;
  established_bs: string;
  permission_date_bs: string | null;

  bal_kaksha: string | null;
  primary_1_5: string | null;
  lower_secondary_6_8: string | null;
  secondary_9_10: string | null;
  secondary_11_12: string | null;

  computer_lab: boolean;
  science_lab: boolean;
  library: boolean;
  book_corner: boolean;
  playground: boolean;
  e_library: boolean;
  smart_board: boolean;

  land_unit_system: string | null;
  land_sqm: number;
  land_ropani: number;
  land_aana: number;
  land_paisa: number;
  land_daan: number;
  land_bigha: number;
  land_kattha: number;
  land_dhur: number;

  building_count: number;
  classroom_count: number;
  female_toilets: number;
  male_toilets: number;

  principalName: string | null;
  reviewedByName: string | null;
  status: string;
  remarks: string | null;
  created_at: string;
  reviewed_at: string | null;

  [key: string]: any; // दरबन्दी level_type columns, read straight by TeacherQuotaSummary
};

// Mirrors the wizard's Step 2 labels (app/(portal)/principal/page.tsx
// SECTIONS) but keyed by the actual School model field names this
// endpoint returns, rather than the wizard's own `${key}_year` payload
// keys.
const SECTIONS: { key: string; label: string; sub: string }[] = [
  { key: "bal_kaksha", label: "Bal Kaksha", sub: "बालकक्षा" },
  { key: "primary_1_5", label: "Primary 1–5", sub: "आधारभूत १-५" },
  { key: "lower_secondary_6_8", label: "Lower Secondary 6–8", sub: "आधारभूत ६-८" },
  { key: "secondary_9_10", label: "Secondary 9–10", sub: "माध्यमिक ९-१०" },
  { key: "secondary_11_12", label: "Secondary 11–12", sub: "माध्यमिक ११-१२" },
];

// Mirrors the wizard's Step 3 FACILITIES list.
const FACILITIES: { key: string; label: string; sub: string }[] = [
  { key: "computer_lab", label: "Computer Lab", sub: "कम्प्युटर प्रयोगशाला" },
  { key: "science_lab", label: "Science Lab", sub: "विज्ञान प्रयोगशाला" },
  { key: "library", label: "Library", sub: "पुस्तकालय" },
  { key: "book_corner", label: "Book Corner", sub: "बुक कर्नर" },
  { key: "playground", label: "Playground", sub: "खेलमैदान" },
  { key: "e_library", label: "E-Library", sub: "ई-पुस्तकालय" },
  { key: "smart_board", label: "Smart Board", sub: "स्मार्ट बोर्ड" },
];

// Mirrors School.land_area_display() on the backend / the wizard's own
// landAreaDisplay() helper -- one printable line for whichever of the
// three measurement systems the principal picked.
function landAreaDisplay(data: SchoolDetail): string {
  if (data.land_unit_system === "metric") {
    return data.land_sqm ? `${data.land_sqm} sq.m. / वर्ग मिटर` : "";
  }
  if (data.land_unit_system === "ropani") {
    if (data.land_ropani || data.land_aana || data.land_paisa || data.land_daan) {
      return `${data.land_ropani || 0}-${data.land_aana || 0}-${data.land_paisa || 0}-${data.land_daan || 0} (Ropani-Aana-Paisa-Daan)`;
    }
    return "";
  }
  if (data.land_unit_system === "bigha") {
    if (data.land_bigha || data.land_kattha || data.land_dhur) {
      return `${data.land_bigha || 0}-${data.land_kattha || 0}-${data.land_dhur || 0} (Bigha-Kattha-Dhur)`;
    }
    return "";
  }
  return "";
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">
        {value === 0 ? "0" : value || "—"}
      </p>
    </div>
  );
}

function YesNo({ label, sub, value }: { label: string; sub: string; value: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400">
        {label} <span className="text-gray-300">/ {sub}</span>
      </p>
      <p className={`text-sm font-medium ${value ? "text-green-700" : "text-gray-400"}`}>
        {value ? "✓ Yes" : "No"}
      </p>
    </div>
  );
}

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");

  function fetchSchool() {
    if (!id) return;
    return authFetch(`/api/schools/${id}/`)
      .then((res) => {
        if (res.status === 403) {
          throw new Error("You don't have permission to view this school.");
        }
        if (res.status === 404) {
          throw new Error("School not found.");
        }
        if (!res.ok) throw new Error("Failed to load school.");
        return res.json();
      })
      .then((data) => {
        setSchool(data);
        setError("");
      })
      .catch((err) => setError(err.message || "Failed to load school."));
  }

  useEffect(() => {
    setLoading(true);
    Promise.resolve(fetchSchool()).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function approveSchool() {
    if (!school) return;
    setReviewError("");
    setReviewBusy(true);
    try {
      const res = await authFetch(`/api/schools/${school.id}/approve/`, { method: "PATCH" });
      if (!res.ok) throw new Error("Approve failed. Please try again.");
      await fetchSchool();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Approve failed.");
    } finally {
      setReviewBusy(false);
    }
  }

  function openRejectModal() {
    setRejectReason("");
    setRejectReasonError("");
    setRejectModalOpen(true);
  }

  function closeRejectModal() {
    setRejectModalOpen(false);
    setRejectReason("");
    setRejectReasonError("");
  }

  async function submitRejectSchool() {
    if (!school) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectReasonError("A rejection reason is required.");
      return;
    }
    setReviewBusy(true);
    try {
      const res = await authFetch(`/api/schools/${school.id}/reject/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Reject failed. Please try again.");
      }
      await fetchSchool();
      closeRejectModal();
    } catch (err) {
      setRejectReasonError(err instanceof Error ? err.message : "Reject failed.");
    } finally {
      setReviewBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef3fb] flex items-center justify-center">
        <p className="text-gray-400">Loading school…</p>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen bg-[#eef3fb] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <p className="text-red-600 font-medium mb-4">
            {error || "School not found."}
          </p>
          <button
            onClick={() => router.push("/admin")}
            className="px-4 py-2 bg-[#0f2044] text-white rounded-lg text-sm font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusColor =
    school.status === "approved"
      ? "bg-green-50 text-green-700"
      : school.status === "rejected"
      ? "bg-red-50 text-red-700"
      : "bg-yellow-50 text-yellow-700";

  const landArea = landAreaDisplay(school);

  return (
    <div className="min-h-screen bg-[#eef3fb] p-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-2 text-[#0f2044] font-semibold text-sm hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#0f2044] hover:bg-[#1a3260] text-white px-4 py-2.5 rounded-xl transition text-sm font-semibold shadow-sm"
          >
            <Printer size={16} />
            Print Summary
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow p-8 mb-6 print:shadow-none print:border print:border-gray-200">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <SchoolIcon size={24} className="text-[#0f2044]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0f2044]">
                  {school.school_name}
                </h1>
                <p className="text-gray-500 text-sm">
                  EMIS: {school.emis_code} · Principal: {school.principalName || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 print:hidden">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase ${statusColor}`}
              >
                {school.status}
              </span>
              <button
                onClick={approveSchool}
                disabled={reviewBusy || school.status === "approved"}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm font-semibold transition"
              >
                <Check size={14} />
                Approve
              </button>
              <button
                onClick={openRejectModal}
                disabled={reviewBusy}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm font-semibold transition"
              >
                Reject
              </button>
            </div>
            <span
              className={`hidden print:inline-block text-xs font-bold px-3 py-1.5 rounded-full uppercase ${statusColor}`}
            >
              {school.status}
            </span>
          </div>

          {reviewError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6 print:hidden">
              {reviewError}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t pt-6">
            <Field label="District" value={school.district} />
            <Field label="Municipality" value={school.municipality} />
            <Field label="Ward No" value={school.ward_no} />
            <Field label="Address" value={school.address} />
            <Field label="Contact" value={school.contact} />
            <Field label="Email" value={school.email} />
            <Field label="Established (BS)" value={school.established_bs} />
            <Field label="Permission Date (BS)" value={school.permission_date_bs} />
            <Field label="Reviewed By" value={school.reviewedByName} />
          </div>

          {/* Class Sections */}
          <div className="border-t pt-6 mt-6">
            <p className="text-sm font-semibold text-[#0f2044] mb-4">
              Class Sections <span className="text-gray-400 font-normal">/ कक्षा स्थापना वर्ष</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {SECTIONS.map((s) => (
                <Field
                  key={s.key}
                  label={`${s.label} / ${s.sub}`}
                  value={school[s.key]}
                />
              ))}
            </div>
          </div>

          {/* Infrastructure */}
          <div className="border-t pt-6 mt-6">
            <p className="text-sm font-semibold text-[#0f2044] mb-4">
              Infrastructure <span className="text-gray-400 font-normal">/ भौतिक पूर्वाधार</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {FACILITIES.map((f) => (
                <YesNo key={f.key} label={f.label} sub={f.sub} value={!!school[f.key]} />
              ))}
              <Field label="Land Area / जग्गा क्षेत्रफल" value={landArea} />
              <Field label="Buildings / भवन संख्या" value={school.building_count} />
              <Field label="Classrooms / कक्षा कोठा" value={school.classroom_count} />
              <Field label="Female Toilets / महिला शौचालय" value={school.female_toilets} />
              <Field label="Male Toilets / पुरुष शौचालय" value={school.male_toilets} />
            </div>
          </div>

          {school.remarks && (
            <div className="border-t pt-6 mt-6">
              <Field label="Remarks" value={school.remarks} />
            </div>
          )}
        </div>

        {/* Teacher Quota Card */}
        <div className="bg-white rounded-2xl shadow p-6 print:shadow-none print:border print:border-gray-200">
          <TeacherQuotaSummary data={school} />
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#0f2044]">
                  Reject {school.school_name}'s Application
                </h3>
                <p className="text-xs text-gray-400">
                  A reason is required so the principal knows what to fix
                </p>
              </div>
              <button
                onClick={closeRejectModal}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Reason for rejection
              </label>
              <textarea
                autoFocus
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectReasonError) setRejectReasonError("");
                }}
                rows={4}
                placeholder="e.g. Missing teacher quota details, please resubmit"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
              />
              {rejectReasonError && (
                <p className="text-red-600 text-xs mt-1.5">{rejectReasonError}</p>
              )}
            </div>

            <button
              onClick={submitRejectSchool}
              disabled={reviewBusy}
              className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60"
            >
              {reviewBusy ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}