"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRightLeft,
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
import { DISTRICTS } from "@/lib/districts";

type TransferRequest = {
  id: number;
  old_school_name: string;
  old_school_emis_code: string;
  old_district: string;
  old_municipality: string;
  old_ward_no: string;
  new_school_name: string;
  new_school_emis_code: string;
  new_school_address: string;
  new_district: string;
  new_municipality: string;
  new_ward_no: string;
  transfer_document: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  review_note: string;
};

type TeacherMe = {
  schoolName: string;
  schoolEmisCode: string;
  district: string;
  municipality: string;
  wardNo: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending / विचाराधीन",
  approved: "Approved / स्वीकृत",
  rejected: "Rejected / अस्वीकृत",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TransferPage() {
  const [teacher, setTeacher] = useState<TeacherMe | null>(null);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preparingFile, setPreparingFile] = useState(false);
  const [formError, setFormError] = useState("");

  const [district, setDistrict] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [wardNo, setWardNo] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmisCode, setSchoolEmisCode] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const pendingRequest = requests.find((r) => r.status === "pending");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [teacherRes, requestsRes] = await Promise.all([
        authFetch("/api/teachers/me/"),
        authFetch("/api/transfers/requests/mine/"),
      ]);
      if (!teacherRes.ok || !requestsRes.ok) {
        throw new Error("Failed to load transfer information.");
      }
      setTeacher(await teacherRes.json());
      setRequests(await requestsRes.json());
    } catch {
      setError("Could not load your transfer information. Please try again. / जानकारी लोड गर्न सकिएन।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function resetForm() {
    setDistrict("");
    setMunicipality("");
    setWardNo("");
    setSchoolName("");
    setSchoolEmisCode("");
    setSchoolAddress("");
    setReason("");
    setFile(null);
    setFormError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFormError("");
    setPreparingFile(true);
    try {
      const prepared = await prepareDocumentFile(selected);
      setFile(prepared);
    } catch (err) {
      if (err instanceof UnsupportedFileTypeError || err instanceof FileTooLargeError) {
        setFormError(err.message);
      } else {
        setFormError("Could not process this file. Please try another.");
      }
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setPreparingFile(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!district || !municipality || !wardNo.trim() || !schoolName.trim() || !schoolEmisCode.trim()) {
      setFormError("Please fill in all of the new school's details. / कृपया सबै विवरण भर्नुहोस्।");
      return;
    }
    if (!file) {
      setFormError("Please attach your transfer document. / कृपया सरुवा कागजात संलग्न गर्नुहोस्।");
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("new_district", district);
      body.append("new_municipality", municipality);
      body.append("new_ward_no", wardNo.trim());
      body.append("new_school_name", schoolName.trim());
      body.append("new_school_emis_code", schoolEmisCode.trim());
      body.append("new_school_address", schoolAddress.trim());
      body.append("reason", reason.trim());
      body.append("transfer_document", file);

      const res = await authFetch("/api/transfers/requests/mine/", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit transfer request.");
      }

      setModalOpen(false);
      resetForm();
      await loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to submit transfer request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function openPreview(path: string, title: string) {
    setPreviewOpen(true);
    setPreviewTitle(title);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewUrl(null);
    try {
      const url = await fetchDocumentBlobUrl(path);
      setPreviewUrl(url);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Could not load document.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewOpen(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewError("");
  }

  const municipalities = district ? DISTRICTS[district]?.municipalities ?? [] : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-blue-600" />
            School Transfer / विद्यालय सरुवा
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Apply to transfer to a new school. Your application is reviewed and verified before it takes effect.
            <br />
            नयाँ विद्यालयमा सरुवाको लागि निवेदन दिनुहोस्। स्वीकृति नभएसम्म परिवर्तन लागू हुँदैन।
          </p>
        </div>
        {!pendingRequest && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Apply for Transfer
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading... / लोड हुँदैछ...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      ) : (
        <>
          {teacher && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-medium text-gray-500 mb-3">
                Current School / हालको विद्यालय
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-400 text-xs mb-1">School / विद्यालय</div>
                  <div className="text-gray-900 font-medium">{teacher.schoolName || "—"}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">EMIS Code</div>
                  <div className="text-gray-900 font-medium">{teacher.schoolEmisCode || "—"}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">District / जिल्ला</div>
                  <div className="text-gray-900 font-medium">{teacher.district || "—"}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1">Municipality / नगरपालिका</div>
                  <div className="text-gray-900 font-medium">{teacher.municipality || "—"}</div>
                </div>
              </div>
            </div>
          )}

          {pendingRequest && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3 text-sm text-amber-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                You have a pending transfer request to <strong>{pendingRequest.new_school_name}</strong>{" "}
                awaiting review. You can't submit another until it's reviewed.
                <br />
                तपाईंको सरुवा निवेदन विचाराधीन छ। स्वीकृति नआएसम्म अर्को निवेदन दिन सकिँदैन।
              </div>
            </div>
          )}

          <h2 className="text-sm font-medium text-gray-500 mb-3">
            Transfer History / सरुवा इतिहास
          </h2>
          {requests.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              No transfer requests yet. / अहिलेसम्म कुनै सरुवा निवेदन छैन।
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">
                        {r.old_school_name || "—"} → <span className="font-medium text-gray-900">{r.new_school_name}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Applied {formatDateTime(r.requested_at)}
                        {r.reviewed_at && ` · Reviewed ${formatDateTime(r.reviewed_at)}`}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[r.status]}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  {r.status === "rejected" && r.review_note && (
                    <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      Reason: {r.review_note}
                    </div>
                  )}
                  <button
                    onClick={() => openPreview(r.transfer_document, "Transfer Document")}
                    className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <FileText className="w-4 h-4" />
                    View transfer document
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Apply modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900">Apply for Transfer / सरुवा निवेदन</h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New District / नयाँ जिल्ला
                </label>
                <select
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setMunicipality("");
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select district</option>
                  {Object.entries(DISTRICTS).map(([key, d]) => (
                    <option key={key} value={key}>
                      {d.en} / {d.np}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Municipality / नयाँ नगरपालिका
                </label>
                <select
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  disabled={!district}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                >
                  <option value="">Select municipality</option>
                  {municipalities.map((m) => (
                    <option key={m.en} value={m.en}>
                      {m.en} / {m.np}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ward No. / वडा नं.
                </label>
                <input
                  type="text"
                  value={wardNo}
                  onChange={(e) => setWardNo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New School Name / नयाँ विद्यालयको नाम
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New School EMIS Code
                </label>
                <input
                  type="text"
                  value={schoolEmisCode}
                  onChange={(e) => setSchoolEmisCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New School Address / ठेगाना (optional)
                </label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason / कारण (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transfer Document / सरुवा कागजात
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_DOCUMENT_TYPES}
                  onChange={handleFileChange}
                  className="w-full text-sm"
                />
                {preparingFile && (
                  <p className="text-xs text-gray-400 mt-1">Preparing file...</p>
                )}
                {file && !preparingFile && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> {file.name}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || preparingFile}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Document preview modal */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">{previewTitle}</h3>
              <div className="flex items-center gap-3">
                {previewUrl && (
                  <>
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <a href={previewUrl} download className="text-gray-400 hover:text-gray-600">
                      <Download className="w-4 h-4" />
                    </a>
                  </>
                )}
                <button onClick={closePreview} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center min-h-[300px]">
              {previewLoading ? (
                <span className="text-sm text-gray-400">Loading...</span>
              ) : previewError ? (
                <span className="text-sm text-red-500">{previewError}</span>
              ) : previewUrl ? (
                <iframe src={previewUrl} className="w-full h-[70vh]" />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}