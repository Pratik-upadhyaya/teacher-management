import { X } from "lucide-react";

type RemoveSubAdminModalProps = {
  target: { id: number; name: string } | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

// Replaces raw confirm() -- a native browser dialog with no styling that
// can look alarming/unfamiliar rather than an obvious part of the site.
export default function RemoveSubAdminModal({ target, busy, onCancel, onConfirm }: RemoveSubAdminModalProps) {
  if (!target) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[#0f2044]">Remove Sub-Admin</h3>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Are you sure you want to remove{" "}
          <span className="font-semibold text-gray-800">{target.name}</span> as a sub-admin? They
          will lose access immediately.
          <br />
          <span className="text-gray-400">
            के तपाईं <span className="font-semibold">{target.name}</span> लाई सब-एडमिनबाट हटाउन
            चाहनुहुन्छ? उनीहरूको पहुँच तुरुन्तै हट्नेछ।
          </span>
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-60"
          >
            {busy ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}
