"use client";

// =========================
// IMPORTS
// =========================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authFetch, API_BASE_URL } from "@/lib/api";
import { X, Download } from "lucide-react";

// =========================
// FIELD LABELS (used for both the on-screen sections and the
// spreadsheet export, so the two never drift apart)
// =========================
const PERSONAL_FIELDS: [string, string][] = [
  ["name", "Full Name"],
  ["fatherName", "Father's Name"],
  ["dob", "Date of Birth"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["permanentAddress", "Permanent Address"],
  ["permanentWardNo", "Permanent Ward No."],
];

const SCHOOL_FIELDS: [string, string][] = [
  ["schoolName", "School Name"],
  ["tokenNo", "Token No."],
  ["district", "District"],
  ["municipality", "Municipality"],
  ["wardNo", "Ward No."],
  ["subject", "Subject"],
  ["level", "Level"],
  ["grade", "Grade"],
  ["teacherType", "Teacher Type"],
];

const SERVICE_FIELDS: [string, string][] = [
  ["appointmentDate", "Appointment Date"],
  ["promotionDate", "Promotion Date"],
  ["qualification", "Qualification"],
  ["extraordinaryLeave", "Extraordinary Leave"],
  ["accumulatedLeave", "Accumulated Leave"],
  ["ageSixtyYear", "Age Sixty Year"],
];

const DOCUMENT_FIELDS: { key: string; label: string }[] = [
  { key: "citizenship", label: "Citizenship" },
  { key: "degree", label: "Degree" },
  { key: "transcript", label: "Transcript" },
  { key: "teachingLicense", label: "Teaching License" },
  { key: "appointmentLetter", label: "Appointment Letter" },
];

// Brand colors, reused between the on-screen status pill and the exported
// spreadsheet so the two visually match.
const BRAND_NAVY = "FF0B2C5F";
const ZEBRA_FILL = "FFF3F6FB";
const BORDER_GREY = "FFE5E7EB";
const STATUS_COLORS: Record<string, string> = {
  approved: "FF16A34A",
  rejected: "FFDC2626",
};
const STATUS_DEFAULT_COLOR = "FFCA8A04"; // pending / anything else

// =========================
// SMALL DISPLAY HELPERS
// =========================
function InfoGrid({ fields, data }: { fields: [string, string][]; data: any }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map(([key, label]) => (
        <p key={key}>
          <b>{label}:</b> {data?.[key] || "—"}
        </p>
      ))}
    </div>
  );
}

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
  const [exporting, setExporting] = useState(false);

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
  // DOWNLOAD TEACHER PROFILE AS A REAL, STYLED .xlsx
  // Every field the teacher submitted, minus their password (which the
  // backend never even sends back — see teachers/views.py teacher_detail).
  // Grouped into the same sections shown on screen, with a navy section
  // header per group and a colored status cell, so it reads like a real
  // spreadsheet report rather than a flat data dump.
  // =========================
  async function downloadTeacherSpreadsheet() {
    if (!teacher) return;
    setExporting(true);

    try {
      // Loaded on demand so this ~1MB library never touches the bundle for
      // users who never click export.
      const ExcelJSModule = await import("exceljs");
      const ExcelJSLib = ExcelJSModule.default ?? ExcelJSModule;
      const workbook = new ExcelJSLib.Workbook();
      workbook.creator = "Teacher Portal";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("Teacher Profile", {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      ws.columns = [
        { key: "field", width: 26 },
        { key: "value", width: 48 },
      ];

      const addSectionHeader = (title: string) => {
        const row = ws.addRow([title, ""]);
        row.height = 22;
        ws.mergeCells(`A${row.number}:B${row.number}`);
        const cell = row.getCell(1);
        cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_NAVY } };
        cell.alignment = { vertical: "middle", indent: 1 };
      };

      const addFieldRows = (
        fields: [string, string][],
        data: any,
        valueColors?: Record<string, string>
      ) => {
        fields.forEach(([key, label], i) => {
          const row = ws.addRow([label, data?.[key] || "—"]);
          row.getCell(1).font = { bold: true };
          row.getCell(1).alignment = { vertical: "middle" };
          row.getCell(2).alignment = { vertical: "middle", wrapText: true };

          const zebra = i % 2 === 1;
          row.eachCell((c) => {
            c.border = { bottom: { style: "thin", color: { argb: BORDER_GREY } } };
            if (zebra) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_FILL } };
          });

          const color = valueColors?.[key];
          if (color) {
            row.getCell(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
            row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
          }
        });
      };

      // Title banner
      const titleRow = ws.addRow([teacher.name || "Teacher Profile", `Status: ${teacher.status || "—"}`]);
      titleRow.height = 30;
      titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
      titleRow.getCell(2).font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      titleRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
      titleRow.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_NAVY } };
        c.alignment = { ...c.alignment, vertical: "middle" };
      });
      ws.addRow([]);

      addSectionHeader("Personal Information");
      addFieldRows(PERSONAL_FIELDS, teacher);
      ws.addRow([]);

      addSectionHeader("School Information");
      addFieldRows(SCHOOL_FIELDS, teacher);
      ws.addRow([]);

      addSectionHeader("Service Information");
      addFieldRows(SERVICE_FIELDS, teacher);
      ws.addRow([]);

      addSectionHeader("Documents");
      const documentStatusFields: [string, string][] = DOCUMENT_FIELDS.map((d) => [
        d.key,
        `${d.label} Document`,
      ]);
      const documentStatusData = Object.fromEntries(
        DOCUMENT_FIELDS.map((d) => [d.key, teacher[d.key] ? "Uploaded" : "Not uploaded"])
      );
      addFieldRows(documentStatusFields, documentStatusData);
      ws.addRow([]);

      addSectionHeader("Application");
      addFieldRows(
        [
          ["status", "Status"],
          ["remarks", "Remarks"],
          ["created_at", "Submitted On"],
        ],
        teacher,
        { status: STATUS_COLORS[teacher.status] || STATUS_DEFAULT_COLOR }
      );

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `teacher_${(teacher.name || String(id)).replace(/\s+/g, "_")}_profile.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Could not generate the spreadsheet. Please try again.");
    } finally {
      setExporting(false);
    }
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
              onClick={downloadTeacherSpreadsheet}
              disabled={exporting}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-[#0b2c5f] hover:bg-[#1a3260] disabled:opacity-60 text-white py-3 rounded-xl transition text-sm font-semibold shadow-sm"
            >
              <Download size={15} />
              {exporting ? "Preparing spreadsheet…" : "Download Profile (Excel)"}
            </button>
          </div>

          {/* RIGHT DETAILS */}
          <div className="col-span-2 space-y-6">

            {/* Personal */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                Personal Information
              </h2>
              <InfoGrid fields={PERSONAL_FIELDS} data={teacher} />
            </div>

            {/* School */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                School Information
              </h2>
              <InfoGrid fields={SCHOOL_FIELDS} data={teacher} />
            </div>

            {/* Service */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                Service Information
              </h2>
              <InfoGrid fields={SERVICE_FIELDS} data={teacher} />
            </div>

            {/* Documents */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                Uploaded Documents
              </h2>

              <div className="grid grid-cols-3 gap-4">
                {DOCUMENT_FIELDS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => openDocument(d.label, teacher[d.key])}
                    className={`p-3 rounded-xl transition font-medium ${
                      teacher[d.key]
                        ? "bg-blue-100 hover:bg-blue-200 text-[#0b2c5f]"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks (admin/sub-admin notes, e.g. from a change request) */}
            {teacher.remarks && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-2xl font-bold mb-4 text-[#0b2c5f]">
                  Remarks
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{teacher.remarks}</p>
              </div>
            )}

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