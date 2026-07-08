"use client";
import { useEffect, useState, useRef } from "react";
import { FileText, ExternalLink, Upload } from "lucide-react";
import { API_BASE_URL, authFetch } from "@/lib/api";

type DocKey =
  | "citizenship"
  | "degree"
  | "transcript"
  | "teachingLicense"
  | "appointmentLetter";

type Teacher = Record<DocKey, string | null> & { [key: string]: any };

const DOC_TYPES: { key: DocKey; label: string }[] = [
  { key: "citizenship", label: "Citizenship / नागरिकता" },
  { key: "degree", label: "Degree Certificate / प्रमाणपत्र" },
  { key: "transcript", label: "Transcript / अंकतालिका" },
  { key: "teachingLicense", label: "Teaching License / शिक्षण अनुमतिपत्र" },
  { key: "appointmentLetter", label: "Appointment Letter / नियुक्तिपत्र" },
];

export default function DocumentsPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingKey, setUploadingKey] = useState<DocKey | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchMe();
  }, []);

  async function fetchMe() {
    try {
      const res = await authFetch("/api/teachers/me/");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTeacher(data);
      setError("");
    } catch {
      setError("Failed to load your documents.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelected(key: DocKey, file: File | undefined) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File too large — max 5MB.");
      return;
    }

    setUploadingKey(key);
    setError("");
    try {
      const fd = new FormData();
      fd.append(key, file);
      const res = await authFetch("/api/teachers/me/", {
        method: "PATCH",
        body: fd,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTeacher(data);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploadingKey(null);
    }
  }

  function openDocument(path?: string | null) {
    if (!path) return;
    const fullUrl = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
    window.open(fullUrl, "_blank");
  }

  const uploadedCount = teacher
    ? DOC_TYPES.filter((d) => !!teacher[d.key]).length
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0f2044]">Documents</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {uploadedCount} of {DOC_TYPES.length} documents on file
        </p>
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

            return (
              <div
                key={d.key}
                className="flex items-center justify-between px-5 py-4"
              >
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
                    <p className="text-xs text-gray-400">
                      {url ? "Uploaded" : "Not uploaded"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {url && (
                    <button
                      onClick={() => openDocument(url)}
                      className="p-2 text-gray-400 hover:text-[#0f2044] rounded-lg hover:bg-blue-50 transition"
                      title="View"
                    >
                      <ExternalLink size={15} />
                    </button>
                  )}

                  <input
                    ref={(el) => {
                      fileRefs.current[d.key] = el;
                    }}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) =>
                      handleFileSelected(d.key, e.target.files?.[0])
                    }
                  />
                  <button
                    onClick={() => fileRefs.current[d.key]?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#0f2044] bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    <Upload size={13} />
                    {isUploading ? "Uploading…" : url ? "Replace" : "Upload"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
