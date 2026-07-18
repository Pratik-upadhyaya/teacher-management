"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch, fetchDocumentBlobUrl } from "@/lib/api";
import {
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  FileText,
  Printer,
  User,
  X,
} from "lucide-react";

type DocKey =
  | "citizenship"
  | "degree"
  | "transcript"
  | "teachingLicense"
  | "appointmentLetter";

type TeacherDetail = {
  id: number;
  name: string;
  fatherName: string;
  dob: string;
  phone: string;
  email: string;
  permanentAddress: string;
  permanentWardNo: string;

  district: string | null;
  municipality: string | null;
  wardNo: string | null;
  schoolName: string | null;
  schoolEmisCode: string | null;
  school: { id: number; school_name: string; emis_code: string } | null;
  tokenNo: string | null;
  subject: string | null;
  level: string | null;
  grade: string | null;
  teacherType: string | null;

  appointmentDate: string | null;
  promotionDate: string | null;
  qualification: string | null;
  extraordinaryLeave: string | null;
  accumulatedLeave: string | null;
  ageSixtyYear: string | null;

  // Raw storage-relative paths (e.g. "documents/xyz.jpg"), NOT full URLs --
  // this endpoint builds them manually server-side via `.name`, unlike
  // TeacherSerializer elsewhere which emits ready-to-use "/media/..." URLs.
  // Must prefix with "/media/" before handing to fetchDocumentBlobUrl.
  citizenship: string | null;
  degree: string | null;
  transcript: string | null;
  teachingLicense: string | null;
  appointmentLetter: string | null;

  status: string;
  remarks: string | null;
  created_at: string;
};

