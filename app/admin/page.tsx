"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchDocumentBlobUrl, logout } from "@/lib/api";
import { Download, UserPlus, Trash2, X, Check, FileText } from "lucide-react";

type Teacher = {
  id: number;
  name: string;
  tokenNo: string;
  subject: string;
  phone?: string;
  email?: string;
  remarks?: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");

  const [stats, setStats] = useState({
    total_teachers: 0,
    pending_approvals: 0,
    approved: 0,
    rejected: 0,
    pending_teachers: [] as Teacher[],
    approved_teachers: [] as Teacher[],
    rejected_teachers: [] as Teacher[],
  });

  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [docRequestError, setDocRequestError] = useState("");
  const [docRequestBusyId, setDocRequestBusyId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewRequestId, setPreviewRequestId] = useState<number | null>(null);
  const [previewIsPdf, setPreviewIsPdf] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");

  // Separate reject-reason modal for TEACHER APPLICATION rejection --
  // distinct from the document-change-request reject modal above, since
  // they hit different endpoints and shouldn't share state.
  const [teacherRejectModalOpen, setTeacherRejectModalOpen] = useState(false);
  const [teacherRejectTarget, setTeacherRejectTarget] = useState<Teacher | null>(null);
  const [teacherRejectReason, setTeacherRejectReason] = useState("");
  const [teacherRejectReasonError, setTeacherRejectReasonError] = useState("");
  const [teacherRejectBusy, setTeacherRejectBusy] = useState(false);

  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [subAdminListError, setSubAdminListError] = useState("");
  const [showAddSubAdminModal, setShowAddSubAdminModal] = useState(false);
  const [subAdminName, setSubAdminName] = useState("");
  const [subAdminEmail, setSubAdminEmail] = useState("");
  const [subAdminPassword, setSubAdminPassword] = useState("");
  const [subAdminError, setSubAdminError] = useState("");
  const [subAdminSuccess, setSubAdminSuccess] = useState("");
  const [subAdminLoading, setSubAdminLoading] = useState(false);

  // Sub-admin management is main-admin only. Set from the role stored at
  // login (see app/login/page.tsx) -- sub-admins themselves are already
  // blocked at the API level (IsAdmin, not IsAdminOrPrincipal), this just
  // keeps the tab/button from showing up for them in the UI.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    setIsAdmin(localStorage.getItem("user_role") === "admin");
  }, []);

  async function handleLogout() {
    await logout();
    localStorage.removeItem("user_role");
    router.push("/login");
  }

  // If a sub-admin ever ends up on this tab (stale state, browser back
  // button, etc.) bounce them to the dashboard instead of showing a
  // panel whose data they aren't allowed to fetch anyway.
  useEffect(() => {
    if (!isAdmin && activeTab === "sub-admins") setActiveTab("dashboard");
  }, [isAdmin, activeTab]);

  function loadDashboard() {
    authFetch("/api/dashboard/stats/")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  }

  function loadSubAdmins() {
    authFetch("/api/accounts/sub-admins/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load sub-admins.");
        return res.json();
      })
      .then((data) => {
        setSubAdmins(data);
        setSubAdminListError("");
      })
      .catch((err) => {
        console.error(err);
        setSubAdminListError(
          "Could not load sub-admins. Only an admin account can view this list."
        );
      });
  }

  function loadDocumentRequests() {
    authFetch("/api/documents/change-requests/?status=pending")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load document requests.");
        return res.json();
      })
      .then((data) => {
        setDocumentRequests(data);
        setDocRequestError("");
      })
      .catch((err) => {
        console.error(err);
        setDocRequestError("Could not load pending document requests.");
      });
  }

  async function approveDocumentRequest(id: number) {
    setDocRequestBusyId(id);
    try {
      const res = await authFetch(`/api/documents/change-requests/${id}/approve/`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
      setDocumentRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Approve failed. Please try again.");
    } finally {
      setDocRequestBusyId(null);
    }
  }

  function openRejectModal(id: number) {
    // Preview and reject share one flow — close the preview so the reject
    // modal has focus, rather than stacking two modals.
    closePreview();
    setRejectTargetId(id);
    setRejectReason("");
    setRejectReasonError("");
    setRejectModalOpen(true);
  }

  function closeRejectModal() {
    setRejectModalOpen(false);
    setRejectTargetId(null);
    setRejectReason("");
    setRejectReasonError("");
  }

  async function submitRejectDocumentRequest() {
    if (rejectTargetId == null) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectReasonError("A rejection reason is required.");
      return;
    }
    const id = rejectTargetId;
    setDocRequestBusyId(id);
    try {
      const res = await authFetch(`/api/documents/change-requests/${id}/reject/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reason }),
      });
      if (!res.ok) throw new Error();
      setDocumentRequests((prev) => prev.filter((r) => r.id !== id));
      closeRejectModal();
    } catch {
      setRejectReasonError("Reject failed. Please try again.");
    } finally {
      setDocRequestBusyId(null);
    }
  }

  async function previewDocumentFile(id: number, label: string, path?: string | null) {
    if (!path) return;
    setPreviewOpen(true);
    setPreviewTitle(label);
    setPreviewRequestId(id);
    setPreviewIsPdf(path.toLowerCase().endsWith(".pdf"));
    setPreviewError("");
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const blobUrl = await fetchDocumentBlobUrl(path);
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
    setPreviewRequestId(null);
    setPreviewError("");
  }

  useEffect(() => {
    loadDashboard();
    loadDocumentRequests();
  }, []);

  useEffect(() => {
    if (isAdmin) loadSubAdmins();
  }, [isAdmin]);

  function downloadAllTeachersCSV() {
    const headers = ["ID", "Name", "Token No", "Subject", "Phone", "Email", "Status"];
    const all = [
      ...stats.pending_teachers.map(t => ({ ...t, status: "pending" })),
      ...stats.approved_teachers.map(t => ({ ...t, status: "approved" })),
      ...stats.rejected_teachers.map(t => ({ ...t, status: "rejected" }))
    ];

    const csvContent = [
      headers.join(","),
      ...all.map(t => [
        t.id,
        `"${t.name?.replace(/"/g, '""') || ""}"`,
        `"${t.tokenNo || ""}"`,
        `"${t.subject || ""}"`,
        `"${t.phone || ""}"`,
        `"${t.email || ""}"`,
        t.status
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "teachers_data_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleAddSubAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSubAdminError("");
    setSubAdminSuccess("");

    if (!subAdminName.trim() || !subAdminEmail.trim() || !subAdminPassword.trim()) {
      setSubAdminError("All fields are required.");
      return;
    }
    if (subAdminPassword.length < 8) {
      setSubAdminError("Password must be at least 8 characters.");
      return;
    }

    // The backend User model needs a unique `username`, separate from
    // email. Derive one from the email's local part rather than asking
    // for yet another field -- if it collides, the backend's error is
    // shown below and the admin can adjust the email.
    const username = subAdminEmail
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "");

    setSubAdminLoading(true);
    try {
      const res = await authFetch("/api/accounts/staff/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email: subAdminEmail,
          password: subAdminPassword,
          first_name: subAdminName,
          role: "sub-admin",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const firstError =
          typeof body === "object"
            ? (Object.values(body)[0] as any)
            : undefined;
        throw new Error(
          (Array.isArray(firstError) ? firstError[0] : firstError) ||
            "Failed to add sub-admin. The email might already be registered."
        );
      }

      loadSubAdmins();
      setSubAdminSuccess("Sub-admin added successfully!");
      setSubAdminName("");
      setSubAdminEmail("");
      setSubAdminPassword("");
      setTimeout(() => {
        setShowAddSubAdminModal(false);
        setSubAdminSuccess("");
      }, 1500);
    } catch (err: any) {
      setSubAdminError(err.message || "An error occurred.");
    } finally {
      setSubAdminLoading(false);
    }
  }

  async function removeSubAdmin(id: number) {
    if (!confirm("Are you sure you want to remove this sub-admin?")) return;

    try {
      const res = await authFetch(`/api/accounts/sub-admins/${id}/`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove sub-admin.");
      setSubAdmins((prev) => prev.filter((sa) => sa.id !== id));
    } catch (err) {
      console.error(err);
      alert("Could not remove sub-admin. Please try again.");
    }
  }

  async function approveTeacher(id: number) {
    const res = await authFetch(`/api/${id}/approve/`, { method: "PATCH" });

    if (!res.ok) {
      alert("Approve failed");
      return;
    }

    loadDashboard();
  }

  function openTeacherRejectModal(teacher: Teacher) {
    setTeacherRejectTarget(teacher);
    setTeacherRejectReason("");
    setTeacherRejectReasonError("");
    setTeacherRejectModalOpen(true);
  }

  function closeTeacherRejectModal() {
    setTeacherRejectModalOpen(false);
    setTeacherRejectTarget(null);
    setTeacherRejectReason("");
    setTeacherRejectReasonError("");
  }

  async function submitRejectTeacher() {
    if (!teacherRejectTarget) return;
    const reason = teacherRejectReason.trim();
    if (!reason) {
      setTeacherRejectReasonError("A rejection reason is required.");
      return;
    }

    setTeacherRejectBusy(true);
    try {
      const res = await authFetch(`/api/${teacherRejectTarget.id}/reject/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Reject failed. Please try again.");
      }
      closeTeacherRejectModal();
      loadDashboard();
    } catch (err: any) {
      setTeacherRejectReasonError(err.message || "Reject failed. Please try again.");
    } finally {
      setTeacherRejectBusy(false);
    }
  }

  function viewTeacher(teacher: Teacher) {
    router.push(`/admin/teacher/${teacher.id}`);
  }

  return (
    <div className="min-h-screen bg-[#eef3fb] flex">
      {/* Sidebar */}
      <div className="w-72 bg-[#0f2044] text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-blue-900">
          <h1 className="text-2xl font-bold">Teacher Portal</h1>
          <p className="text-blue-200 text-sm">
            Gandaki Pradesh Education
          </p>
        </div>

        <div className="p-5 flex-1">
          <p className="text-blue-300 text-xs uppercase mb-4 tracking-widest">
            Main Menu
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full text-left px-4 py-3 rounded-xl transition ${
                activeTab === "dashboard"
                  ? "bg-white text-[#0f2044] font-semibold"
                  : "hover:bg-blue-900"
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab("total")}
              className={`w-full text-left px-4 py-3 rounded-xl transition ${
                activeTab === "total"
                  ? "bg-white text-[#0f2044] font-semibold"
                  : "hover:bg-blue-900"
              }`}
            >
              Total Teachers
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              className={`w-full text-left px-4 py-3 rounded-xl transition ${
                activeTab === "pending"
                  ? "bg-white text-[#0f2044] font-semibold"
                  : "hover:bg-blue-900"
              }`}
            >
              Pending Approval
            </button>

            <button
              onClick={() => setActiveTab("approved")}
              className={`w-full text-left px-4 py-3 rounded-xl transition ${
                activeTab === "approved"
                  ? "bg-white text-[#0f2044] font-semibold"
                  : "hover:bg-blue-900"
              }`}
            >
              Approved
            </button>

             <button
              onClick={() => setActiveTab("rejected")}
              className={`w-full text-left px-4 py-3 rounded-xl transition ${
                activeTab === "rejected"
                  ? "bg-white text-[#0f2044] font-semibold"
                  : "hover:bg-blue-900"
              }`}
            >
              Rejected
            </button>

            <button
              onClick={() => setActiveTab("document-requests")}
              className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between ${
                activeTab === "document-requests"
                  ? "bg-white text-[#0f2044] font-semibold"
                  : "hover:bg-blue-900"
              }`}
            >
              <span>Document Requests</span>
              {documentRequests.length > 0 && (
                <span className="bg-amber-400 text-[#0f2044] text-xs font-bold px-2 py-0.5 rounded-full">
                  {documentRequests.length}
                </span>
              )}
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab("sub-admins")}
                className={`w-full text-left px-4 py-3 rounded-xl transition ${
                  activeTab === "sub-admins"
                    ? "bg-white text-[#0f2044] font-semibold"
                    : "hover:bg-blue-900"
                }`}
              >
                Sub-Admins
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 py-3 rounded-xl font-semibold"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-[#0f2044]">
              Admin Dashboard
            </h1>
            <p className="text-gray-500 mt-2">
              Manage teacher registrations and approvals
            </p>
          </div>
          <button
            onClick={downloadAllTeachersCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl transition text-sm font-semibold shadow-sm"
          >
            <Download size={16} />
            Export Teachers (CSV)
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div
                onClick={() => setActiveTab("total")}
                className="bg-white rounded-2xl p-6 shadow hover:shadow-lg cursor-pointer"
              >
                <p className="text-gray-500 mb-2">Total Teachers</p>
                <h2 className="text-4xl font-bold text-[#0f2044]">
                  {stats.total_teachers}
                </h2>
              </div>

              <div
                onClick={() => setActiveTab("pending")}
                className="bg-white rounded-2xl p-6 shadow hover:shadow-lg cursor-pointer"
              >
                <p className="text-yellow-600 mb-2">Pending</p>
                <h2 className="text-4xl font-bold">
                  {stats.pending_approvals}
                </h2>
              </div>

              <div
                onClick={() => setActiveTab("approved")}
                className="bg-white rounded-2xl p-6 shadow hover:shadow-lg cursor-pointer"
              >
                <p className="text-green-600 mb-2">Approved</p>
                <h2 className="text-4xl font-bold">
                  {stats.approved}
                </h2>
              </div>

              <div
                onClick={() => setActiveTab("rejected")}
                className="bg-white rounded-2xl p-6 shadow hover:shadow-lg cursor-pointer"
              >
                <p className="text-red-600 mb-2">Rejected</p>
                <h2 className="text-4xl font-bold">
                  {stats.rejected}
                </h2>
              </div>
            </div>
                        {/* Pending Approval Section */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold text-[#0f2044] mb-6">
                Pending Teacher Approvals
              </h2>

              {stats.pending_teachers.length === 0 ? (
                <p className="text-gray-500">No pending teachers.</p>
              ) : (
                <div className="space-y-4">
                  {stats.pending_teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="border rounded-xl p-5 flex justify-between items-center hover:shadow-md transition"
                    >
                      <div>
                        <h3 className="font-bold text-lg text-[#0f2044]">
                          {teacher.name}
                        </h3>
                        <p className="text-gray-500">
                          Token: {teacher.tokenNo}
                        </p>
                        <p className="text-gray-500">
                          Subject: {teacher.subject}
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => approveTeacher(teacher.id)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => openTeacherRejectModal(teacher)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => viewTeacher(teacher)}
                          className="px-4 py-2 bg-[#0f2044] text-white rounded-lg hover:bg-[#1a3260]"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Total Teachers Tab */}
        {activeTab === "total" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold text-[#0f2044] mb-6">
              All Teachers
            </h2>

            {[...stats.pending_teachers, ...stats.approved_teachers].map(
              (teacher) => (
                <div
                  key={teacher.id}
                  className="border-b py-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{teacher.name}</p>
                    <p className="text-gray-500">{teacher.subject}</p>
                  </div>

                  <button
                    onClick={() => viewTeacher(teacher)}
                    className="bg-[#0f2044] text-white px-4 py-2 rounded-lg"
                  >
                    View
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Pending Tab */}
        {activeTab === "pending" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold text-yellow-600 mb-4">
              Pending Teachers
            </h2>

            {stats.pending_teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="border-b py-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{teacher.name}</p>
                  <p className="text-gray-500">{teacher.subject}</p>
                </div>

                <button
                  onClick={() => viewTeacher(teacher)}
                  className="bg-[#0f2044] text-white px-4 py-2 rounded-lg"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Approved Tab */}
        {activeTab === "approved" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Approved Teachers
            </h2>

            {stats.approved_teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="border-b py-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{teacher.name}</p>
                  <p className="text-gray-500">{teacher.subject}</p>
                </div>

                <button
                  onClick={() => viewTeacher(teacher)}
                  className="bg-[#0f2044] text-white px-4 py-2 rounded-lg"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Rejected Tab */}
        {activeTab === "rejected" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Rejected Teachers
            </h2>

            {stats.rejected_teachers.length === 0 ? (
              <p className="text-gray-500">No rejected teachers.</p>
            ) : (
              <div className="space-y-4">
                {stats.rejected_teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="border rounded-xl p-5 flex justify-between items-center hover:shadow-md transition"
                  >
                    <div>
                      <h3 className="font-bold text-lg text-[#0f2044]">
                        {teacher.name}
                      </h3>
                      <p className="text-gray-500">Token: {teacher.tokenNo}</p>
                      <p className="text-gray-500">Subject: {teacher.subject}</p>
                      {teacher.remarks && (
                        <p className="text-red-600 text-sm mt-1">
                          Reason: {teacher.remarks}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => viewTeacher(teacher)}
                      className="px-4 py-2 bg-[#0f2044] text-white rounded-lg hover:bg-[#1a3260]"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Document Requests Tab */}
        {activeTab === "document-requests" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#0f2044]">
                Pending Document Requests
              </h2>
              <p className="text-sm text-gray-500">
                A teacher's uploaded document only replaces the official one once
                approved here.
              </p>
            </div>

            {docRequestError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                {docRequestError}
              </div>
            )}

            {documentRequests.length === 0 ? (
              <p className="text-gray-500 py-4">No pending document requests.</p>
            ) : (
              <div className="space-y-4">
                {documentRequests.map((r) => {
                  const busy = docRequestBusyId === r.id;
                  return (
                    <div
                      key={r.id}
                      className="border rounded-xl p-5 flex justify-between items-center hover:shadow-md transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <FileText size={18} className="text-[#0f2044]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#0f2044]">
                            {r.teacherName}
                          </h3>
                          <p className="text-gray-500 text-sm">{r.document_type}</p>
                          <p className="text-gray-400 text-xs">
                            Submitted{" "}
                            {new Date(r.requested_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => previewDocumentFile(r.id, r.document_type, r.file)}
                          className="px-4 py-2 bg-gray-50 text-[#0f2044] rounded-lg hover:bg-gray-100 text-sm font-semibold"
                        >
                          View
                        </button>
                        <button
                          onClick={() => approveDocumentRequest(r.id)}
                          disabled={busy}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-60 text-sm font-semibold"
                        >
                          <Check size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(r.id)}
                          disabled={busy}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 text-sm font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sub-Admins Tab */}
        {activeTab === "sub-admins" && isAdmin && (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#0f2044]">Sub-Admins</h2>
                <p className="text-sm text-gray-500">Manage portal administrators and sub-admins</p>
              </div>
              <button
                onClick={() => setShowAddSubAdminModal(true)}
                className="flex items-center gap-2 bg-[#0f2044] hover:bg-[#1a3260] text-white px-4 py-2.5 rounded-xl transition text-sm font-semibold shadow-sm animate-in fade-in"
              >
                <UserPlus size={16} />
                Add Sub-Admin
              </button>
            </div>

            {subAdminListError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                {subAdminListError}
              </div>
            )}

            {subAdmins.length === 0 ? (
              <p className="text-gray-500 py-4">No sub-admins found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-gray-400 font-medium">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4 text-center">Approved</th>
                      <th className="py-3 px-4 text-center">Rejected</th>
                      <th className="py-3 px-4">Created At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subAdmins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50 transition">
                        <td className="py-4 px-4 font-semibold text-[#0f2044]">
                          {admin.first_name || admin.username}
                        </td>
                        <td className="py-4 px-4 text-gray-600">{admin.email}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-lg">
                            {admin.approved_count ?? 0}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block bg-red-50 text-red-700 font-semibold px-2.5 py-1 rounded-lg">
                            {admin.rejected_count ?? 0}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-500">
                          {admin.date_joined
                            ? new Date(admin.date_joined).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => removeSubAdmin(admin.id)}
                            className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition"
                            title="Remove Sub-Admin"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Sub-Admin Modal */}
      {showAddSubAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#0f2044]">Add New Sub-Admin</h3>
                <p className="text-xs text-gray-400">Create login credentials for a sub-admin</p>
              </div>
              <button
                onClick={() => {
                  setShowAddSubAdminModal(false);
                  setSubAdminError("");
                  setSubAdminSuccess("");
                }}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {subAdminError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                {subAdminError}
              </div>
            )}

            {subAdminSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3 mb-4">
                {subAdminSuccess}
              </div>
            )}

            <form onSubmit={handleAddSubAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={subAdminName}
                  onChange={(e) => setSubAdminName(e.target.value)}
                  placeholder="e.g. Ram Bahadur"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={subAdminEmail}
                  onChange={(e) => setSubAdminEmail(e.target.value)}
                  placeholder="e.g. ram@government.gov.np"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={subAdminPassword}
                  onChange={(e) => setSubAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
                />
              </div>

              <button
                type="submit"
                disabled={subAdminLoading}
                className="w-full mt-2 bg-[#0f2044] hover:bg-[#1a3260] text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60"
              >
                {subAdminLoading ? "Creating..." : "Create Sub-Admin"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-[#0f2044]">{previewTitle}</h3>
                <p className="text-xs text-gray-400">Submitted document</p>
              </div>
              <div className="flex items-center gap-3">
                {previewRequestId != null && (
                  <>
                    <button
                      onClick={async () => {
                        const id = previewRequestId;
                        await approveDocumentRequest(id);
                        closePreview();
                      }}
                      disabled={docRequestBusyId === previewRequestId}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-60 px-3 py-2 rounded-lg transition"
                    >
                      <Check size={13} />
                      Approve
                    </button>
                    <button
                      onClick={() => openRejectModal(previewRequestId)}
                      disabled={docRequestBusyId === previewRequestId}
                      className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-3 py-2 rounded-lg transition"
                    >
                      Reject
                    </button>
                  </>
                )}
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

      {/* Reject Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#0f2044]">Reject Document</h3>
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
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectReasonError) setRejectReasonError("");
                }}
                rows={4}
                placeholder="e.g. Document is blurry, please re-upload a clear scan"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
              />
              {rejectReasonError && (
                <p className="text-red-600 text-xs mt-1.5">{rejectReasonError}</p>
              )}
            </div>

            <button
              onClick={submitRejectDocumentRequest}
              disabled={docRequestBusyId === rejectTargetId}
              className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60"
            >
              {docRequestBusyId === rejectTargetId ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      )}

      {/* Reject Teacher Application Modal */}
      {teacherRejectModalOpen && teacherRejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#0f2044]">
                  Reject {teacherRejectTarget.name}'s Application
                </h3>
                <p className="text-xs text-gray-400">
                  A reason is required so the teacher knows what to fix
                </p>
              </div>
              <button
                onClick={closeTeacherRejectModal}
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
                value={teacherRejectReason}
                onChange={(e) => {
                  setTeacherRejectReason(e.target.value);
                  if (teacherRejectReasonError) setTeacherRejectReasonError("");
                }}
                rows={4}
                placeholder="e.g. Missing teaching license, please resubmit application"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
              />
              {teacherRejectReasonError && (
                <p className="text-red-600 text-xs mt-1.5">{teacherRejectReasonError}</p>
              )}
            </div>

            <button
              onClick={submitRejectTeacher}
              disabled={teacherRejectBusy}
              className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60"
            >
              {teacherRejectBusy ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}