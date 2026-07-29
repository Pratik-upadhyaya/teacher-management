import { Check, ChevronDown, ChevronUp, FileText } from "lucide-react";
import TeacherQuotaSummary from "@/components/TeacherQuotaSummary";

type SchoolRequestsTabProps = {
  schoolRequests: any[];
  error: string;
  busyId: number | null;
  expandedId: number | null;
  onToggleExpand: (id: number) => void;
  onApprove: (id: number) => void;
  onOpenReject: (id: number) => void;
  onView: (id: number) => void;
};

export default function SchoolRequestsTab({
  schoolRequests,
  error,
  busyId,
  expandedId,
  onToggleExpand,
  onApprove,
  onOpenReject,
  onView,
}: SchoolRequestsTabProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0f2044]">Pending School Submissions</h2>
        <p className="text-sm text-gray-500">
          A principal's school only goes live once reviewed here. Editing an approved or rejected
          school resets it to pending.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {schoolRequests.length === 0 ? (
        <p className="text-gray-500 py-4">No pending school submissions.</p>
      ) : (
        <div className="space-y-4">
          {schoolRequests.map((s) => {
            const busy = busyId === s.id;
            return (
              <div key={s.id} className="border rounded-xl p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-[#0f2044]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0f2044]">{s.school_name}</h3>
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
                      onClick={() => onApprove(s.id)}
                      disabled={busy}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-60 text-sm font-semibold"
                    >
                      <Check size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => onOpenReject(s.id)}
                      disabled={busy}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 text-sm font-semibold"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => onView(s.id)}
                      className="px-4 py-2 bg-[#0f2044] text-white rounded-lg hover:bg-[#1a3260] text-sm font-semibold"
                    >
                      View
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
                  onClick={() => onToggleExpand(s.id)}
                  className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#0f2044] hover:underline"
                >
                  {expandedId === s.id ? (
                    <>
                      <ChevronUp size={14} /> Hide Teacher Quota
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} /> View Teacher Quota / दरबन्दी
                    </>
                  )}
                </button>

                {expandedId === s.id && (
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
  );
}
