"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchDocumentBlobUrl, logout } from "@/lib/api";
import { Download } from "lucide-react";

import type { Teacher } from "./types";
import {
  downloadFullDataExport,
  downloadSchoolReport as downloadSchoolReportFile,
  downloadApprovedSchoolsExcel as downloadApprovedSchoolsExcelFile,
} from "./lib/exportExcel";

import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import DashboardTab from "./components/DashboardTab";
import TeacherListTab from "./components/TeacherListTab";
import DocumentRequestsTab from "./components/DocumentRequestsTab";
import TransferRequestsTab from "./components/TransferRequestsTab";
import SchoolRequestsTab from "./components/SchoolRequestsTab";
import ApprovedSchoolsTab from "./components/ApprovedSchoolsTab";
import SubAdminsTab from "./components/SubAdminsTab";

import DocumentPreviewModal from "./components/modals/DocumentPreviewModal";
import RejectReasonModal from "./components/modals/RejectReasonModal";
import AddSubAdminModal from "./components/modals/AddSubAdminModal";
import RemoveSubAdminModal from "./components/modals/RemoveSubAdminModal";

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

  const [transferRequests, setTransferRequests] = useState<any[]>([]);
  const [transferRequestError, setTransferRequestError] = useState("");
  const [transferRequestBusyId, setTransferRequestBusyId] = useState<number | null>(null);
  const [transferRejectModalOpen, setTransferRejectModalOpen] = useState(false);
  const [transferRejectTargetId, setTransferRejectTargetId] = useState<number | null>(null);
  const [transferRejectReason, setTransferRejectReason] = useState("");
  const [transferRejectReasonError, setTransferRejectReasonError] = useState("");

  const [schoolRequests, setSchoolRequests] = useState<any[]>([]);
  const [expandedSchoolRequestId, setExpandedSchoolRequestId] = useState<number | null>(null);
  const [schoolRequestError, setSchoolRequestError] = useState("");
  const [schoolRequestBusyId, setSchoolRequestBusyId] = useState<number | null>(null);
  const [schoolRejectModalOpen, setSchoolRejectModalOpen] = useState(false);
  const [schoolRejectTargetId, setSchoolRejectTargetId] = useState<number | null>(null);
  const [schoolRejectReason, setSchoolRejectReason] = useState("");
  const [schoolRejectReasonError, setSchoolRejectReasonError] = useState("");

  // Approved Schools tab -- separate from schoolRequests above (which is
  // the pending review queue). Admin/Sub-Admin only, same as the full
  // data export -- see canExportData.
  const [approvedSchools, setApprovedSchools] = useState<any[]>([]);
  const [expandedApprovedSchoolId, setExpandedApprovedSchoolId] = useState<number | null>(null);
  const [downloadingSchoolReportId, setDownloadingSchoolReportId] = useState<number | null>(null);
  const [approvedSchoolsError, setApprovedSchoolsError] = useState("");
  const [approvedSchoolsExportBusy, setApprovedSchoolsExportBusy] = useState(false);

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

  // Toast — replaces raw alert() calls, which look like a browser/system
  // warning rather than part of the app to someone unfamiliar with
  // browsers. Auto-dismisses, but can also be closed manually.
  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 5000);
  }

  // Remove-sub-admin confirmation — replaces raw confirm(), which is a
  // native browser dialog with no styling and can look alarming/unfamiliar
  // rather than an obvious part of the site.
  const [removeSubAdminTarget, setRemoveSubAdminTarget] = useState<{ id: number; name: string } | null>(null);
  const [removeSubAdminBusy, setRemoveSubAdminBusy] = useState(false);

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
  const [userRole, setUserRole] = useState<string>("");
  useEffect(() => {
    const role = localStorage.getItem("user_role") || "";
    setIsAdmin(role === "admin");
    setUserRole(role);
  }, []);
  // Excel export (all data, Teachers + Schools) is Admin/Sub-Admin only --
  // a principal reviewing their own school shouldn't be exporting every
  // teacher and school's full record.
  const canExportData = userRole === "admin" || userRole === "sub-admin";

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

  useEffect(() => {
    if (!canExportData && activeTab === "approved-schools") setActiveTab("dashboard");
  }, [canExportData, activeTab]);

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
        setSubAdminListError("Could not load sub-admins. Only an admin account can view this list.");
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
      showToast("Approve failed. Please try again. / स्वीकृत गर्न असफल भयो, फेरि प्रयास गर्नुहोस्।");
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

  function loadTransferRequests() {
    authFetch("/api/transfers/requests/?status=pending")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load transfer requests.");
        return res.json();
      })
      .then((data) => {
        setTransferRequests(data);
        setTransferRequestError("");
      })
      .catch((err) => {
        console.error(err);
        setTransferRequestError("Could not load pending transfer requests.");
      });
  }

  async function approveTransferRequest(id: number) {
    setTransferRequestBusyId(id);
    try {
      const res = await authFetch(`/api/transfers/requests/${id}/approve/`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
      setTransferRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      showToast("Approve failed. Please try again. / स्वीकृत गर्न असफल भयो, फेरि प्रयास गर्नुहोस्।");
    } finally {
      setTransferRequestBusyId(null);
    }
  }

  function openTransferRejectModal(id: number) {
    setTransferRejectTargetId(id);
    setTransferRejectReason("");
    setTransferRejectReasonError("");
    setTransferRejectModalOpen(true);
  }

  function closeTransferRejectModal() {
    setTransferRejectModalOpen(false);
    setTransferRejectTargetId(null);
    setTransferRejectReason("");
    setTransferRejectReasonError("");
  }

  async function submitRejectTransferRequest() {
    if (transferRejectTargetId == null) return;
    const reason = transferRejectReason.trim();
    if (!reason) {
      setTransferRejectReasonError("A rejection reason is required.");
      return;
    }
    const id = transferRejectTargetId;
    setTransferRequestBusyId(id);
    try {
      const res = await authFetch(`/api/transfers/requests/${id}/reject/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reason }),
      });
      if (!res.ok) throw new Error();
      setTransferRequests((prev) => prev.filter((r) => r.id !== id));
      closeTransferRejectModal();
    } catch {
      setTransferRejectReasonError("Reject failed. Please try again.");
    } finally {
      setTransferRequestBusyId(null);
    }
  }

  function loadSchoolRequests() {
    authFetch("/api/schools/?status=pending")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load school requests.");
        return res.json();
      })
      .then((data) => {
        setSchoolRequests(data);
        setSchoolRequestError("");
      })
      .catch((err) => {
        console.error(err);
        setSchoolRequestError("Could not load pending school submissions.");
      });
  }

  function loadApprovedSchools() {
    authFetch("/api/schools/?status=approved")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load approved schools.");
        return res.json();
      })
      .then((data) => {
        setApprovedSchools(data);
        setApprovedSchoolsError("");
      })
      .catch((err) => {
        console.error(err);
        setApprovedSchoolsError("Could not load approved schools.");
      });
  }

  async function approveSchoolRequest(id: number) {
    setSchoolRequestBusyId(id);
    try {
      const res = await authFetch(`/api/schools/${id}/approve/`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
      setSchoolRequests((prev) => prev.filter((s) => s.id !== id));
    } catch {
      showToast("Approve failed. Please try again. / स्वीकृत गर्न असफल भयो, फेरि प्रयास गर्नुहोस्।");
    } finally {
      setSchoolRequestBusyId(null);
    }
  }

  function openSchoolRejectModal(id: number) {
    setSchoolRejectTargetId(id);
    setSchoolRejectReason("");
    setSchoolRejectReasonError("");
    setSchoolRejectModalOpen(true);
  }

  function closeSchoolRejectModal() {
    setSchoolRejectModalOpen(false);
    setSchoolRejectTargetId(null);
    setSchoolRejectReason("");
    setSchoolRejectReasonError("");
  }

  async function submitRejectSchoolRequest() {
    if (schoolRejectTargetId == null) return;
    const reason = schoolRejectReason.trim();
    if (!reason) {
      setSchoolRejectReasonError("A rejection reason is required.");
      return;
    }
    const id = schoolRejectTargetId;
    setSchoolRequestBusyId(id);
    try {
      const res = await authFetch(`/api/schools/${id}/reject/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reason }),
      });
      if (!res.ok) throw new Error();
      setSchoolRequests((prev) => prev.filter((s) => s.id !== id));
      closeSchoolRejectModal();
    } catch {
      setSchoolRejectReasonError("Reject failed. Please try again.");
    } finally {
      setSchoolRequestBusyId(null);
    }
  }

  // Transfer documents open in a new tab via a blob URL rather than the
  // shared document-request preview modal above, since that modal's
  // Approve/Reject buttons are wired specifically to
  // approveDocumentRequest/openRejectModal (document-change-request
  // endpoints) -- reusing it here would risk an admin approving/rejecting
  // the wrong kind of request from the same-looking dialog.
  async function viewTransferDocument(path: string) {
    try {
      const blobUrl = await fetchDocumentBlobUrl(path);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not load this document.");
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
    setPreviewRequestId(null);
    setPreviewError("");
  }

  useEffect(() => {
    loadDashboard();
    loadDocumentRequests();
    loadTransferRequests();
    loadSchoolRequests();
  }, []);

  useEffect(() => {
    if (isAdmin) loadSubAdmins();
  }, [isAdmin]);

  useEffect(() => {
    if (canExportData) loadApprovedSchools();
  }, [canExportData]);

  const [exportBusy, setExportBusy] = useState(false);

  async function downloadExcelExport() {
    setExportBusy(true);
    try {
      await downloadFullDataExport(authFetch);
    } catch (err: any) {
      showToast(err?.message || "Export failed. Please try again. / निर्यात असफल भयो।");
    } finally {
      setExportBusy(false);
    }
  }

  async function downloadSchoolReport(school: any) {
    setDownloadingSchoolReportId(school.id);
    try {
      await downloadSchoolReportFile(authFetch, school);
    } catch (err) {
      console.error(err);
      showToast("Export failed. Please try again. / निर्यात असफल भयो।");
    } finally {
      setDownloadingSchoolReportId(null);
    }
  }

  async function downloadApprovedSchoolsExcel() {
    setApprovedSchoolsExportBusy(true);
    try {
      await downloadApprovedSchoolsExcelFile(authFetch);
    } catch (err) {
      console.error(err);
      showToast("Export failed. Please try again. / निर्यात असफल भयो।");
    } finally {
      setApprovedSchoolsExportBusy(false);
    }
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
        const firstError = typeof body === "object" ? (Object.values(body)[0] as any) : undefined;
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

  function openRemoveSubAdminModal(id: number, name: string) {
    setRemoveSubAdminTarget({ id, name });
  }

  function closeRemoveSubAdminModal() {
    setRemoveSubAdminTarget(null);
  }

  async function confirmRemoveSubAdmin() {
    if (!removeSubAdminTarget) return;
    setRemoveSubAdminBusy(true);
    try {
      const res = await authFetch(`/api/accounts/sub-admins/${removeSubAdminTarget.id}/`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove sub-admin.");
      setSubAdmins((prev) => prev.filter((sa) => sa.id !== removeSubAdminTarget.id));
      setRemoveSubAdminTarget(null);
    } catch (err) {
      console.error(err);
      showToast("Could not remove sub-admin. Please try again. / सब-एडमिन हटाउन सकिएन, फेरि प्रयास गर्नुहोस्।");
    } finally {
      setRemoveSubAdminBusy(false);
    }
  }

  async function approveTeacher(id: number) {
    const res = await authFetch(`/api/${id}/approve/`, { method: "PATCH" });

    if (!res.ok) {
      showToast("Approve failed. / स्वीकृत गर्न असफल भयो।");
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

  function viewSchool(schoolId: number) {
    router.push(`/admin/school/${schoolId}`);
  }

  return (
    <div className="min-h-screen bg-[#eef3fb] flex">
      <Toast message={toast} onClose={() => setToast("")} />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentRequestsCount={documentRequests.length}
        transferRequestsCount={transferRequests.length}
        schoolRequestsCount={schoolRequests.length}
        canExportData={canExportData}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-[#0f2044]">Admin Dashboard</h1>
            <p className="text-gray-500 mt-2">Manage teacher registrations and approvals</p>
          </div>
          {canExportData && (
            <button
              onClick={downloadExcelExport}
              disabled={exportBusy}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl transition text-sm font-semibold shadow-sm disabled:opacity-60"
            >
              <Download size={16} />
              {exportBusy ? "Exporting..." : "Export Data (Excel)"}
            </button>
          )}
        </div>

        {activeTab === "dashboard" && (
          <DashboardTab
            stats={stats}
            setActiveTab={setActiveTab}
            onApproveTeacher={approveTeacher}
            onOpenTeacherRejectModal={openTeacherRejectModal}
            onViewTeacher={viewTeacher}
          />
        )}

        {activeTab === "total" && (
          <TeacherListTab
            title="All Teachers"
            titleClassName="text-[#0f2044]"
            teachers={[...stats.pending_teachers, ...stats.approved_teachers]}
            variant="simple"
            onView={viewTeacher}
          />
        )}

        {activeTab === "pending" && (
          <TeacherListTab
            title="Pending Teachers"
            titleClassName="text-yellow-600"
            teachers={stats.pending_teachers}
            variant="simple"
            onView={viewTeacher}
          />
        )}

        {activeTab === "approved" && (
          <TeacherListTab
            title="Approved Teachers"
            titleClassName="text-green-600"
            teachers={stats.approved_teachers}
            variant="simple"
            onView={viewTeacher}
          />
        )}

        {activeTab === "rejected" && (
          <TeacherListTab
            title="Rejected Teachers"
            titleClassName="text-red-600"
            teachers={stats.rejected_teachers}
            variant="card"
            emptyMessage="No rejected teachers."
            onView={viewTeacher}
          />
        )}

        {activeTab === "document-requests" && (
          <DocumentRequestsTab
            documentRequests={documentRequests}
            error={docRequestError}
            busyId={docRequestBusyId}
            onPreview={previewDocumentFile}
            onApprove={approveDocumentRequest}
            onOpenReject={openRejectModal}
          />
        )}

        {activeTab === "transfer-requests" && (
          <TransferRequestsTab
            transferRequests={transferRequests}
            error={transferRequestError}
            busyId={transferRequestBusyId}
            onViewDocument={viewTransferDocument}
            onApprove={approveTransferRequest}
            onOpenReject={openTransferRejectModal}
          />
        )}

        {activeTab === "schools" && (
          <SchoolRequestsTab
            schoolRequests={schoolRequests}
            error={schoolRequestError}
            busyId={schoolRequestBusyId}
            expandedId={expandedSchoolRequestId}
            onToggleExpand={(id) => setExpandedSchoolRequestId(expandedSchoolRequestId === id ? null : id)}
            onApprove={approveSchoolRequest}
            onOpenReject={openSchoolRejectModal}
            onView={viewSchool}
          />
        )}

        {activeTab === "approved-schools" && canExportData && (
          <ApprovedSchoolsTab
            approvedSchools={approvedSchools}
            error={approvedSchoolsError}
            expandedId={expandedApprovedSchoolId}
            onToggleExpand={(id) => setExpandedApprovedSchoolId(expandedApprovedSchoolId === id ? null : id)}
            downloadingId={downloadingSchoolReportId}
            onDownloadReport={downloadSchoolReport}
            onView={viewSchool}
            exportBusy={approvedSchoolsExportBusy}
            onExportAll={downloadApprovedSchoolsExcel}
          />
        )}

        {activeTab === "sub-admins" && isAdmin && (
          <SubAdminsTab
            subAdmins={subAdmins}
            error={subAdminListError}
            onAdd={() => setShowAddSubAdminModal(true)}
            onRemove={openRemoveSubAdminModal}
          />
        )}
      </div>

      <AddSubAdminModal
        open={showAddSubAdminModal}
        name={subAdminName}
        email={subAdminEmail}
        password={subAdminPassword}
        error={subAdminError}
        success={subAdminSuccess}
        loading={subAdminLoading}
        onChangeName={setSubAdminName}
        onChangeEmail={setSubAdminEmail}
        onChangePassword={setSubAdminPassword}
        onSubmit={handleAddSubAdmin}
        onClose={() => {
          setShowAddSubAdminModal(false);
          setSubAdminError("");
          setSubAdminSuccess("");
        }}
      />

      <DocumentPreviewModal
        open={previewOpen}
        title={previewTitle}
        url={previewUrl}
        isPdf={previewIsPdf}
        loading={previewLoading}
        error={previewError}
        requestId={previewRequestId}
        busyId={docRequestBusyId}
        onApproveAndClose={async () => {
          if (previewRequestId == null) return;
          await approveDocumentRequest(previewRequestId);
          closePreview();
        }}
        onOpenReject={openRejectModal}
        onClose={closePreview}
      />

      <RejectReasonModal
        open={rejectModalOpen}
        title="Reject Document"
        subtitle="A reason is required so the teacher knows what to fix"
        reason={rejectReason}
        error={rejectReasonError}
        busy={docRequestBusyId === rejectTargetId}
        placeholder="e.g. Document is blurry, please re-upload a clear scan"
        onChangeReason={(v) => {
          setRejectReason(v);
          if (rejectReasonError) setRejectReasonError("");
        }}
        onSubmit={submitRejectDocumentRequest}
        onClose={closeRejectModal}
      />

      <RejectReasonModal
        open={transferRejectModalOpen}
        title="Reject Transfer"
        subtitle="A reason is required so the teacher knows what to fix"
        reason={transferRejectReason}
        error={transferRejectReasonError}
        busy={transferRequestBusyId === transferRejectTargetId}
        placeholder="e.g. Transfer order does not match the school entered"
        onChangeReason={(v) => {
          setTransferRejectReason(v);
          if (transferRejectReasonError) setTransferRejectReasonError("");
        }}
        onSubmit={submitRejectTransferRequest}
        onClose={closeTransferRejectModal}
      />

      <RejectReasonModal
        open={schoolRejectModalOpen}
        title="Reject School"
        subtitle="A reason is required so the principal knows what to fix"
        reason={schoolRejectReason}
        error={schoolRejectReasonError}
        busy={schoolRequestBusyId === schoolRejectTargetId}
        placeholder="e.g. Land area and building count don't match"
        onChangeReason={(v) => {
          setSchoolRejectReason(v);
          if (schoolRejectReasonError) setSchoolRejectReasonError("");
        }}
        onSubmit={submitRejectSchoolRequest}
        onClose={closeSchoolRejectModal}
      />

      <RejectReasonModal
        open={teacherRejectModalOpen && !!teacherRejectTarget}
        title={teacherRejectTarget ? `Reject ${teacherRejectTarget.name}'s Application` : "Reject Application"}
        subtitle="A reason is required so the teacher knows what to fix"
        reason={teacherRejectReason}
        error={teacherRejectReasonError}
        busy={teacherRejectBusy}
        placeholder="e.g. Missing teaching license, please resubmit application"
        onChangeReason={(v) => {
          setTeacherRejectReason(v);
          if (teacherRejectReasonError) setTeacherRejectReasonError("");
        }}
        onSubmit={submitRejectTeacher}
        onClose={closeTeacherRejectModal}
      />

      <RemoveSubAdminModal
        target={removeSubAdminTarget}
        busy={removeSubAdminBusy}
        onCancel={closeRemoveSubAdminModal}
        onConfirm={confirmRemoveSubAdmin}
      />
    </div>
  );
}