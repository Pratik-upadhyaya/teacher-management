"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch, fetchDocumentBlobUrl } from "@/lib/api";
import {
  SUBJECT_LABELS,
  LEVEL_LABELS,
  GRADE_LABELS,
  TEACHER_TYPE_LABELS,
  QUALIFICATION_LABELS,
  formatTeacherField,
} from "@/lib/teacherLabels";
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
  | "photo"
  | "teachingLicense"
  | "appointmentLetter"
  | "highestQualificationDocument"
  | "seeSlcCertificate";

type LeaveSummaryRow = {
  leave_type: {
    id: number;
    name: string;
    name_np: string | null;
    annual_quota_days: number;
    is_lifetime: boolean;
  };
  used_days: number;
  remaining_days: number;
  year: number;
};

type LeaveApplicationRow = {
  id: number;
  leave_type: number;
  leave_type_detail: LeaveSummaryRow["leave_type"];
  start_date: string;
  end_date: string;
  days_count: number;
  year: number;
  reason: string;
  // Already a ready-to-use "/media/..." path (unlike the Teacher document
  // fields below, which are raw storage-relative paths) -- can be passed
  // straight to fetchDocumentBlobUrl.
  document: string;
  created_at: string;
};

type LeaveOverview = {
  summary: LeaveSummaryRow[];
  applications: LeaveApplicationRow[];
};

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
  wasDifferentTypeBeforePermanent: boolean | null;
  permanentAppointmentDate: string | null;
  promotionDate: string | null;
  promotionDate2: string | null;
  minQualification: string | null;
  highestQualification: string | null;
  extraordinaryLeave: string | null;
  extraordinaryLeaveRemaining: number | null;
  ageSixtyYear: string | null;

  // Raw storage-relative paths (e.g. "documents/xyz.jpg"), NOT full URLs --
  // this endpoint builds them manually server-side via `.name`, unlike
  // TeacherSerializer elsewhere which emits ready-to-use "/media/..." URLs.
  // Must prefix with "/media/" before handing to fetchDocumentBlobUrl.
  citizenship: string | null;
  degree: string | null;
  photo: string | null;
  teachingLicense: string | null;
  appointmentLetter: string | null;
  highestQualificationDocument: string | null;
  seeSlcCertificate: string | null;

  status: string;
  remarks: string | null;
  created_at: string;
};

