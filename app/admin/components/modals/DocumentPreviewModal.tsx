import { Check, Download, X } from "lucide-react";

type DocumentPreviewModalProps = {
  open: boolean;
  title: string;
  url: string | null;
  isPdf: boolean;
  loading: boolean;
  error: string;
  requestId: number | null;
  busyId: number | null;
  onApproveAndClose: () => void;
  onOpenReject: (id: number) => void;
  onClose: () => void;
};

export default function DocumentPreviewModal({
  open,
  title,
  url,
  isPdf,
  loading,
  error,
  requestId,
  busyId,
  onApproveAndClose,
  onOpenReject,
  onClose,
}: DocumentPreviewModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-[#0f2044]">{title}</h3>
            <p className="text-xs text-gray-400">Submitted document</p>
          </div>
          <div className="flex items-center gap-3">
            {requestId != null && (
              <>
                <button
                  onClick={onApproveAndClose}
                  disabled={busyId === requestId}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-60 px-3 py-2 rounded-lg transition"
                >
                  <Check size={13} />
                  Approve
                </button>
                <button
                  onClick={() => onOpenReject(requestId)}
                  disabled={busyId === requestId}
                  className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-3 py-2 rounded-lg transition"
                >
                  Reject
                </button>
              </>
            )}
            {url && (
              <a
                href={url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0f2044] bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg transition"
              >
                <Download size={13} />
                Download
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 p-6 bg-gray-50 overflow-auto flex justify-center items-center">
          {loading ? (
            <p className="text-sm text-gray-400">Loading document…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : url && isPdf ? (
            <iframe src={url} className="w-full h-full rounded-xl border-0 bg-white" title={title} />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} className="max-h-full max-w-full object-contain rounded-xl shadow-sm" alt={title} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
