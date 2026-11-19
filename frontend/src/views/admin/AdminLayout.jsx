import { useState } from "react";
import { Link } from "react-router-dom";
import { PATHS } from "../../lib/paths";
import AdminEmailTemplates from "./AdminEmailTemplates";
import AdminOverview from "./AdminOverview";
import AdminSystem from "./AdminSystem";
import AdminUsers from "./AdminUsers";

const TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "users", label: "Users", icon: "👥" },
  { id: "emails", label: "Email Templates", icon: "✉️" },
  { id: "system", label: "System Health", icon: "⚙️" },
];

export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Admin Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-extrabold text-sm shadow-sm">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
                  NutriScan AI <span className="text-amber-400">Admin</span>
                </h1>
                <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  Control Center
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={PATHS.dashboard}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Back to App</span>
            </Link>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="border-t border-slate-800 bg-slate-950/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto py-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === tab.id
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === "overview" && <AdminOverview onNavigateTab={setActiveTab} />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "emails" && <AdminEmailTemplates />}
        {activeTab === "system" && <AdminSystem />}
      </main>
    </div>
  );
}