const DOC_TYPES: { key: DocKey; label: string }[] = [
  { key: "citizenship", label: "Citizenship / नागरिकता" },
  { key: "degree", label: "Degree Certificate / प्रमाणपत्र" },
  { key: "photo", label: "Passport Size Photo / पासपोर्ट साइजको फोटो" },
  { key: "teachingLicense", label: "Teaching License / शिक्षण अनुमतिपत्र" },
  { key: "appointmentLetter", label: "Appointment Letter / नियुक्तिपत्र" },
  { key: "highestQualificationDocument", label: "Highest Qualification Document / उच्चतम योग्यताको प्रमाणपत्र" },
  { key: "seeSlcCertificate", label: "SEE/SLC Certificate / एसईई/एसएलसी प्रमाणपत्र" },
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
  const [pdfBundleBusy, setPdfBundleBusy] = useState(false);
  const [pdfBundleError, setPdfBundleError] = useState("");

  const [leaveOverview, setLeaveOverview] = useState<LeaveOverview | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveError, setLeaveError] = useState("");
  const [busyLeaveId, setBusyLeaveId] = useState<number | null>(null);

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

  function fetchLeaveOverview() {
    if (!id) return;
    return authFetch(`/api/leaves/teacher/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load holiday records.");
        return res.json();
      })
      .then((data) => {
        setLeaveOverview(data);
        setLeaveError("");
      })
      .catch((err) =>
        setLeaveError(err.message || "Failed to load holiday records.")
      );
  }

  useEffect(() => {
    setLoading(true);
    Promise.resolve(fetchTeacher()).finally(() => setLoading(false));
    setLeaveLoading(true);
    Promise.resolve(fetchLeaveOverview()).finally(() => setLeaveLoading(false));
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

  async function downloadImagesPdf() {
    if (!teacher) return;
    setPdfBundleBusy(true);
    setPdfBundleError("");
    try {
      const res = await authFetch(`/api/documents/teacher/${teacher.id}/pdf/`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not generate the PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${teacher.name || "teacher"}_documents.pdf`.replace(/\s+/g, "_"));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfBundleError(err instanceof Error ? err.message : "Could not generate the PDF.");
    } finally {
      setPdfBundleBusy(false);
    }
  }

  // Leave application documents are already full "/media/..." paths (see
  // LeaveApplicationSerializer), unlike the Teacher document fields above
  // which are raw storage-relative paths needing a manual "/media/" prefix
  // -- so this passes straight through instead of calling `/media/${...}`.
  async function viewLeaveDocument(leaveId: number, mediaPath: string) {
    if (!mediaPath) return;
    setLeaveError("");
    setBusyLeaveId(leaveId);
    try {
      const blobUrl = await fetchDocumentBlobUrl(mediaPath);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      setLeaveError(
        err instanceof Error ? err.message : "Could not load this document."
      );
    } finally {
      setBusyLeaveId(null);
    }
  }

  function formatLeaveDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
                  Token: {teacher.tokenNo || "—"} · {formatTeacherField(SUBJECT_LABELS, teacher.subject)}
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
            <Field label="Level" value={formatTeacherField(LEVEL_LABELS, teacher.level)} />
            <Field label="Grade" value={formatTeacherField(GRADE_LABELS, teacher.grade)} />
            <Field label="Teacher Type" value={formatTeacherField(TEACHER_TYPE_LABELS, teacher.teacherType)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t pt-6 mt-6">
            <Field
              label={
                teacher.teacherType === "permanent" && teacher.wasDifferentTypeBeforePermanent
                  ? "Appointment Date (Original Category)"
                  : "Appointment Date"
              }
              value={teacher.appointmentDate}
            />
            {teacher.teacherType === "permanent" && (
              <Field
                label="Different Type Before Permanent?"
                value={
                  teacher.wasDifferentTypeBeforePermanent === null
                    ? null
                    : teacher.wasDifferentTypeBeforePermanent
                    ? "Yes"
                    : "No, directly appointed Permanent"
                }
              />
            )}
            {teacher.teacherType === "permanent" && teacher.wasDifferentTypeBeforePermanent && (
              <Field label="Appointment Date (as Permanent)" value={teacher.permanentAppointmentDate} />
            )}
            {teacher.teacherType !== "permanent" && (
              <Field label="Promotion Date" value={teacher.promotionDate} />
            )}
            {teacher.teacherType === "permanent" && (teacher.grade === "second" || teacher.grade === "first") && (
              <Field label="Promotion Date (Third → Second)" value={teacher.promotionDate} />
            )}
            {teacher.teacherType === "permanent" && teacher.grade === "first" && (
              <Field label="Promotion Date (Second → First)" value={teacher.promotionDate2} />
            )}
            <Field label="Minimum Qualification" value={formatTeacherField(QUALIFICATION_LABELS, teacher.minQualification)} />
            <Field label="Highest Qualification" value={formatTeacherField(QUALIFICATION_LABELS, teacher.highestQualification)} />
            <Field label="Extraordinary Leave" value={teacher.extraordinaryLeave} />
            <Field
              label="Extraordinary Leave Remaining"
              value={
                teacher.extraordinaryLeaveRemaining !== null && teacher.extraordinaryLeaveRemaining !== undefined
                  ? `${teacher.extraordinaryLeaveRemaining} of 1095 days`
                  : null
              }
            />
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#0f2044]">Documents</h2>
            <button
              onClick={downloadImagesPdf}
              disabled={pdfBundleBusy}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0f2044] border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60 print:hidden"
            >
              <Download size={13} />
              {pdfBundleBusy ? "Preparing..." : "Download Images as PDF"}
            </button>
          </div>
          {pdfBundleError && (
            <p className="text-red-600 text-xs mb-3">{pdfBundleError}</p>
          )}
          <div className="divide-y">
            {DOC_TYPES.filter(
              (d) =>
                d.key !== "highestQualificationDocument" ||
                teacher.highestQualificationDocument ||
                teacher.minQualification !== teacher.highestQualification
            ).map((d) => {
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

        {/* Holidays Card -- read-only: self-reported leave has no in-app
            review step by design, this is visibility only for admins. */}
        <div className="bg-white rounded-2xl shadow p-6 mt-6 print:shadow-none print:border print:border-gray-200 print:mt-4">
          <h2 className="text-lg font-bold text-[#0f2044] mb-4">Holidays</h2>

          {leaveLoading && (
            <p className="text-sm text-gray-400">Loading holiday records…</p>
          )}

          {!leaveLoading && leaveError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 print:hidden">
              {leaveError}
            </div>
          )}

          {!leaveLoading && !leaveError && leaveOverview && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {leaveOverview.summary.map((row) => (
                  <div
                    key={row.leave_type.id}
                    className="bg-[#f7f9fc] rounded-xl p-3 print:border print:border-gray-200"
                  >
                    <p className="text-xs text-gray-500 truncate" title={row.leave_type.name}>
                      {row.leave_type.name}
                    </p>
                    <p className="text-sm font-bold text-[#0f2044] mt-0.5">
                      {row.used_days}{" "}
                      <span className="font-normal text-gray-400">
                        of {row.leave_type.annual_quota_days}
                      </span>
                    </p>
                  </div>
                ))}
              </div>

              {leaveOverview.applications.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No leave applications submitted yet.
                </p>
              ) : (
                <div className="divide-y">
                  {leaveOverview.applications.map((app) => {
                    const busy = busyLeaveId === app.id;
                    return (
                      <div
                        key={app.id}
                        className="py-4 flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {app.leave_type_detail.name}
                            {app.leave_type_detail.name_np && (
                              <span className="text-gray-400 font-normal">
                                {" "}
                                / {app.leave_type_detail.name_np}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatLeaveDate(app.start_date)} – {formatLeaveDate(app.end_date)} ·{" "}
                            {app.days_count} day{app.days_count === 1 ? "" : "s"}
                          </p>
                          {app.reason && (
                            <p className="text-xs text-gray-500 mt-1 truncate" title={app.reason}>
                              {app.reason}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => viewLeaveDocument(app.id, app.document)}
                          disabled={busy}
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-[#0f2044] rounded-lg text-xs font-semibold disabled:opacity-60 transition shrink-0 print:hidden"
                        >
                          <ExternalLink size={13} />
                          {busy ? "Opening…" : "View Document"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
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