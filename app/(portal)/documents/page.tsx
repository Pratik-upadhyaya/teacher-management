"use client";
import { useEffect, useState, useRef } from "react";
import { FileText, ExternalLink, Upload, X, Download, Clock, AlertCircle } from "lucide-react";
import { authFetch, fetchDocumentBlobUrl } from "@/lib/api";
import {
  ACCEPTED_DOCUMENT_TYPES,
  FileTooLargeError,
  UnsupportedFileTypeError,
  prepareDocumentFile,
} from "@/lib/documentUpload";

type DocKey =
  | "citizenship"
  | "degree"
  | "photo"
  | "teachingLicense"
  | "appointmentLetter";

type Teacher = Record<DocKey, string | null> & { [key: string]: any };

type ChangeRequest = {
  id: number;
  document_type: DocKey;
  file: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  review_note: string;
};

const DOC_TYPES: { key: DocKey; label: string }[] = [
  { key: "citizenship", label: "Citizenship / नागरिकता" },
  { key: "degree", label: "Degree Certificate / प्रमाणपत्र" },
  { key: "photo", label: "Passport Size Photo / पासपोर्ट साइजको फोटो" },
  { key: "teachingLicense", label: "Teaching License / शिक्षण अनुमतिपत्र" },
  { key: "appointmentLetter", label: "Appointment Letter / नियुक्तिपत्र" },
];

