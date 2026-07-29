import { Fragment } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import TeacherQuotaSummary from "@/components/TeacherQuotaSummary";

type ApprovedSchoolsTabProps = {
  approvedSchools: any[];
  error: string;
  expandedId: number | null;
  onToggleExpand: (id: number) => void;
  downloadingId: number | null;
  onDownloadReport: (school: any) => void;
  onView: (id: number) => void;
  exportBusy: boolean;
  onExportAll: () => void;
};

export default function ApprovedSchoolsTab({
  approvedSchools,
  error,
  expandedId,
  onToggleExpand,
  downloadingId,
  onDownloadReport,
  onView,
  exportBusy,
  onExportAll,
}: ApprovedSchoolsTabProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="mb-6 flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[#0f2044]">Approved Schools</h2>
          <p className="text-sm text-gray-500">
            {approvedSchools.length} school{approvedSchools.length === 1 ? "" : "s"} currently approved.
          </p>
        </div>
        <button
          onClick={onExportAll}
          disabled={exportBusy || approvedSchools.length === 0}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl transition text-sm font-semibold shadow-sm disabled:opacity-60"
        >
          <Download size={16} />
          {exportBusy ? "Exporting..." : "Export Approved Schools (Excel)"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
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
                          onClick={() => onView(s.id)}
                          title="View Full Details"
                          className="flex items-center gap-1 text-xs font-semibold text-[#0f2044] hover:underline whitespace-nowrap"
                        >
                          View
                        </button>
                        <button
                          onClick={() => onDownloadReport(s)}
                          disabled={downloadingId === s.id}
                          title="Download School Report"
                          className="flex items-center gap-1 text-xs font-semibold text-[#0f2044] hover:underline whitespace-nowrap disabled:opacity-50"
                        >
                          <Download size={14} />
                          {downloadingId === s.id ? "…" : "Report"}
                        </button>
                        <button
                          onClick={() => onToggleExpand(s.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-[#0f2044] hover:underline whitespace-nowrap"
                        >
                          {expandedId === s.id ? (
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
                  {expandedId === s.id && (
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
  );
}