const DOC_TYPES: { key: DocKey; label: string }[] = [
  { key: "citizenship", label: "Citizenship / नागरिकता" },
  { key: "degree", label: "Degree Certificate / प्रमाणपत्र" },
  { key: "transcript", label: "Transcript / अंकतालिका" },
  { key: "teachingLicense", label: "Teaching License / शिक्षण अनुमतिपत्र" },
  { key: "appointmentLetter", label: "Appointment Letter / नियुक्तिपत्र" },
];

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
    </div>
  );
}

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyDocKey, setBusyDocKey] = useState<DocKey | null>(null);
  const [docError, setDocError] = useState("");

  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");

  function fetchTeacher() {
    if (!id) return;
    return authFetch(`/api/teacher/${id}/`)
      .then((res) => {
        if (res.status === 403) {
          throw new Error("You don't have permission to view this teacher.");
        }
        if (res.status === 404) {
          throw new Error("Teacher not found.");
        }
        if (!res.ok) throw new Error("Failed to load teacher.");
        return res.json();
      })
      .then((data) => {
        setTeacher(data);
        setError("");
      })
      .catch((err) => setError(err.message || "Failed to load teacher."));
  }

  useEffect(() => {
    setLoading(true);
    Promise.resolve(fetchTeacher()).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function approveTeacher() {
    if (!teacher) return;
    setReviewError("");
    setReviewBusy(true);
    try {
      const res = await authFetch(`/api/${teacher.id}/approve/`, { method: "PATCH" });
      if (!res.ok) throw new Error("Approve failed. Please try again.");
      await fetchTeacher();
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

  async function submitRejectTeacher() {
    if (!teacher) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectReasonError("A rejection reason is required.");
      return;
    }
    setReviewBusy(true);
    try {
      const res = await authFetch(`/api/${teacher.id}/reject/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Reject failed. Please try again.");
      }
      await fetchTeacher();
      closeRejectModal();
    } catch (err) {
      setRejectReasonError(err instanceof Error ? err.message : "Reject failed.");
    } finally {
      setReviewBusy(false);
    }
  }

  // Opens the document in a new tab using the browser's native
  // viewer -- lets the admin/sub-admin print directly via Ctrl+P
  // without needing custom print layout for PDFs vs images.
  async function viewDocument(key: DocKey, rawPath: string | null) {
    if (!rawPath) return;
    setDocError("");
    setBusyDocKey(key);
    try {
      const blobUrl = await fetchDocumentBlobUrl(`/media/${rawPath}`);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      // Give the new tab a moment to actually load the blob before
      // potentially revoking it on navigation elsewhere.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      setDocError(
        err instanceof Error ? err.message : "Could not load this document."
      );
    } finally {
      setBusyDocKey(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef3fb] flex items-center justify-center">
        <p className="text-gray-400">Loading teacher…</p>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen bg-[#eef3fb] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <p className="text-red-600 font-medium mb-4">
            {error || "Teacher not found."}
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
    teacher.status === "approved"
      ? "bg-green-50 text-green-700"
      : teacher.status === "rejected"
      ? "bg-red-50 text-red-700"
      : "bg-yellow-50 text-yellow-700";

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

        {docError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4 print:hidden">
            {docError}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow p-8 mb-6 print:shadow-none print:border print:border-gray-200">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <User size={24} className="text-[#0f2044]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0f2044]">
                  {teacher.name}
                </h1>
                <p className="text-gray-500 text-sm">
                  Token: {teacher.tokenNo || "—"} · {teacher.subject || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 print:hidden">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase ${statusColor}`}
              >
                {teacher.status}
              </span>
              <button
                onClick={approveTeacher}
                disabled={reviewBusy || teacher.status === "approved"}
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
              {teacher.status}
            </span>
          </div>

          {reviewError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6 print:hidden">
              {reviewError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t pt-6">
            <Field label="Father's Name" value={teacher.fatherName} />
            <Field label="Date of Birth" value={teacher.dob} />
            <Field label="Phone" value={teacher.phone} />
            <Field label="Email" value={teacher.email} />
            <Field
              label="Permanent Address"
              value={
                teacher.permanentAddress
                  ? `${teacher.permanentAddress}${
                      teacher.permanentWardNo ? `, Ward ${teacher.permanentWardNo}` : ""
                    }`
                  : null
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t pt-6 mt-6">
            <Field label="District" value={teacher.district} />
            <Field label="Municipality" value={teacher.municipality} />
            <Field label="School Ward No" value={teacher.wardNo} />
            <Field label="School Name" value={teacher.schoolName} />
            <Field label="School EMIS Code" value={teacher.schoolEmisCode} />
            <div>
              <p className="text-xs text-gray-400">School Record</p>
              {teacher.school ? (
                <p className="text-sm font-medium text-green-700">
                  ✓ Matched — {teacher.school.school_name}
                </p>
              ) : (
                <p className="text-sm font-medium text-amber-600">
                  ⚠ No matching school found
                </p>
              )}
            </div>
            <Field label="Level" value={teacher.level} />
            <Field label="Grade" value={teacher.grade} />
            <Field label="Teacher Type" value={teacher.teacherType} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t pt-6 mt-6">
            <Field label="Appointment Date" value={teacher.appointmentDate} />
            <Field label="Promotion Date" value={teacher.promotionDate} />
            <Field label="Qualification" value={teacher.qualification} />
            <Field label="Extraordinary Leave" value={teacher.extraordinaryLeave} />
            <Field label="Accumulated Leave" value={teacher.accumulatedLeave} />
            <Field label="Age 60 Year" value={teacher.ageSixtyYear} />
          </div>

          {teacher.remarks && (
            <div className="border-t pt-6 mt-6">
              <Field label="Remarks" value={teacher.remarks} />
            </div>
          )}
        </div>

        {/* Documents Card */}
        <div className="bg-white rounded-2xl shadow p-6 print:shadow-none print:border print:border-gray-200">
          <h2 className="text-lg font-bold text-[#0f2044] mb-4">Documents</h2>
          <div className="divide-y">
            {DOC_TYPES.map((d) => {
              const rawPath = teacher[d.key];
              const busy = busyDocKey === d.key;
              return (
                <div
                  key={d.key}
                  className="py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        rawPath ? "bg-blue-50" : "bg-gray-50"
                      }`}
                    >
                      <FileText
                        size={16}
                        className={rawPath ? "text-[#0f2044]" : "text-gray-300"}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {d.label}
                      </p>
                      <p className="text-xs text-gray-400">
                        {rawPath ? "Uploaded" : "Not uploaded"}
                      </p>
                    </div>
                  </div>

                  {rawPath && (
                    <button
                      onClick={() => viewDocument(d.key, rawPath)}
                      disabled={busy}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-[#0f2044] rounded-lg text-xs font-semibold disabled:opacity-60 transition print:hidden"
                    >
                      <ExternalLink size={13} />
                      {busy ? "Opening…" : "View"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#0f2044]">
                  Reject {teacher.name}'s Application
                </h3>
                <p className="text-xs text-gray-400">
                  A reason is required so the teacher knows what to fix
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
                placeholder="e.g. Missing teaching license, please resubmit application"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
              />
              {rejectReasonError && (
                <p className="text-red-600 text-xs mt-1.5">{rejectReasonError}</p>
              )}
            </div>

            <button
              onClick={submitRejectTeacher}
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