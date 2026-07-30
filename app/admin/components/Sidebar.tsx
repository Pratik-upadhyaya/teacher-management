type SidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  documentRequestsCount: number;
  transferRequestsCount: number;
  schoolRequestsCount: number;
  canExportData: boolean;
  isAdmin: boolean;
  onLogout: () => void;
};

function NavButton({
  label,
  isActive,
  onClick,
  badgeCount,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  badgeCount?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between ${
        isActive ? "bg-white text-[#0f2044] font-semibold" : "hover:bg-blue-900"
      }`}
    >
      <span>{label}</span>
      {!!badgeCount && (
        <span className="bg-amber-400 text-[#0f2044] text-xs font-bold px-2 py-0.5 rounded-full">
          {badgeCount}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  documentRequestsCount,
  transferRequestsCount,
  schoolRequestsCount,
  canExportData,
  isAdmin,
  onLogout,
}: SidebarProps) {
  return (
    <div className="w-72 bg-[#0f2044] text-white flex flex-col shadow-xl">
      <div className="p-6 border-b border-blue-900">
        <h1 className="text-2xl font-bold">Teacher Portal</h1>
        <p className="text-blue-200 text-sm">Gandaki Pradesh Education</p>
      </div>

      <div className="p-5 flex-1">
        <p className="text-blue-300 text-xs uppercase mb-4 tracking-widest">Main Menu</p>

        <div className="space-y-3">
          <NavButton label="Dashboard" isActive={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <NavButton label="Total Teachers" isActive={activeTab === "total"} onClick={() => setActiveTab("total")} />
          <NavButton label="Pending Approval" isActive={activeTab === "pending"} onClick={() => setActiveTab("pending")} />
          <NavButton label="Approved" isActive={activeTab === "approved"} onClick={() => setActiveTab("approved")} />
          <NavButton label="Rejected" isActive={activeTab === "rejected"} onClick={() => setActiveTab("rejected")} />
          <NavButton
            label="Document Requests"
            isActive={activeTab === "document-requests"}
            onClick={() => setActiveTab("document-requests")}
            badgeCount={documentRequestsCount}
          />
          <NavButton
            label="Transfer Requests"
            isActive={activeTab === "transfer-requests"}
            onClick={() => setActiveTab("transfer-requests")}
            badgeCount={transferRequestsCount}
          />
          <NavButton
            label="Schools"
            isActive={activeTab === "schools"}
            onClick={() => setActiveTab("schools")}
            badgeCount={schoolRequestsCount}
          />

          {canExportData && (
            <NavButton
              label="Approved Schools"
              isActive={activeTab === "approved-schools"}
              onClick={() => setActiveTab("approved-schools")}
            />
          )}

          {isAdmin && (
            <NavButton
              label="Sub-Admins"
              isActive={activeTab === "sub-admins"}
              onClick={() => setActiveTab("sub-admins")}
            />
          )}

          <NavButton
            label="Settings"
            isActive={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          />
        </div>
      </div>

      <div className="p-5">
        <button
          onClick={onLogout}
          className="w-full bg-red-500 hover:bg-red-600 py-3 rounded-xl font-semibold"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
