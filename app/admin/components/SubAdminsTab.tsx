import { Trash2, UserPlus } from "lucide-react";

type SubAdminsTabProps = {
  subAdmins: any[];
  error: string;
  onAdd: () => void;
  onRemove: (id: number, name: string) => void;
};

export default function SubAdminsTab({ subAdmins, error, onAdd, onRemove }: SubAdminsTabProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0f2044]">Sub-Admins</h2>
          <p className="text-sm text-gray-500">Manage portal administrators and sub-admins</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-[#0f2044] hover:bg-[#1a3260] text-white px-4 py-2.5 rounded-xl transition text-sm font-semibold shadow-sm animate-in fade-in"
        >
          <UserPlus size={16} />
          Add Sub-Admin
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
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
                      onClick={() => onRemove(admin.id, admin.first_name || admin.username)}
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
  );
}
