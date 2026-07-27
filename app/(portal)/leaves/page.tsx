"use client";
import { useEffect, useState, useRef } from "react";
import {
  CalendarDays,
  Plus,
  X,
  Upload,
  AlertCircle,
  FileText,
  ExternalLink,
  Download,
} from "lucide-react";
import { authFetch, fetchDocumentBlobUrl } from "@/lib/api";
import {
  ACCEPTED_DOCUMENT_TYPES,
  FileTooLargeError,
  UnsupportedFileTypeError,
  prepareDocumentFile,
} from "@/lib/documentUpload";
import NepaliNumberInput from "@/components/NepaliNumberInput";
import { adToBs, bsToAd, todayBs, isCompleteBsDate } from "@/lib/bsDate";

type LeaveType = {
  id: number;
  name: string;
  name_np: string | null;
  annual_quota_days: number;
  is_lifetime: boolean;
};

type SummaryRow = {
  leave_type: LeaveType;
  used_days: number;
  remaining_days: number;
  year: number;
};

type LeaveApplication = {
  id: number;
  leave_type: number;
  leave_type_detail: LeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  year: number;
  reason: string;
  document: string;
  created_at: string;
};

// Leave applications may only report dates from 1 Chaitra 2082 BS onward,
// up to 6 years after that. Kept in sync with backend/leaves/views.py's
// MIN_LEAVE_DATE / MAX_LEAVE_DATE -- the backend does its day-counting and
// range validation in AD (Gregorian), so these stay the source of truth
// for comparisons/submission. Everything the user actually sees or types
// is BS -- see lib/bsDate.ts for the conversion layer.
const MIN_LEAVE_DATE = "2026-03-15"; // 1 Chaitra 2082 BS
const MAX_LEAVE_DATE = "2032-03-15"; // MIN_LEAVE_DATE + 6 years
const MIN_LEAVE_DATE_BS = adToBs(MIN_LEAVE_DATE)!; // २०८२/१२/०१
const MAX_LEAVE_DATE_BS = adToBs(MAX_LEAVE_DATE)!; // २०८८/१२/०१

// Displays an AD ISO date (as returned by the backend) as a BS date in
// Nepali digits -- the only date format shown anywhere on this page.
function formatDate(iso: string) {
  return adToBs(iso) ?? iso;
}

// Explicitly picking a default date (rather than leaving the field empty)
// avoids an empty/ambiguous starting point. Clamped in AD against the
// backend's real range, then converted to BS for display -- the teacher
// only ever sees the BS result.
function defaultLeaveDate() {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const clamped = todayIso < MIN_LEAVE_DATE ? MIN_LEAVE_DATE : todayIso > MAX_LEAVE_DATE ? MAX_LEAVE_DATE : todayIso;
  return adToBs(clamped) ?? todayBs();
}

