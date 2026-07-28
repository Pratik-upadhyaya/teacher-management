"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchDocumentBlobUrl, logout } from "@/lib/api";
import { SUBJECT_LABELS, formatTeacherField } from "@/lib/teacherLabels";
import { Download, UserPlus, Trash2, X, Check, FileText, ChevronDown, ChevronUp } from "lucide-react";
import ExcelJS from "exceljs";
import TeacherQuotaSummary from "@/components/TeacherQuotaSummary";

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
  const [exportError, setExportError] = useState("");

  // Document/image fields on Teacher -- deliberately excluded from the
  // export per the client's "all data excluding images" requirement.
  // School has no file fields, so nothing to exclude there.
  const TEACHER_FILE_FIELDS = ["citizenship", "degree", "photo", "teachingLicense", "appointmentLetter"];

  async function downloadExcelExport() {
    setExportBusy(true);
    setExportError("");
    try {
      const [teachersRes, schoolsRes] = await Promise.all([
        authFetch("/api/"),
        authFetch("/api/schools/"),
      ]);
      if (!teachersRes.ok || !schoolsRes.ok) {
        throw new Error("Could not load data for export.");
      }
      const teachers = await teachersRes.json();
      const schools = await schoolsRes.json();

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "EDCU Kaski Teacher Portal";
      workbook.created = new Date();

      // ── Teachers sheet ──────────────────────────────────────────
      const teacherSheet = workbook.addWorksheet("Teachers");
      teacherSheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Name", key: "name", width: 22 },
        { header: "Name (English)", key: "nameEnglish", width: 22 },
        { header: "Father's Name", key: "fatherName", width: 22 },
        { header: "Gender", key: "gender", width: 10 },
        { header: "Permanent Address", key: "permanentAddress", width: 28 },
        { header: "Ward No (Permanent)", key: "permanentWardNo", width: 14 },
        { header: "Date of Birth", key: "dob", width: 14 },
        { header: "Phone", key: "phone", width: 14 },
        { header: "Email", key: "email", width: 26 },
        { header: "District", key: "district", width: 16 },
        { header: "Municipality", key: "municipality", width: 18 },
        { header: "Ward No (School)", key: "wardNo", width: 14 },
        { header: "School Name", key: "schoolName", width: 26 },
        { header: "School EMIS Code", key: "schoolEmisCode", width: 16 },
        { header: "Linked School ID", key: "school", width: 14 },
        { header: "Code / Token No.", key: "tokenNo", width: 16 },
        { header: "Subject", key: "subject", width: 16 },
        { header: "Level", key: "level", width: 16 },
        { header: "Grade", key: "grade", width: 12 },
        { header: "Type", key: "teacherType", width: 14 },
        { header: "Appointment Date", key: "appointmentDate", width: 16 },
        { header: "Promotion Date", key: "promotionDate", width: 16 },
        { header: "Min. Qualification", key: "minQualification", width: 16 },
        { header: "Highest Qualification", key: "highestQualification", width: 18 },
        { header: "Extraordinary Leave Taken", key: "extraordinaryLeave", width: 18 },
        { header: "Extraordinary Leave Remaining", key: "extraordinaryLeaveRemaining", width: 20 },
        { header: "Age 60 Year (BS)", key: "ageSixtyYear", width: 16 },
        { header: "Remarks", key: "remarks", width: 28 },
        { header: "Status", key: "status", width: 12 },
        { header: "Created At", key: "created_at", width: 20 },
        { header: "Reviewed By (User ID)", key: "reviewed_by", width: 16 },
      ];
      teacherSheet.getRow(1).font = { bold: true };
      for (const t of teachers) {
        const row: Record<string, any> = {};
        for (const col of teacherSheet.columns) {
          const key = col.key as string;
          if (TEACHER_FILE_FIELDS.includes(key)) continue;
          row[key] = t[key];
        }
        teacherSheet.addRow(row);
      }

      // ── Schools sheet ────────────────────────────────────────────
      const schoolSheet = workbook.addWorksheet("Schools");
      schoolSheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "School Name", key: "school_name", width: 26 },
        { header: "EMIS Code", key: "emis_code", width: 16 },
        { header: "Address", key: "address", width: 26 },
        { header: "District", key: "district", width: 14 },
        { header: "Municipality", key: "municipality", width: 26 },
        { header: "Ward No.", key: "ward_no", width: 10 },
        { header: "Contact", key: "contact", width: 16 },
        { header: "Email", key: "email", width: 24 },
        { header: "Established (BS)", key: "established_bs", width: 16 },
        { header: "Permission Date (BS)", key: "permission_date_bs", width: 18 },
        { header: "Bal Kaksha Year", key: "bal_kaksha", width: 14 },
        { header: "Primary (1-5) Year", key: "primary_1_5", width: 16 },
        { header: "Lower Sec (6-8) Year", key: "lower_secondary_6_8", width: 18 },
        { header: "Secondary (9-10) Year", key: "secondary_9_10", width: 18 },
        { header: "Secondary (11-12) Year", key: "secondary_11_12", width: 18 },
        { header: "Computer Lab", key: "computer_lab", width: 12 },
        { header: "Science Lab", key: "science_lab", width: 12 },
        { header: "Library", key: "library", width: 10 },
        { header: "Book Corner", key: "book_corner", width: 12 },
        { header: "Playground", key: "playground", width: 12 },
        { header: "Land Unit System", key: "land_unit_system", width: 16 },
        { header: "Land (Sq. Meter)", key: "land_sqm", width: 14 },
        { header: "Land (Ropani)", key: "land_ropani", width: 12 },
        { header: "Land (Aana)", key: "land_aana", width: 12 },
        { header: "Land (Paisa)", key: "land_paisa", width: 12 },
        { header: "Land (Daan)", key: "land_daan", width: 12 },
        { header: "Land (Bigha)", key: "land_bigha", width: 12 },
        { header: "Land (Kattha)", key: "land_kattha", width: 12 },
        { header: "Land (Dhur)", key: "land_dhur", width: 12 },
        { header: "Building Count", key: "building_count", width: 14 },
        { header: "Classroom Count", key: "classroom_count", width: 14 },
        { header: "Female Toilets", key: "female_toilets", width: 14 },
        { header: "Male Toilets", key: "male_toilets", width: 14 },
        { header: "Principal", key: "principalName", width: 20 },
        { header: "Status", key: "status", width: 12 },
        { header: "Remarks", key: "remarks", width: 26 },
        { header: "Reviewed By", key: "reviewedByName", width: 18 },
        { header: "Reviewed At", key: "reviewed_at", width: 20 },
        { header: "Created At", key: "created_at", width: 20 },
      ];
      schoolSheet.getRow(1).font = { bold: true };
      for (const s of schools) {
        schoolSheet.addRow(s);
      }

      // ── Teacher Summary sheet ───────────────────────────────────
      // Mirrors school_bibarA_Kaski_2083.xlsx's layout (one row per
      // school, two-tier merged header: a group column spanning several
      // sub-columns, with a Total per group) but pivots on teacher Type ×
      // Level instead of the government file's Class × Gender headcounts
      // -- this system doesn't track enrolled students, so that half is
      // intentionally not replicated.
      //
      // Counts only status === "approved" teachers -- this sheet is a
      // staffing headcount, not an application list (the Teachers sheet
      // above already has every application regardless of status,
      // including pending/rejected, which shouldn't inflate a school's
      // "how many teachers does it have" figure).
      //
      // A teacher whose `school` FK never resolved (EMIS typo, school not
      // yet registered, etc.) can't be attributed to any row here; those
      // are rolled into a trailing "Unlinked" row instead of silently
      // dropped, so the grand total still reconciles against the full
      // approved-teacher count.
      const SUMMARY_LEVELS: { key: string; label: string }[] = [
        { key: "primary", label: "Primary (1-5)" },
        { key: "lower_secondary", label: "Lower Sec (6-8)" },
        { key: "secondary", label: "Secondary (9-10)" },
        { key: "higher_secondary", label: "Higher Sec (11-12)" },
        { key: "unspecified", label: "Level Not Specified" },
      ];
      const SUMMARY_TYPES: { key: string; label: string }[] = [
        { key: "permanent", label: "Permanent" },
        { key: "temporary", label: "Temporary" },
        { key: "grant", label: "Grant" },
        { key: "shi_anudan", label: "Shi Anudan" },
        { key: "relief", label: "Relief" },
        { key: "private", label: "Private" },
        { key: "unspecified", label: "Type Not Specified" },
      ];

      function bumpPivot(
        bucket: Map<string, Map<string, number>>,
        level: string,
        type: string
      ) {
        if (!bucket.has(level)) bucket.set(level, new Map());
        const byType = bucket.get(level)!;
        byType.set(type, (byType.get(type) || 0) + 1);
      }

      const approvedTeachers = teachers.filter((t: any) => t.status === "approved");
      const pivotBySchool = new Map<number, Map<string, Map<string, number>>>();
      const unlinkedPivot = new Map<string, Map<string, number>>();
      let unlinkedCount = 0;

      for (const t of approvedTeachers) {
        const level = SUMMARY_LEVELS.some((l) => l.key === t.level) ? t.level : "unspecified";
        const type = SUMMARY_TYPES.some((ty) => ty.key === t.teacherType) ? t.teacherType : "unspecified";
        if (t.school) {
          if (!pivotBySchool.has(t.school)) pivotBySchool.set(t.school, new Map());
          bumpPivot(pivotBySchool.get(t.school)!, level, type);
        } else {
          unlinkedCount++;
          bumpPivot(unlinkedPivot, level, type);
        }
      }

      const teacherSummarySheet = workbook.addWorksheet("Teacher Summary");

      const identityCols = [
        { header: "S.N", width: 6 },
        { header: "School Name", width: 26 },
        { header: "EMIS Code", width: 16 },
        { header: "District", width: 14 },
        { header: "Municipality", width: 24 },
        { header: "Ward No.", width: 10 },
      ];

      const summaryHeaderRow1 = teacherSummarySheet.getRow(1);
      const summaryHeaderRow2 = teacherSummarySheet.getRow(2);

      identityCols.forEach((c, i) => {
        const col = i + 1;
        teacherSummarySheet.getColumn(col).width = c.width;
        teacherSummarySheet.mergeCells(1, col, 2, col);
        summaryHeaderRow1.getCell(col).value = c.header;
      });

      let colPtr = identityCols.length + 1;
      const levelColRanges: { level: string; start: number; end: number }[] = [];
      for (const lvl of SUMMARY_LEVELS) {
        const start = colPtr;
        for (const ty of SUMMARY_TYPES) {
          teacherSummarySheet.getColumn(colPtr).width = 12;
          summaryHeaderRow2.getCell(colPtr).value = ty.label;
          colPtr++;
        }
        teacherSummarySheet.getColumn(colPtr).width = 12;
        summaryHeaderRow2.getCell(colPtr).value = "Total";
        const end = colPtr;
        teacherSummarySheet.mergeCells(1, start, 1, end);
        summaryHeaderRow1.getCell(start).value = lvl.label;
        levelColRanges.push({ level: lvl.key, start, end });
        colPtr = end + 1;
      }
      teacherSummarySheet.getColumn(colPtr).width = 14;
      teacherSummarySheet.mergeCells(1, colPtr, 2, colPtr);
      summaryHeaderRow1.getCell(colPtr).value = "Grand Total";
      const grandTotalCol = colPtr;

      summaryHeaderRow1.font = { bold: true };
      summaryHeaderRow2.font = { bold: true };
      summaryHeaderRow1.alignment = { horizontal: "center", vertical: "middle" };
      summaryHeaderRow2.alignment = { horizontal: "center", vertical: "middle" };

      let summaryRowPtr = 3;
      let summarySn = 1;
      function writeSummaryRow(
        identity: (string | number)[],
        byLevelType: Map<string, Map<string, number>>
      ) {
        const row = teacherSummarySheet.getRow(summaryRowPtr);
        identity.forEach((v, i) => {
          row.getCell(i + 1).value = v;
        });
        let grand = 0;
        for (const { level, start, end } of levelColRanges) {
          const byType = byLevelType.get(level);
          let levelTotal = 0;
          let c = start;
          for (const ty of SUMMARY_TYPES) {
            const count = byType?.get(ty.key) || 0;
            row.getCell(c).value = count;
            levelTotal += count;
            c++;
          }
          row.getCell(end).value = levelTotal;
          grand += levelTotal;
        }
        row.getCell(grandTotalCol).value = grand;
        summaryRowPtr++;
      }

      for (const s of schools) {
        writeSummaryRow(
          [summarySn++, s.school_name, s.emis_code, s.district, s.municipality, s.ward_no],
          pivotBySchool.get(s.id) || new Map()
        );
      }

      if (unlinkedCount > 0) {
        writeSummaryRow(
          [summarySn++, "— Unlinked (no matched School record) —", "", "", "", ""],
          unlinkedPivot
        );
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `teacher_portal_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message || "Export failed. Please try again.");
      showToast("Export failed. Please try again. / निर्यात असफल भयो।");
    } finally {
      setExportBusy(false);
    }
  }

  // Approved-schools-only export -- same column set as the Schools sheet
  // in the full export above (our own stored fields; deliberately not
  // trying to replicate the government per-grade/gender headcount
  // columns, which this system doesn't track), but scoped to just the
  // already-loaded approvedSchools list and its own single-sheet file.
  async function downloadSchoolReport(school: any) {
    setDownloadingSchoolReportId(school.id);
    try {
      const res = await authFetch(`/api/schools/${school.id}/export/`);
      if (!res.ok) {
        throw new Error("Export failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${school.school_name || "school"}_${school.emis_code || ""}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
      const res = await authFetch("/api/schools/export-all/");
      if (!res.ok) {
        throw new Error("Export failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `all_schools_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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

  return (
    <div className="min-h-screen bg-[#eef3fb] flex">
      {/* Toast — replaces alert() */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] max-w-sm bg-white border border-red-200 shadow-lg rounded-xl px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
          <p className="text-sm text-gray-700 flex-1">{toast}</p>
          <button
            onClick={() => setToast("")}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

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

            <button
              onClick={() => setActiveTab("transfer-requests")}
              className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between ${
                activeTab === "transfer-requests"
                  ? "bg-white text-[#0f2044] font-semibold"
                  : "hover:bg-blue-900"
              }`}
            >
              <span>Transfer Requests</span>
              {transferRequests.length > 0 && (
                <span className="bg-amber-400 text-[#0f2044] text-xs font-bold px-2 py-0.5 rounded-full">
                  {transferRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("schools")}
              className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between ${
                activeTab === "schools"
                  ? "bg-white text-[#0f2044] font-semibold"
                  : "hover:bg-blue-900"
              }`}
            >
              <span>Schools</span>
              {schoolRequests.length > 0 && (
                <span className="bg-amber-400 text-[#0f2044] text-xs font-bold px-2 py-0.5 rounded-full">
                  {schoolRequests.length}
                </span>
              )}
            </button>

            {canExportData && (
              <button
                onClick={() => setActiveTab("approved-schools")}
                className={`w-full text-left px-4 py-3 rounded-xl transition ${
                  activeTab === "approved-schools"
                    ? "bg-white text-[#0f2044] font-semibold"
                    : "hover:bg-blue-900"
                }`}
              >
                Approved Schools
              </button>
            )}

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
                          Subject: {formatTeacherField(SUBJECT_LABELS, teacher.subject)}
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
                    <p className="text-gray-500">{formatTeacherField(SUBJECT_LABELS, teacher.subject)}</p>
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
                  <p className="text-gray-500">{formatTeacherField(SUBJECT_LABELS, teacher.subject)}</p>
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
                  <p className="text-gray-500">{formatTeacherField(SUBJECT_LABELS, teacher.subject)}</p>
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
                      <p className="text-gray-500">Subject: {formatTeacherField(SUBJECT_LABELS, teacher.subject)}</p>
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

        {activeTab === "transfer-requests" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#0f2044]">
                Pending Transfer Requests
              </h2>
              <p className="text-sm text-gray-500">
                A teacher's school only changes once their transfer request and
                document are approved here.
              </p>
            </div>

            {transferRequestError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                {transferRequestError}
              </div>
            )}

            {transferRequests.length === 0 ? (
              <p className="text-gray-500 py-4">No pending transfer requests.</p>
            ) : (
              <div className="space-y-4">
                {transferRequests.map((r) => {
                  const busy = transferRequestBusyId === r.id;
                  return (
                    <div
                      key={r.id}
                      className="border rounded-xl p-5 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-[#0f2044]" />
                          </div>
                          <div>
                            <h3 className="font-bold text-[#0f2044]">
                              {r.teacherName}
                            </h3>
                            <p className="text-gray-500 text-sm">
                              {r.old_school_name || "—"} → {r.new_school_name}
                            </p>
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
                            onClick={() => viewTransferDocument(r.transfer_document)}
                            className="px-4 py-2 bg-gray-50 text-[#0f2044] rounded-lg hover:bg-gray-100 text-sm font-semibold"
                          >
                            View
                          </button>
                          <button
                            onClick={() => approveTransferRequest(r.id)}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-60 text-sm font-semibold"
                          >
                            <Check size={14} />
                            Approve
                          </button>
                          <button
                            onClick={() => openTransferRejectModal(r.id)}
                            disabled={busy}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 text-sm font-semibold"
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-gray-100 pt-3">
                        <div>
                          <div className="text-gray-400">New EMIS Code</div>
                          <div className="text-gray-700 font-medium">{r.new_school_emis_code || "—"}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">New District</div>
                          <div className="text-gray-700 font-medium">{r.new_district || "—"}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">New Municipality</div>
                          <div className="text-gray-700 font-medium">{r.new_municipality || "—"}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Ward No.</div>
                          <div className="text-gray-700 font-medium">{r.new_ward_no || "—"}</div>
                        </div>
                      </div>
                      {r.reason && (
                        <div className="mt-3 text-sm text-gray-500 border-t border-gray-100 pt-3">
                          <span className="text-gray-400">Reason: </span>
                          {r.reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "schools" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#0f2044]">
                Pending School Submissions
              </h2>
              <p className="text-sm text-gray-500">
                A principal's school only goes live once reviewed here.
                Editing an approved or rejected school resets it to pending.
              </p>
            </div>

            {schoolRequestError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                {schoolRequestError}
              </div>
            )}

            {schoolRequests.length === 0 ? (
              <p className="text-gray-500 py-4">No pending school submissions.</p>
            ) : (
              <div className="space-y-4">
                {schoolRequests.map((s) => {
                  const busy = schoolRequestBusyId === s.id;
                  return (
                    <div
                      key={s.id}
                      className="border rounded-xl p-5 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-[#0f2044]" />
                          </div>
                          <div>
                            <h3 className="font-bold text-[#0f2044]">
                              {s.school_name}
                            </h3>
                            <p className="text-gray-500 text-sm">
                              EMIS: {s.emis_code} · Principal: {s.principalName || "—"}
                            </p>
                            <p className="text-gray-400 text-xs">
                              Submitted{" "}
                              {new Date(s.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => approveSchoolRequest(s.id)}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-60 text-sm font-semibold"
                          >
                            <Check size={14} />
                            Approve
                          </button>
                          <button
                            onClick={() => openSchoolRejectModal(s.id)}
                            disabled={busy}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 text-sm font-semibold"
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-gray-100 pt-3">
                        <div>
                          <div className="text-gray-400">Address</div>
                          <div className="text-gray-700 font-medium">{s.address || "—"}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Contact</div>
                          <div className="text-gray-700 font-medium">{s.contact || "—"}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Email</div>
                          <div className="text-gray-700 font-medium">{s.email || "—"}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Established (BS)</div>
                          <div className="text-gray-700 font-medium">{s.established_bs || "—"}</div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          setExpandedSchoolRequestId(
                            expandedSchoolRequestId === s.id ? null : s.id
                          )
                        }
                        className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#0f2044] hover:underline"
                      >
                        {expandedSchoolRequestId === s.id ? (
                          <>
                            <ChevronUp size={14} /> Hide Teacher Quota
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} /> View Teacher Quota / दरबन्दी
                          </>
                        )}
                      </button>

                      {expandedSchoolRequestId === s.id && (
                        <div className="mt-3 border-t border-gray-100 pt-3">
                          <TeacherQuotaSummary data={s} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Approved Schools Tab */}
        {activeTab === "approved-schools" && canExportData && (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="mb-6 flex justify-between items-start gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold text-[#0f2044]">
                  Approved Schools
                </h2>
                <p className="text-sm text-gray-500">
                  {approvedSchools.length} school
                  {approvedSchools.length === 1 ? "" : "s"} currently approved.
                </p>
              </div>
              <button
                onClick={downloadApprovedSchoolsExcel}
                disabled={approvedSchoolsExportBusy || approvedSchools.length === 0}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl transition text-sm font-semibold shadow-sm disabled:opacity-60"
              >
                <Download size={16} />
                {approvedSchoolsExportBusy ? "Exporting..." : "Export Approved Schools (Excel)"}
              </button>
            </div>

            {approvedSchoolsError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                {approvedSchoolsError}
              </div>
            )}

            {approvedSchools.length === 0 ? (
              <p className="text-gray-500 py-4">No approved schools yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b">
                      <th className="py-2 pr-4">School Name</th>
                      <th className="py-2 pr-4">EMIS Code</th>
                      <th className="py-2 pr-4">District / Municipality</th>
                      <th className="py-2 pr-4">Contact</th>
                      <th className="py-2 pr-4">Principal</th>
                      <th className="py-2 pr-4">Reviewed At</th>
                      <th className="py-2 pr-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedSchools.map((s) => (
                      <Fragment key={s.id}>
                        <tr className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2.5 pr-4 font-medium text-[#0f2044]">{s.school_name}</td>
                          <td className="py-2.5 pr-4 text-gray-600">{s.emis_code}</td>
                          <td className="py-2.5 pr-4 text-gray-600">
                            {s.municipality || "—"}
                            {s.ward_no ? `-${s.ward_no}` : ""}
                            {s.district ? `, ${s.district}` : ""}
                          </td>
                          <td className="py-2.5 pr-4 text-gray-600">{s.contact || "—"}</td>
                          <td className="py-2.5 pr-4 text-gray-600">{s.principalName || "—"}</td>
                          <td className="py-2.5 pr-4 text-gray-600">
                            {s.reviewed_at
                              ? new Date(s.reviewed_at).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="py-2.5 pr-2 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => downloadSchoolReport(s)}
                                disabled={downloadingSchoolReportId === s.id}
                                title="Download School Report"
                                className="flex items-center gap-1 text-xs font-semibold text-[#0f2044] hover:underline whitespace-nowrap disabled:opacity-50"
                              >
                                <Download size={14} />
                                {downloadingSchoolReportId === s.id ? "…" : "Report"}
                              </button>
                              <button
                                onClick={() =>
                                  setExpandedApprovedSchoolId(
                                    expandedApprovedSchoolId === s.id ? null : s.id
                                  )
                                }
                                className="flex items-center gap-1 text-xs font-semibold text-[#0f2044] hover:underline whitespace-nowrap"
                              >
                                {expandedApprovedSchoolId === s.id ? (
                                  <>
                                    Hide <ChevronUp size={14} />
                                  </>
                                ) : (
                                  <>
                                    दरबन्दी <ChevronDown size={14} />
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedApprovedSchoolId === s.id && (
                          <tr className="border-b border-gray-50">
                            <td colSpan={7} className="py-3 px-2 bg-gray-50/50">
                              <TeacherQuotaSummary data={s} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
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
                            onClick={() => openRemoveSubAdminModal(admin.id, admin.first_name || admin.username)}
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

      {transferRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#0f2044]">Reject Transfer</h3>
                <p className="text-xs text-gray-400">
                  A reason is required so the teacher knows what to fix
                </p>
              </div>
              <button
                onClick={closeTransferRejectModal}
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
                value={transferRejectReason}
                onChange={(e) => {
                  setTransferRejectReason(e.target.value);
                  if (transferRejectReasonError) setTransferRejectReasonError("");
                }}
                rows={4}
                placeholder="e.g. Transfer order does not match the school entered"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
              />
              {transferRejectReasonError && (
                <p className="text-red-600 text-xs mt-1.5">{transferRejectReasonError}</p>
              )}
            </div>

            <button
              onClick={submitRejectTransferRequest}
              disabled={transferRequestBusyId === transferRejectTargetId}
              className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60"
            >
              {transferRequestBusyId === transferRejectTargetId ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      )}

      {schoolRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#0f2044]">Reject School</h3>
                <p className="text-xs text-gray-400">
                  A reason is required so the principal knows what to fix
                </p>
              </div>
              <button
                onClick={closeSchoolRejectModal}
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
                value={schoolRejectReason}
                onChange={(e) => {
                  setSchoolRejectReason(e.target.value);
                  if (schoolRejectReasonError) setSchoolRejectReasonError("");
                }}
                rows={4}
                placeholder="e.g. Land area and building count don't match"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
              />
              {schoolRejectReasonError && (
                <p className="text-red-600 text-xs mt-1.5">{schoolRejectReasonError}</p>
              )}
            </div>

            <button
              onClick={submitRejectSchoolRequest}
              disabled={schoolRequestBusyId === schoolRejectTargetId}
              className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60"
            >
              {schoolRequestBusyId === schoolRejectTargetId ? "Rejecting..." : "Confirm Rejection"}
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
      {/* Remove Sub-Admin Confirmation Modal — replaces confirm() */}
      {removeSubAdminTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#0f2044]">Remove Sub-Admin</h3>
              <button
                onClick={closeRemoveSubAdminModal}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to remove <span className="font-semibold text-gray-800">{removeSubAdminTarget.name}</span> as a sub-admin? They will lose access immediately.
              <br />
              <span className="text-gray-400">
                के तपाईं <span className="font-semibold">{removeSubAdminTarget.name}</span> लाई सब-एडमिनबाट हटाउन चाहनुहुन्छ? उनीहरूको पहुँच तुरुन्तै हट्नेछ।
              </span>
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeRemoveSubAdminModal}
                className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveSubAdmin}
                disabled={removeSubAdminBusy}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-60"
              >
                {removeSubAdminBusy ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}