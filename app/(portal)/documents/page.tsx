"use client";
import { useEffect, useState, useRef } from "react";
import { FileText, Trash2, ExternalLink, Upload, X } from "lucide-react";

const DOC_TYPES = [
  { value: "CITIZENSHIP", label: "Citizenship / नागरिकता" },
  { value: "DEGREE", label: "Degree Certificate / प्रमाणपत्र" },
  { value: "TRANSCRIPT", label: "Transcript / अंकतालिका" },
  { value: "APPOINTMENT_LETTER", label: "Appointment Letter / नियुक्तिपत्र" },
  { value: "TEACHING_LICENSE", label: "Teaching License / शिक्षण अनुमतिपत्र" },
  { value: "EXPERIENCE_LETTER", label: "Experience Letter / अनुभव पत्र" },
  { value: "PHOTO", label: "Photo / फोटो" },
  { value: "OTHER", label: "Other / अन्य" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("CITIZENSHIP");
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      const token = localStorage.getItem("access");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/documents/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setDocuments(data);
    } catch {
      setError("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    try {
      const token = localStorage.getItem("access");
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("type", docType);
      if (label) fd.append("label", label);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/documents/`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        }
      );
      if (!res.ok) throw new Error("Upload failed.");
      const newDoc = await res.json();
      setDocuments((prev) => [newDoc, ...prev]);
      setShowUpload(false);
      setSelectedFile(null);
      setLabel("");
      setDocType("CITIZENSHIP");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this document?")) return;
    try {
      const token = localStorage.getItem("access");
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/documents/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError("Failed to delete.");
    }
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f2044]">Documents</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {documents.length} document{documents.length !== 1 ? "s" : ""} on file
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-[#0f2044] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition"
        >
          <Upload size={15} />
          Upload
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Upload panel */}
      {showUpload && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#0f2044]">Upload Document</h2>
            <button
              onClick={() => setShowUpload(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          {/* File drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 hover:border-[#0f2044] rounded-xl p-8 text-center cursor-pointer transition"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            {selectedFile ? (
              <div>
                <p className="font-medium text-[#0f2044]">{selectedFile.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
            ) : (
              <div>
                <Upload size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  Click to select a file
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Image or PDF · Max 5MB
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044] bg-white"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. TU Degree 2019"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0f2044]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowUpload(false)}
              className="px-5 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="bg-[#0f2044] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3260] transition disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <FileText size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-[#0f2044]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {doc.label || doc.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {doc.type.replace(/_/g, " ")} · {formatDate(doc.uploaded_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                
                  href={`${process.env.NEXT_PUBLIC_API_URL}${doc.file_url}`}
  target="_blank"
  rel="noopener noreferrer"
  className="p-2 text-gray-400 hover:text-[#0f2044] rounded-lg hover:bg-blue-50 transition"
  title="View">
  <ExternalLink size={15} />
</a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}