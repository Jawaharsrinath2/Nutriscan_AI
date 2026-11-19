import { useEffect, useState } from "react";
import { fetchAdminSystem } from "../../api/adminApi";

export default function AdminSystem() {
  const [sys, setSys] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminSystem()
      .then(setSys)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm font-medium animate-pulse">
        Checking server &amp; database health…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm">
        Failed to fetch system diagnostics: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-lg font-extrabold text-slate-900">System &amp; Infrastructure Health</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Live diagnostics for database connection, AI detection models, and email dispatchers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {/* Database Info */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Database</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Connected
              </span>
            </div>
            <div className="text-base font-extrabold text-slate-900 capitalize">{sys.db_type}</div>
            <div className="text-[11px] text-slate-500">
              Active PostgreSQL connection pool with connection pre-pinging.
            </div>
          </div>

          {/* AI Vision Model */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Vision AI Engine</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  sys.gemini_ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {sys.gemini_ready ? "Operational" : "Fallback"}
              </span>
            </div>
            <div className="text-base font-extrabold text-slate-900">Gemini 3.6 Flash</div>
            <div className="text-[11px] text-slate-500">Mode: {sys.vision_mode} (structured JSON food scan)</div>
          </div>

          {/* Email / SMTP */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Email Dispatch</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  sys.smtp_configured ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                }`}
              >
                {sys.smtp_configured ? "Real SMTP" : "Dev Mock Outbox"}
              </span>
            </div>
            <div className="text-base font-extrabold text-slate-900">
              {sys.smtp_configured ? sys.smtp_host : "Console Mock Outbox"}
            </div>
            <div className="text-[11px] text-slate-500">
              {sys.smtp_configured
                ? "Live outbound email server ready"
                : "Safe dev mode: emails logged to console & test endpoints"}
            </div>
          </div>
        </div>

        {/* Server Runtime Info */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-400 font-semibold text-[10px] uppercase">Python Runtime</div>
            <div className="font-bold text-slate-800 mt-0.5">v{sys.python_version}</div>
          </div>
          <div>
            <div className="text-slate-400 font-semibold text-[10px] uppercase">FastAPI Framework</div>
            <div className="font-bold text-slate-800 mt-0.5">v0.115.6</div>
          </div>
          <div>
            <div className="text-slate-400 font-semibold text-[10px] uppercase">Server Clock (UTC)</div>
            <div className="font-bold text-slate-800 mt-0.5">{new Date(sys.server_time).toUTCString()}</div>
          </div>
          <div>
            <div className="text-slate-400 font-semibold text-[10px] uppercase">Environment</div>
            <div className="font-bold text-emerald-600 mt-0.5">Development (PostgreSQL)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
