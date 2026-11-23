import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAppState } from "../../context/AppState";
import { PATHS } from "../../lib/paths";

const MODE_SHORT_LABEL = {
  gemini: "Gemini 3.6 Flash",
  yolo: "YOLO Vision",
  none: "Manual Mode",
};

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onOpenVision,
  onOpenVoiceLog,
}) {
  const { user, isAdmin, logout } = useAuth();
  const { day, vision } = useAppState();
  const location = useLocation();

  const mealCount = day?.meals?.length ?? 0;

  const NAV_ITEMS = [
    {
      to: PATHS.scan,
      icon: "📸",
      label: "Food Scanner",
      badge: "Pre-Meal",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
    {
      to: PATHS.audit,
      icon: "🔍",
      label: "Packaged Food Audit",
      badge: "NEW",
      badgeColor: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
    },
    {
      to: PATHS.menuDecider,
      icon: "🍽️",
      label: "Restaurant Menu Decider",
      badge: "AI FIT",
      badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    },
    {
      to: PATHS.dashboard,
      icon: "📊",
      label: "Nutrition Dashboard",
      count: mealCount,
    },
    {
      to: PATHS.dietPlan,
      icon: "🎯",
      label: "Diet Plan & Goals",
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Top Section: Logo & Navigation */}
      <div className="space-y-6">
        {/* Logo & Brand Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800/80">
          <Link
            to={PATHS.landing}
            className="flex items-center gap-3 select-none group"
            title="NutriScan AI Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2m9-10a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                    NutriScan
                  </span>
                  <span className="text-lg font-black text-emerald-400">AI</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  Smart Pre-Meal Check
                </p>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white items-center justify-center text-xs transition"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="px-3 space-y-1.5">
          <div className={`px-3 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 ${collapsed ? "text-center" : ""}`}>
            {collapsed ? "•••" : "Main Navigation"}
          </div>

          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 shadow-sm border border-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                } ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-400" />
                )}
                <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>

                {!collapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}

                {!collapsed && item.badge && (
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}

                {!collapsed && item.count !== undefined && (
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Voice Meal Logger Quick Button */}
        {onOpenVoiceLog && (
          <div className="px-3 pt-1">
            <button
              type="button"
              onClick={() => {
                onCloseMobile?.();
                onOpenVoiceLog?.();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/25 to-teal-600/15 hover:from-emerald-600/40 hover:to-teal-600/30 border border-emerald-500/35 text-emerald-300 hover:text-white text-xs font-bold transition shadow-2xs group ${
                collapsed ? "justify-center px-2" : ""
              }`}
              title="Voice Meal Logger"
            >
              <span className="text-base shrink-0 group-hover:scale-110 transition-transform">
                🎙️
              </span>
              {!collapsed && (
                <span className="flex-1 text-left truncate">Voice Log</span>
              )}
              {!collapsed && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-400 text-emerald-950">
                  AI
                </span>
              )}
            </button>
          </div>
        )}

        {/* AI Vision Model Widget */}
        <div className="px-3 pt-2">
          {!collapsed ? (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Vision Engine
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${vision?.active_ready ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                  {vision?.active_ready ? "Active" : "Ready"}
                </span>
              </div>

              <div className="text-xs font-bold text-white truncate">
                {vision ? MODE_SHORT_LABEL[vision.active] : "Gemini 3.6 Flash"}
              </div>

              <button
                type="button"
                onClick={onOpenVision}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-700/60 hover:bg-emerald-600 text-slate-200 hover:text-white text-[11px] font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>⚙️ Switch Engine</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenVision}
              className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 flex items-center justify-center transition"
              title={`Vision: ${vision ? MODE_SHORT_LABEL[vision.active] : "Gemini"}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          )}
        </div>

        {/* Admin Portal Button (Only visible for admin) */}
        {isAdmin && (
          <div className="px-3">
            <Link
              to={PATHS.admin}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-300 hover:text-amber-200 hover:bg-amber-500/30 text-xs font-bold transition shadow-sm ${
                collapsed ? "justify-center px-2" : ""
              }`}
              title="Admin Control Center"
            >
              <span className="text-base shrink-0">👑</span>
              {!collapsed && <span className="flex-1 truncate">Admin Control Panel</span>}
              {!collapsed && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                  PRO
                </span>
              )}
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Section: User Profile & Logout */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <div
          className={`flex items-center gap-3 p-2 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition group ${
            collapsed ? "justify-center p-1.5" : ""
          }`}
        >
          {/* User Avatar linking to /profile */}
          <Link
            to={PATHS.profile}
            onClick={onCloseMobile}
            className="relative shrink-0"
            title={`View Profile (${user?.username || "Account"})`}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username || "Profile"}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/40 group-hover:ring-emerald-400 transition"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-extrabold uppercase ring-2 ring-emerald-500/40 group-hover:ring-emerald-400 transition">
                {(user?.username?.[0] || "U").toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
          </Link>

          {!collapsed && (
            <Link
              to={PATHS.profile}
              onClick={onCloseMobile}
              className="flex-1 min-w-0"
              title="View Profile & Settings"
            >
              <div className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                {user?.username || "Account"}
              </div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <span>{isAdmin ? "👑 Administrator" : "✨ Member"}</span>
              </div>
            </Link>
          )}

          {!collapsed && (
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={logout}
            className="w-full p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition flex items-center justify-center"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-slate-900 border-r border-slate-800/90 transition-all duration-300 select-none z-30 sticky top-0 h-screen ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden animate-fadeIn"
          onClick={onCloseMobile}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-slate-900 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-2 border-b border-slate-800">
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
