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
      <div className="w-72 bg-[#0b2c5f] text-white p-6 flex flex-col">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-gray-300 mb-10">Department Head</p>

          <p className="text-gray-400 mb-4 font-bold">MAIN</p>

          <div className="space-y-3">
            <button
              onClick={() => setActiveTab("dashboard")}
              className="w-full flex justify-between p-4 rounded-xl hover:bg-blue-500"
            >
              Dashboard <span>{stats.total_teachers}</span>
            </button>

            <button
              onClick={() => setActiveTab("total")}
              className="w-full flex justify-between p-4 rounded-xl hover:bg-blue-500"
            >
              Total Teachers <span>{stats.total_teachers}</span>
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              className="w-full flex justify-between p-4 rounded-xl hover:bg-blue-500"
            >
              Pending Teachers <span>{stats.pending_approvals}</span>
            </button>

            <button
              onClick={() => setActiveTab("approved")}
              className="w-full flex justify-between p-4 rounded-xl hover:bg-blue-500"
            >
              Approved Teachers <span>{stats.approved}</span>
            </button>

            <button
              onClick={() => setActiveTab("rejected")}
              className="w-full flex justify-between p-4 rounded-xl hover:bg-blue-500"
            >
              Rejected Teachers <span>{stats.rejected}</span>
            </button>
          </div>
        </div>

        <div className="mt-auto">
          <div className="p-3 hover:bg-red-500 rounded-xl cursor-pointer">
            Logout
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 p-8">
        <h1 className="text-5xl font-bold text-[#0b2c5f] mb-2">
          Good Morning, Admin 👋
        </h1>
        <p className="text-gray-500 mb-8">Teacher Management Dashboard</p>

        {activeTab === "dashboard" && (
          <>
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div
                onClick={() => setActiveTab("total")}
                className="bg-white rounded-2xl shadow p-6 border-l-4 border-blue-500 cursor-pointer hover:bg-blue-50"
              >
                <p>Total Teachers</p>
                <h2 className="text-4xl font-bold">{stats.total_teachers}</h2>
              </div>

              <div
                onClick={() => setActiveTab("pending")}
                className="bg-white rounded-2xl shadow p-6 border-l-4 border-yellow-500 cursor-pointer hover:bg-yellow-50"
              >
                <p>Pending</p>
                <h2 className="text-4xl font-bold">{stats.pending_approvals}</h2>
              </div>

              <div
                onClick={() => setActiveTab("approved")}
                className="bg-white rounded-2xl shadow p-6 border-l-4 border-green-500 cursor-pointer hover:bg-green-50"
              >
                <p>Approved</p>
                <h2 className="text-4xl font-bold">{stats.approved}</h2>
              </div>

              <div
                onClick={() => setActiveTab("rejected")}
                className="bg-white rounded-2xl shadow p-6 border-l-4 border-red-500 cursor-pointer hover:bg-red-50"
              >
                <p>Rejected</p>
                <h2 className="text-4xl font-bold">{stats.rejected}</h2>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-2xl font-bold mb-4">
                Pending Teacher Approvals
              </h2>

              {stats.pending_teachers.length === 0 ? (
                <p>No pending teachers.</p>
              ) : (
                <table className="w-full">
                  <tbody>
                    {stats.pending_teachers.map((teacher) => (
                      <tr key={teacher.id} className="border-b">
                        <td className="p-4">{teacher.name}</td>
                        <td className="p-4">{teacher.tokenNo}</td>
                        <td className="p-4">{teacher.subject}</td>
                        <td className="p-4">
                          <button onClick={() => approveTeacher(teacher.id)}>
                            Approve
                          </button>
                          <button onClick={() => rejectTeacher(teacher.id)}>
                            Reject
                          </button>
                          <button onClick={() => viewTeacher(teacher)}>
                            👁
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === "total" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold mb-4">All Teachers</h2>
            {[...stats.pending_teachers, ...stats.approved_teachers].map(
              (teacher) => (
                <div
                  key={teacher.id}
                  className="flex justify-between border-b py-4"
                >
                  <div>
                    {teacher.name} - {teacher.subject}
                  </div>
                  <button onClick={() => viewTeacher(teacher)}>👁</button>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === "pending" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold">Pending Teachers</h2>
          </div>
        )}

        {activeTab === "approved" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Approved Teachers</h2>
            {stats.approved_teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex justify-between border-b py-4"
              >
                <div>
                  {teacher.name} - {teacher.subject}
                </div>
                <button onClick={() => viewTeacher(teacher)}>👁</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "rejected" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-2xl font-bold">Rejected Teachers</h2>
          </div>
        )}
      </div>
    </div>
  );
}