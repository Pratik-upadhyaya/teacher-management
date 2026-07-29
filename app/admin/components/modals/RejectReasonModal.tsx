import { X } from "lucide-react";

type RejectReasonModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  reason: string;
  error: string;
  busy: boolean;
  placeholder: string;
  onChangeReason: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

// Shared shell for the 4 near-identical reject-reason dialogs (document
// change requests, transfer requests, school submissions, teacher
// applications). Each caller keeps its own state/handlers since they hit
// different endpoints -- this component only owns the shared markup.
export default function RejectReasonModal({
  open,
  title,
  subtitle = "A reason is required so they know what to fix",
  reason,
  error,
  busy,
  placeholder,
  onChangeReason,
  onSubmit,
  onClose,
}: RejectReasonModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-[#0f2044]">{title}</h3>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for rejection</label>
          <textarea
            value={reason}
            onChange={(e) => onChangeReason(e.target.value)}
            rows={4}
            placeholder={placeholder}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f2044] focus:ring-1 focus:ring-[#0f2044] transition"
          />
          {error && <p className="text-red-600 text-xs mt-1.5">{error}</p>}
        </div>

        <button
          onClick={onSubmit}
          disabled={busy}
          className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white rounded-lg py-3 text-sm font-semibold transition disabled:opacity-60"
        >
          {busy ? "Rejecting..." : "Confirm Rejection"}
        </button>
      </div>
    </div>
  );
}
