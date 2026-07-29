import { Check, FileText } from "lucide-react";

type DocumentRequestsTabProps = {
  documentRequests: any[];
  error: string;
  busyId: number | null;
  onPreview: (id: number, label: string, path?: string | null) => void;
  onApprove: (id: number) => void;
  onOpenReject: (id: number) => void;
};

export default function DocumentRequestsTab({
  documentRequests,
  error,
  busyId,
  onPreview,
  onApprove,
  onOpenReject,
}: DocumentRequestsTabProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0f2044]">Pending Document Requests</h2>
        <p className="text-sm text-gray-500">
          A teacher's uploaded document only replaces the official one once approved here.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {documentRequests.length === 0 ? (
        <p className="text-gray-500 py-4">No pending document requests.</p>
      ) : (
        <div className="space-y-4">
          {documentRequests.map((r) => {
            const busy = busyId === r.id;
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
                    <h3 className="font-bold text-[#0f2044]">{r.teacherName}</h3>
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
                    onClick={() => onPreview(r.id, r.document_type, r.file)}
                    className="px-4 py-2 bg-gray-50 text-[#0f2044] rounded-lg hover:bg-gray-100 text-sm font-semibold"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onApprove(r.id)}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-60 text-sm font-semibold"
                  >
                    <Check size={14} />
                    Approve
                  </button>
                  <button
                    onClick={() => onOpenReject(r.id)}
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
  );
}
