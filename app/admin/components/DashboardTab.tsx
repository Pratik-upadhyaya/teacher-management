import { SUBJECT_LABELS, formatTeacherField } from "@/lib/teacherLabels";
import type { Teacher } from "../types";

type Stats = {
  total_teachers: number;
  pending_approvals: number;
  approved: number;
  rejected: number;
  pending_teachers: Teacher[];
};

type DashboardTabProps = {
  stats: Stats;
  setActiveTab: (tab: string) => void;
  onApproveTeacher: (id: number) => void;
  onOpenTeacherRejectModal: (teacher: Teacher) => void;
  onViewTeacher: (teacher: Teacher) => void;
};

export default function DashboardTab({
  stats,
  setActiveTab,
  onApproveTeacher,
  onOpenTeacherRejectModal,
  onViewTeacher,
}: DashboardTabProps) {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div
          onClick={() => setActiveTab("total")}
          className="bg-white rounded-2xl p-6 shadow hover:shadow-lg cursor-pointer"
        >
          <p className="text-gray-500 mb-2">Total Teachers</p>
          <h2 className="text-4xl font-bold text-[#0f2044]">{stats.total_teachers}</h2>
        </div>

        <div
          onClick={() => setActiveTab("pending")}
          className="bg-white rounded-2xl p-6 shadow hover:shadow-lg cursor-pointer"
        >
          <p className="text-yellow-600 mb-2">Pending</p>
          <h2 className="text-4xl font-bold">{stats.pending_approvals}</h2>
        </div>

        <div
          onClick={() => setActiveTab("approved")}
          className="bg-white rounded-2xl p-6 shadow hover:shadow-lg cursor-pointer"
        >
          <p className="text-green-600 mb-2">Approved</p>
          <h2 className="text-4xl font-bold">{stats.approved}</h2>
        </div>

        <div
          onClick={() => setActiveTab("rejected")}
          className="bg-white rounded-2xl p-6 shadow hover:shadow-lg cursor-pointer"
        >
          <p className="text-red-600 mb-2">Rejected</p>
          <h2 className="text-4xl font-bold">{stats.rejected}</h2>
        </div>
      </div>

      {/* Pending Approval Section */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-2xl font-bold text-[#0f2044] mb-6">Pending Teacher Approvals</h2>

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
                  <h3 className="font-bold text-lg text-[#0f2044]">{teacher.name}</h3>
                  <p className="text-gray-500">Token: {teacher.tokenNo}</p>
                  <p className="text-gray-500">
                    Subject: {formatTeacherField(SUBJECT_LABELS, teacher.subject)}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => onApproveTeacher(teacher.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => onOpenTeacherRejectModal(teacher)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => onViewTeacher(teacher)}
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
  );
}
