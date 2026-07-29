import { X } from "lucide-react";

type ToastProps = {
  message: string;
  onClose: () => void;
};

// Replaces raw alert() calls, which look like a browser/system warning
// rather than part of the app to someone unfamiliar with browsers.
// Auto-dismisses (handled by the caller's setTimeout), but can also be
// closed manually here.
export default function Toast({ message, onClose }: ToastProps) {
  if (!message) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] max-w-sm bg-white border border-red-200 shadow-lg rounded-xl px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
      <p className="text-sm text-gray-700 flex-1">{message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
