"use client";

// =========================
// IMPORTS
// =========================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authFetch, API_BASE_URL } from "@/lib/api";
import { X, Download } from "lucide-react";

export default function TeacherDetailPage() {
  // =========================
  // GET TEACHER ID FROM URL
  // =========================
  const params = useParams();
  const id = params.id;

  // =========================
  // STATES
  // =========================
  const [teacher, setTeacher] = useState<any>(null);
  const [changeMessage, setChangeMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  // =========================
  // FETCH TEACHER DETAIL
  // =========================
  useEffect(() => {
    authFetch(`/api/teacher/${id}/`)
      .then((res) => res.json())
      .then((data) => setTeacher(data));
  }, [id]);

  // =========================
  // SEND CHANGE REQUEST
  // =========================
  async function sendChangeRequest() {
    const res = await authFetch(`/api/teacher/${id}/request-changes/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: changeMessage,
      }),
    });

    if (res.ok) {
      alert("Change request sent to teacher");
      setChangeMessage("");
    } else {
      alert("Failed");
    }
  }

  // =========================
  // DOWNLOAD TEACHER JSON DATA
  // =========================
  function downloadTeacherJSON() {
    if (!teacher) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(teacher, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `teacher_${teacher.name?.replace(/\s+/g, "_")}_profile.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  }

  // =========================
  // OPEN DOCUMENT
  // =========================
  function openDocument(label: string, docUrl: string | null) {
    if (!docUrl) {
      alert("Document not uploaded");
      return;
    }

    const fullUrl = docUrl.startsWith("http")
      ? docUrl
      : `${API_BASE_URL}/media/${docUrl}`;

    setPreviewUrl(fullUrl);
    setPreviewTitle(label);
  }

  if (!teacher) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-[#eef3fb] p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow p-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-[#0b2c5f]">
              Teacher Review Panel
            </h1>
            <p className="text-gray-500">
              Review teacher details before approval
            </p>
          </div>

          <div
            className={`px-5 py-2 rounded-full font-bold ${
              teacher.status === "approved"
                ? "bg-green-100 text-green-700"
                : teacher.status === "rejected"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {teacher.status}
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-3 gap-6">

          {/* LEFT PROFILE */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full bg-blue-200 flex items-center justify-center text-4xl font-bold text-[#0b2c5f]">
                {teacher.name?.[0]}
              </div>

              <h2 className="text-2xl font-bold mt-4">{teacher.name}</h2>
              <p className="text-gray-500">{teacher.subject}</p>
            </div>

            <div className="mt-8 space-y-3">
              <p><b>Token:</b> {teacher.tokenNo}</p>
              <p><b>Phone:</b> {teacher.phone}</p>
              <p><b>Email:</b> {teacher.email}</p>
            </div>

            <button
              onClick={downloadTeacherJSON}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-[#0b2c5f] hover:bg-[#1a3260] text-white py-3 rounded-xl transition text-sm font-semibold shadow-sm"
            >
              <Download size={15} />
              Download Profile (JSON)
            </button>
          </div>

          {/* RIGHT DETAILS */}
          <div className="col-span-2 space-y-6">

            {/* Personal */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                Personal Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <p><b>Name:</b> {teacher.name}</p>
                <p><b>Father Name:</b> {teacher.fatherName}</p>
                <p><b>DOB:</b> {teacher.dob}</p>
                <p><b>Address:</b> {teacher.permanentAddress}</p>
              </div>
            </div>

            {/* School */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                School Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <p><b>School:</b> {teacher.schoolName}</p>
                <p><b>District:</b> {teacher.district}</p>
                <p><b>Level:</b> {teacher.level}</p>
                <p><b>Teacher Type:</b> {teacher.teacherType}</p>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                Uploaded Documents
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => openDocument("Citizenship", teacher.citizenship)}
                  className="p-3 bg-blue-100 rounded-xl hover:bg-blue-200 transition font-medium text-[#0b2c5f]"
                >
                  Citizenship
                </button>

                <button
                  onClick={() => openDocument("Degree", teacher.degree)}
                  className="p-3 bg-blue-100 rounded-xl hover:bg-blue-200 transition font-medium text-[#0b2c5f]"
                >
                  Degree
                </button>

                <button
                  onClick={() => openDocument("Transcript", teacher.transcript)}
                  className="p-3 bg-blue-100 rounded-xl hover:bg-blue-200 transition font-medium text-[#0b2c5f]"
                >
                  Transcript
                </button>

                <button
                  onClick={() => openDocument("Teaching License", teacher.teachingLicense)}
                  className="p-3 bg-blue-100 rounded-xl hover:bg-blue-200 transition font-medium text-[#0b2c5f]"
                >
                  License
                </button>
              </div>
            </div>

            {/* Change Request */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                Request Changes From Teacher
              </h2>

              <textarea
                value={changeMessage}
                onChange={(e) => setChangeMessage(e.target.value)}
                placeholder="Example: Please upload clearer citizenship document"
                className="w-full border rounded-xl p-4 h-32"
              />

              <button
                onClick={sendChangeRequest}
                className="mt-4 bg-yellow-500 text-white px-6 py-3 rounded-xl"
              >
                Send Change Request
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-[#0b2c5f]">{previewTitle}</h3>
                <p className="text-xs text-gray-400">Review Document</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={previewUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#0b2c5f] hover:bg-[#1a3260] px-3 py-2 rounded-lg transition"
                >
                  <Download size={13} />
                  Download
                </a>
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setPreviewTitle("");
                  }}
                  className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 bg-gray-50 overflow-auto flex justify-center items-center">
              {previewUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full rounded-xl border-0 bg-white"
                  title={previewTitle}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-sm"
                  alt={previewTitle}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}