export default function LeavesPage() {
  const currentYear = new Date().getFullYear();

  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preparingFile, setPreparingFile] = useState(false);
  const [formError, setFormError] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewIsPdf, setPreviewIsPdf] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [summaryRes, appsRes] = await Promise.all([
        authFetch(`/api/leaves/summary/?year=${currentYear}`),
        authFetch("/api/leaves/mine/"),
      ]);
      if (!summaryRes.ok || !appsRes.ok) throw new Error();
      setSummary(await summaryRes.json());
      setApplications(await appsRes.json());
      setError("");
    } catch {
      setError("Failed to load your holiday records. / बिदा रेकर्ड लोड गर्न सकिएन।");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setFormError("");
    setLeaveTypeId(summary[0]?.leave_type.id ?? "");
    const initial = defaultLeaveDate();
    setStartDate(initial);
    setEndDate(initial);
    setReason("");
    setFile(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleFileSelected(selected: File | undefined) {
    if (!selected) return;
    setFormError("");
    setPreparingFile(true);
    try {
      const ready = await prepareDocumentFile(selected);
      setFile(ready);
    } catch (err) {
      if (err instanceof UnsupportedFileTypeError || err instanceof FileTooLargeError) {
        setFormError(err.message);
      } else {
        setFormError("Couldn't process that file. Please try a different one.");
      }
    } finally {
      setPreparingFile(false);
    }
  }

  const startDateAd = startDate ? bsToAd(startDate) : null;
  const endDateAd = endDate ? bsToAd(endDate) : null;

  const selectedDays =
    startDateAd && endDateAd
      ? Math.max(
          Math.round(
            (new Date(endDateAd + "T00:00:00").getTime() -
              new Date(startDateAd + "T00:00:00").getTime()) /
              86400000
          ) + 1,
          0
        )
      : 0;

  const selectedSummary = summary.find((s) => s.leave_type.id === leaveTypeId);
  const overQuota =
    !!selectedSummary && selectedDays > 0 && selectedDays > selectedSummary.remaining_days;

  async function handleSubmit() {
    setFormError("");

    if (!leaveTypeId) {
      setFormError("Please select a leave type. / कृपया बिदाको प्रकार छान्नुहोस्।");
      return;
    }
    if (!startDate || !endDate || !isCompleteBsDate(startDate) || !isCompleteBsDate(endDate)) {
      setFormError("Please provide both a start and end date. / कृपया सुरु र अन्त्य मिति दुवै दिनुहोस्।");
      return;
    }
    const startAd = bsToAd(startDate);
    const endAd = bsToAd(endDate);
    if (!startAd || !endAd) {
      setFormError("That doesn't look like a valid date. / यो मिति मान्य देखिँदैन।");
      return;
    }
    if (endAd < startAd) {
      setFormError("End date cannot be before start date. / अन्त्य मिति सुरु मितिभन्दा पहिले हुन सक्दैन।");
      return;
    }
    if (startAd < MIN_LEAVE_DATE || endAd < MIN_LEAVE_DATE) {
      setFormError(`Leave dates must be on or after ${MIN_LEAVE_DATE_BS}. / बिदाको मिति ${MIN_LEAVE_DATE_BS} वा पछिको हुनुपर्छ।`);
      return;
    }
    if (startAd > MAX_LEAVE_DATE || endAd > MAX_LEAVE_DATE) {
      setFormError(`Leave dates must be on or before ${MAX_LEAVE_DATE_BS}. / बिदाको मिति ${MAX_LEAVE_DATE_BS} वा पहिलेको हुनुपर्छ।`);
      return;
    }
    if (!file) {
      setFormError("A ward-stamped supporting document is required. / वडाको छाप लागेको कागजात आवश्यक छ।");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("leave_type", String(leaveTypeId));
      fd.append("start_date", startAd);
      fd.append("end_date", endAd);
      fd.append("reason", reason);
      fd.append("document", file);

      const res = await authFetch("/api/leaves/mine/", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Submission failed.");
      }
      await fetchAll();
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDocument(title: string, path: string) {
    setPreviewOpen(true);
    setPreviewTitle(title);
    setPreviewIsPdf(path.toLowerCase().endsWith(".pdf"));
    setPreviewError("");
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const blobUrl = await fetchDocumentBlobUrl(path);
      setPreviewUrl(blobUrl);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Could not load this document.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewOpen(false);
    setPreviewUrl(null);
    setPreviewTitle("");
    setPreviewError("");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2044]">Holidays / बिदा</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Leave taken in {currentYear} / {currentYear} मा लिइएको बिदा
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#0f2044] hover:bg-[#16305f] px-4 py-2.5 rounded-lg transition shrink-0 self-start sm:self-auto"
        >
          <Plus size={15} />
          Apply for Leave / बिदाको लागि आवेदन
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 text-[#0f2044] text-sm rounded-lg px-4 py-3 flex gap-2">
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <span>
          This is a self-reported record of leave already taken. Upload the document stamped
          by your ward as proof — that stamp is the approval; there's no further review here.
          <br />
          <span className="text-[#0f2044]/70">
            यो पहिले नै लिइएको बिदाको स्व-रिपोर्ट गरिएको रेकर्ड हो। तपाईंको वडाबाट छाप लागेको कागजात प्रमाणको रूपमा अपलोड गर्नुहोस् — त्यो छाप नै स्वीकृति हो; यहाँ थप समीक्षा हुँदैन।
          </span>
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Quota summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {summary.map((row) => {
            const quota = row.leave_type.annual_quota_days;
            const pct = quota > 0 ? Math.min((row.used_days / quota) * 100, 100) : 0;
            const isFull = row.remaining_days <= 0;
            return (
              <div
                key={row.leave_type.id}
                className="bg-white rounded-xl border border-gray-100 p-4"
              >
                <p className="text-sm font-medium text-gray-800">
                  {row.leave_type.name}
                  {row.leave_type.name_np && (
                    <span className="text-gray-400 font-normal"> / {row.leave_type.name_np}</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {row.leave_type.is_lifetime
                    ? `${row.used_days} of ${quota} days used since registration / दर्ता भएदेखि ${row.used_days}/${quota} दिन प्रयोग भयो`
                    : `${row.used_days} of ${quota} days used / ${row.used_days}/${quota} दिन प्रयोग भयो`}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isFull ? "bg-amber-500" : "bg-[#0f2044]"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-2">
          Application History / आवेदन इतिहास
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-8 text-center text-sm text-gray-400">
            No holidays applied for yet. / अहिलेसम्म कुनै बिदाको आवेदन गरिएको छैन।
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {applications.map((app) => (
              <div key={app.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <CalendarDays size={16} className="text-[#0f2044]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {app.leave_type_detail.name}
                      {app.leave_type_detail.name_np && (
                        <span className="text-gray-400 font-normal"> / {app.leave_type_detail.name_np}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {formatDate(app.start_date)} – {formatDate(app.end_date)} · {app.days_count} day
                      {app.days_count !== 1 ? "s" : ""}
                      {app.reason ? ` · ${app.reason}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openDocument(`${app.leave_type_detail.name} — ${formatDate(app.start_date)}`, app.document)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#0f2044] bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg transition shrink-0 self-end sm:self-auto"
                >
                  <FileText size={13} />
                  Document / कागजात
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#0f2044]">
                Apply for Leave / बिदाको लागि आवेदन
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Leave Type / बिदाको प्रकार
                </label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2044]"
                >
                  {summary.map((row) => (
                    <option key={row.leave_type.id} value={row.leave_type.id}>
                      {row.leave_type.name} ({row.remaining_days} of {row.leave_type.annual_quota_days} days left)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">
                    Start Date (BS) / सुरु मिति
                  </label>
                  <NepaliNumberInput
                    value={startDate}
                    onChange={setStartDate}
                    mode="date"
                    placeholder={MIN_LEAVE_DATE_BS}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2044]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">
                    End Date (BS) / अन्त्य मिति
                  </label>
                  <NepaliNumberInput
                    value={endDate}
                    onChange={setEndDate}
                    mode="date"
                    placeholder={MIN_LEAVE_DATE_BS}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2044]"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Only dates from {formatDate(MIN_LEAVE_DATE)} onward can be reported. / {formatDate(MIN_LEAVE_DATE)} पछिको मिति मात्र रिपोर्ट गर्न सकिन्छ।
              </p>

              {selectedDays > 0 && (
                <p className="text-xs text-gray-400">
                  {selectedDays} day{selectedDays !== 1 ? "s" : ""} selected
                </p>
              )}

              {overQuota && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg px-3 py-2 flex gap-2">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>
                    This exceeds your remaining {selectedSummary?.remaining_days} day
                    {selectedSummary?.remaining_days !== 1 ? "s" : ""} for this leave type. You can
                    still submit — this is just a heads-up.
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Reason (optional) / कारण (वैकल्पिक)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f2044] resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Ward-Stamped Document / वडाको छाप लागेको कागजात
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_DOCUMENT_TYPES}
                  className="hidden"
                  onChange={(e) => handleFileSelected(e.target.files?.[0])}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={preparingFile}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0f2044] bg-gray-50 hover:bg-gray-100 px-3 py-2.5 rounded-lg transition disabled:opacity-50"
                >
                  <Upload size={13} />
                  {preparingFile
                    ? "Preparing… / तयार गर्दै…"
                    : file
                    ? `Selected: ${file.name}`
                    : "Upload document / कागजात अपलोड गर्नुहोस्"}
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || preparingFile}
                className="w-full text-sm font-semibold text-white bg-[#0f2044] hover:bg-[#16305f] px-4 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {submitting ? "Submitting… / पेश हुँदैछ…" : "Submit / पेश गर्नुहोस्"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-[#0f2044]">{previewTitle}</h3>
                <p className="text-xs text-gray-400">Supporting Document</p>
              </div>
              <div className="flex items-center gap-3">
                {previewUrl && (
                  <a
                    href={previewUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#0f2044] bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg transition"
                  >
                    <Download size={13} />
                    Download
                  </a>
                )}
                <button
                  onClick={closePreview}
                  className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 bg-gray-50 overflow-auto flex justify-center items-center">
              {previewLoading ? (
                <p className="text-sm text-gray-400">Loading document…</p>
              ) : previewError ? (
                <p className="text-sm text-red-600">{previewError}</p>
              ) : previewUrl && previewIsPdf ? (
                <iframe src={previewUrl} className="w-full h-full rounded-xl border-0 bg-white" title={previewTitle} />
              ) : previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-sm"
                  alt={previewTitle}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}