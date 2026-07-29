import { X } from "lucide-react";

type AddSubAdminModalProps = {
  open: boolean;
  name: string;
  email: string;
  password: string;
  error: string;
  success: string;
  loading: boolean;
  onChangeName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
};

export default function AddSubAdminModal({
  open,
  name,
  email,
  password,
  error,
  success,
  loading,
  onChangeName,
  onChangeEmail,
  onChangePassword,
  onSubmit,
  onClose,
}: AddSubAdminModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-[#0f2044]">Add New Sub-Admin</h3>
            <p className="text-xs text-gray-400">Create login credentials for a sub-admin</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3 mb-4">
            {success}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="e.g. Ram Bahadur"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => onChangeEmail(e.target.value)}
              placeholder="e.g. ram@government.gov.np"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#0f2044] hover:bg-[#1a3260] text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Sub-Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
