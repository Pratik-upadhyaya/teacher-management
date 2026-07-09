"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api";
import { Download, UserPlus, Trash2, X } from "lucide-react";

type Teacher = {
  id: number;
  name: string;
  tokenNo: string;
  subject: string;
  phone?: string;
  email?: string;
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

  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [subAdminListError, setSubAdminListError] = useState("");
  const [showAddSubAdminModal, setShowAddSubAdminModal] = useState(false);
  const [subAdminName, setSubAdminName] = useState("");
  const [subAdminEmail, setSubAdminEmail] = useState("");
  const [subAdminPassword, setSubAdminPassword] = useState("");
  const [subAdminError, setSubAdminError] = useState("");
  const [subAdminSuccess, setSubAdminSuccess] = useState("");
  const [subAdminLoading, setSubAdminLoading] = useState(false);

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

  useEffect(() => {
    loadDashboard();
    loadSubAdmins();
  }, []);

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

  async function rejectTeacher(id: number) {
    const res = await authFetch(`/api/${id}/reject/`, { method: "PATCH" });

    if (!res.ok) {
      alert("Reject failed");
      return;
    }

    loadDashboard();
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
              onClick={() => setActiveTab("sub-admins")}
              className={`w-full text-left px-4 py-3 rounded-xl transition ${
                activeTab === "sub-admins"
                  ? "bg-white text-[#0f2044] font-semibold"
                  : "hover:bg-blue-900"
              }`}
            >
              Sub-Admins
            </button>
          </div>
        </div>

        <div className="p-5">
          <button className="w-full bg-red-500 hover:bg-red-600 py-3 rounded-xl font-semibold">
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
                          onClick={() => rejectTeacher(teacher.id)}
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

            <p className="text-gray-500">
              Rejected teachers will appear here.
            </p>
          </div>
        )}

        {/* Sub-Admins Tab */}
        {activeTab === "sub-admins" && (
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
    </div>
  );
}