export default function DocumentsPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingKey, setUploadingKey] = useState<DocKey | null>(null);
  const [preparingKey, setPreparingKey] = useState<DocKey | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [previewIsPdf, setPreviewIsPdf] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [meRes, reqRes] = await Promise.all([
        authFetch("/api/teachers/me/"),
        authFetch("/api/documents/change-requests/mine/"),
      ]);
      if (!meRes.ok) throw new Error();
      setTeacher(await meRes.json());
      setRequests(reqRes.ok ? await reqRes.json() : []);
      setError("");
    } catch {
      setError("Failed to load your documents. / कागजातहरू लोड गर्न सकिएन।");
    } finally {
      setLoading(false);
    }
  }

  // Most recent request for a given document slot (backend returns newest
  // first), so a rejected/approved history doesn't hide a newer pending one.
  function latestRequestFor(key: DocKey): ChangeRequest | undefined {
    return requests.find((r) => r.document_type === key);
  }

  async function handleFileSelected(key: DocKey, file: File | undefined) {
    if (!file) return;

    setPreparingKey(key);
    setError("");
    let ready: File;
    try {
      ready = await prepareDocumentFile(file);
    } catch (err) {
      if (err instanceof UnsupportedFileTypeError) {
        setError(err.message);
      } else if (err instanceof FileTooLargeError) {
        setError(err.message);
      } else {
        setError("Couldn't process that file. Please try a different one.");
      }
      setPreparingKey(null);
      return;
    }
    setPreparingKey(null);

    setUploadingKey(key);
    try {
      const fd = new FormData();
      fd.append("document_type", key);
      fd.append("file", ready);
      const res = await authFetch("/api/documents/change-requests/mine/", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error();
      // Refresh both teacher (unchanged until approved) and request list
      // (so the new "Pending review" badge shows up immediately).
      await fetchAll();
    } catch {
      setError("Upload failed. Please try again. / अपलोड असफल भयो, फेरि प्रयास गर्नुहोस्।");
    } finally {
      setUploadingKey(null);
    }
  }

  async function openDocument(label: string, path?: string | null) {
    if (!path) return;
    setPreviewOpen(true);
    setPreviewTitle(label);
    setPreviewIsPdf(path.toLowerCase().endsWith(".pdf"));
    setPreviewError("");
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      // Raw storage-relative path (e.g. "documents/xyz.jpg") from teacher_me,
      // same as the admin teacher detail page's Teacher type -- needs the
      // "/media/" prefix before handing to fetchDocumentBlobUrl, or it
      // resolves to a malformed URL.
      const blobUrl = await fetchDocumentBlobUrl(`/media/${path}`);
      setPreviewUrl(blobUrl);
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Could not load this document."
      );
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

  const uploadedCount = teacher
    ? DOC_TYPES.filter((d) => !!teacher[d.key]).length
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0f2044]">
          Documents / कागजातहरू
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {uploadedCount} of {DOC_TYPES.length} documents on file · {uploadedCount} मध्ये {DOC_TYPES.length} कागजात दर्ता भएको
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 text-[#0f2044] text-sm rounded-lg px-4 py-3 flex gap-2">
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <span>
          Uploading a new or replacement document sends it for admin/sub-admin
          review. It only becomes your official document once approved.
          <br />
          <span className="text-[#0f2044]/70">
            नयाँ वा प्रतिस्थापन कागजात अपलोड गरेपछि प्रशासकबाट समीक्षा हुनेछ। स्वीकृत भएपछि मात्र यो तपाईंको आधिकारिक कागजात हुनेछ।
          </span>
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {DOC_TYPES.map((d) => {
            const url = teacher?.[d.key];
            const isUploading = uploadingKey === d.key;
            const isPreparing = preparingKey === d.key;
            const latest = latestRequestFor(d.key);
            const isPending = latest?.status === "pending";
            const isRejected = latest?.status === "rejected";

            return (
              <div key={d.key} className="px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        url ? "bg-blue-50" : "bg-gray-50"
                      }`}
                    >
                      <FileText
                        size={16}
                        className={url ? "text-[#0f2044]" : "text-gray-300"}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {d.label}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        {url ? "Uploaded / अपलोड भयो" : "Not uploaded / अपलोड भएको छैन"}
                        {isPending && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-amber-600 font-medium">
                            <Clock size={11} /> Pending review / समीक्षामा
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {url && (
                      <button
                        onClick={() => openDocument(d.label, url)}
                        className="p-2 text-gray-400 hover:text-[#0f2044] rounded-lg hover:bg-blue-50 transition"
                        title="View current document"
                      >
                        <ExternalLink size={15} />
                      </button>
                    )}

                    <input
                      ref={(el) => {
                        fileRefs.current[d.key] = el;
                      }}
                      type="file"
                      accept={ACCEPTED_DOCUMENT_TYPES}
                      className="hidden"
                      onChange={(e) =>
                        handleFileSelected(d.key, e.target.files?.[0])
                      }
                    />
                    <button
                      onClick={() => fileRefs.current[d.key]?.click()}
                      disabled={isUploading || isPreparing}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#0f2044] bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg transition disabled:opacity-50"
                    >
                      <Upload size={13} />
                      {isPreparing
                        ? "Preparing… / तयार गर्दै…"
                        : isUploading
                        ? "Uploading… / अपलोड हुँदै…"
                        : isPending
                        ? "Replace pending upload / प्रतिस्थापन गर्नुहोस्"
                        : url
                        ? "Replace / प्रतिस्थापन"
                        : "Upload / अपलोड"}
                    </button>
                  </div>
                </div>

                {isRejected && (
                  <div className="mt-2 ml-13 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg px-3 py-2">
                    Your last submission for this document was rejected
                    {latest?.review_note ? `: "${latest.review_note}"` : "."} Please
                    upload a corrected copy.
                    <br />
                    <span className="text-red-500/80">
                      यस कागजातको पछिल्लो पेशी अस्वीकृत भयो
                      {latest?.review_note ? `: "${latest.review_note}"` : "।"} कृपया सच्याइएको प्रति अपलोड गर्नुहोस्।
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Document Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-[#0f2044]">{previewTitle}</h3>
                <p className="text-xs text-gray-400">Document Preview</p>
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

            {/* Modal Body */}
            <div className="flex-1 p-6 bg-gray-50 overflow-auto flex justify-center items-center">
              {previewLoading ? (
                <p className="text-sm text-gray-400">Loading document… / लोड हुँदैछ…</p>
              ) : previewError ? (
                <p className="text-sm text-red-600">{previewError}</p>
              ) : previewUrl && previewIsPdf ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full rounded-xl border-0 bg-white"
                  title={previewTitle}
                />
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