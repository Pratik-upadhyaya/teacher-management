"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  function loadDashboard() {
    fetch("http://127.0.0.1:8000/api/dashboard/stats/")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function approveTeacher(id: number) {
    const res = await fetch(
      `http://127.0.0.1:8000/api/register/${id}/approve/`,
      { method: "PATCH" }
    );

    if (!res.ok) {
      alert("Approve failed");
      return;
    }

    loadDashboard();
  }

  async function rejectTeacher(id: number) {
    const res = await fetch(
      `http://127.0.0.1:8000/api/register/${id}/reject/`,
      { method: "PATCH" }
    );

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#0f2044]">
            Admin Dashboard
          </h1>
          <p className="text-gray-500 mt-2">
            Manage teacher registrations and approvals
          </p>
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
      </div>
    </div>
  );
}