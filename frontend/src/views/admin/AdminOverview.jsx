import { useEffect, useState } from "react";
import { fetchAdminOverview } from "../../api/adminApi";

export default function AdminOverview({ onNavigateTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminOverview()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm font-medium animate-pulse">
        Loading analytics &amp; platform metrics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm">
        Failed to load overview: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total_users}</div>
            <div className="text-xs text-emerald-600 font-semibold mt-0.5">{stats.active_users} active accounts</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl">
            👥
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Meals Today</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.meals_today}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">{stats.meals_total} all-time logged</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl">
            🍽️
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Water Today</div>
            <div className="text-2xl font-extrabold text-sky-600 mt-1">
              {((stats.water_today_glasses * 250) / 1000).toFixed(1)}L
            </div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">{stats.water_today_glasses} glasses consumed</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-2xl">
            💧
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Plans</div>
            <div className="text-2xl font-extrabold text-purple-600 mt-1">{stats.plans_generated}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">Gemini Diet &amp; Workout</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-2xl">
            ✨
          </div>
        </div>
      </div>

      {/* 7-Day Activity Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Signups Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>📈</span>
              <span>7-Day User Registrations</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Last 7 days</span>
          </div>

          <div className="space-y-2 pt-2">
            {stats.signup_trend.map((item) => (
              <div key={item.date} className="flex items-center gap-3 text-xs">
                <span className="w-24 text-slate-500 font-medium">{item.date}</span>
                <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(10, item.count * 20))}%` }}
                  ></div>
                </div>
                <span className="w-8 text-right font-extrabold text-slate-800">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Meal Logs Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>🥗</span>
              <span>7-Day Meals Logged</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Last 7 days</span>
          </div>

          <div className="space-y-2 pt-2">
            {stats.meal_trend.map((item) => (
              <div key={item.date} className="flex items-center gap-3 text-xs">
                <span className="w-24 text-slate-500 font-medium">{item.date}</span>
                <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(10, item.count * 15))}%` }}
                  ></div>
                </div>
                <span className="w-8 text-right font-extrabold text-slate-800">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 rounded-2xl p-6 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-lg font-extrabold">Ready to customize system emails or manage accounts?</h4>
          <p className="text-xs text-emerald-100 mt-1">
            Edit welcome &amp; verification emails in the live visual editor or manage platform users.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab("emails")}
            className="px-4 py-2 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs transition shadow-sm"
          >
            ✉️ Edit Email Templates
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("users")}
            className="px-4 py-2 rounded-xl bg-emerald-700/60 hover:bg-emerald-700 text-white font-bold text-xs border border-white/20 transition"
          >
            👥 Manage Users
          </button>
        </div>
      </div>
    </div>
  );
}
