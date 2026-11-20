import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAppState } from "../context/AppState";
import { fmt } from "../lib/format";
import SummaryStrip from "../components/layout/SummaryStrip";
import DailyProgressChart from "../components/tracker/DailyProgressChart";
import HydrationTracker from "../components/tracker/HydrationTracker";
import LoggedMeals from "../components/tracker/LoggedMeals";
import SocialShareCardModal from "../components/share/SocialShareCardModal";

function formatDisplayDate(dateStr, todayStr) {
  if (!dateStr) return "";
  if (dateStr === todayStr) return "Today";

  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const today = new Date(ty, tm - 1, td);
  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Yesterday";
  return target.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const GOAL_LABELS = {
  lose: "Fat Loss & Calorie Deficit",
  gain: "Lean Muscle Hypertrophy",
  strength: "Strength & Power",
  maintain: "Healthy Maintenance",
};

function getGreetingName(user) {
  if (!user) return "Champion";
  if (user.display_name?.trim()) {
    const first = user.display_name.trim().split(" ")[0];
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }
  if (user.username) {
    const raw = user.username.split("@")[0].replace(/[0-9]+$/, "");
    if (raw.toLowerCase().startsWith("jawahar")) return "Jawahar";
    const first = raw.split(/[._\s]/)[0];
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }
  return "Champion";
}

function getTimeGreeting(name) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      salutation: `Good Morning, ${name}! ☀️`,
      subtitle: "Time to fuel your day with clean, high-protein nutrition. Let's smash today's targets!",
      badge: "Breakfast Phase",
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      salutation: `Good Afternoon, ${name}! 🥗`,
      subtitle: "Mid-day recharge! Stay mindful of portion sizes and keep your hydration steady.",
      badge: "Afternoon Momentum",
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      salutation: `Good Evening, ${name}! 🌅`,
      subtitle: "Reviewing today's wins! Plan a clean, balanced dinner to finish within your target budget.",
      badge: "Dinner Phase",
    };
  } else {
    return {
      salutation: `Night Owl Mode, ${name}! 🌙`,
      subtitle: "Late-night check-in. Rest, recovery, and water are essential for tomorrow's performance.",
      badge: "Rest & Recovery",
    };
  }
}

/** /dashboard — summary metrics, today's log, progress chart and water. */
export default function TrackerView() {
  const { user } = useAuth();
  const { day, targets, profile, water, selectedDate, todayDate, actions } = useAppState();
  const outletContext = useOutletContext();
  const openVoiceLog = outletContext?.openVoiceLog;
  const [shareOpen, setShareOpen] = useState(false);
  const isToday = !selectedDate || selectedDate === todayDate;

  const greetingName = getGreetingName(user);
  const timeGreeting = getTimeGreeting(greetingName);
  const mealCount = day?.meals?.length ?? 0;

  const remainingKcal = Math.max(0, (targets?.kcal ?? 0) - (day?.totals?.kcal ?? 0));
  const remainingProtein = Math.max(0, (targets?.protein ?? 0) - (day?.totals?.protein ?? 0));

  const weightKg = profile?.profile?.weight_kg;
  const GLASS_ML = 250;
  const goalGlasses = weightKg
    ? Math.max(6, Math.round((weightKg * 35) / GLASS_ML))
    : (water?.goal || 8);
  const currentGlasses = water?.glasses ?? 0;
  const remainingLitres = Math.max(0, ((goalGlasses - currentGlasses) * GLASS_ML) / 1000).toFixed(1);

  const shiftDay = (delta) => {
    const cur = selectedDate || todayDate;
    const [y, m, d] = cur.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + delta);
    const ny = dateObj.getFullYear();
    const nm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const nd = String(dateObj.getDate()).padStart(2, "0");
    const nextStr = `${ny}-${nm}-${nd}`;
    if (nextStr <= todayDate) {
      actions.setSelectedDate(nextStr);
    }
  };

  return (
    <section className="space-y-5">
      {/* Date Navigation & Calendar Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDay(-1)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition shadow-sm"
            title="Previous Day"
          >
            <span>←</span>
            <span className="hidden sm:inline">Previous Day</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-sm">📅</span>
            <input
              type="date"
              value={selectedDate || todayDate}
              max={todayDate}
              onChange={(e) => e.target.value && actions.setSelectedDate(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-none cursor-pointer"
            />
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                isToday ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"
              }`}
            >
              {formatDisplayDate(selectedDate, todayDate)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => shiftDay(1)}
            disabled={isToday}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center gap-1 transition shadow-sm"
            title="Next Day"
          >
            <span className="hidden sm:inline">Next Day</span>
            <span>→</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
                <span>🕒</span>
                <span>Viewing past log: <strong>{formatDisplayDate(selectedDate, todayDate)}</strong></span>
              </span>
              <button
                type="button"
                onClick={() => actions.setSelectedDate(todayDate)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
              >
                Return to Today →
              </button>
            </div>
          )}

          {openVoiceLog && isToday && (
            <button
              type="button"
              onClick={openVoiceLog}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95"
              title="Log meals by speaking in Tanglish / Tamil"
            >
              <span>🎙️</span>
              <span>Tanglish Voice Log</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            title="Create shareable daily progress card for Instagram / WhatsApp"
          >
            <span>📸</span>
            <span>Share Daily Card</span>
          </button>
        </div>
      </div>

      {/* Sleek, Compact Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white px-4 sm:px-5 py-3 border border-slate-700/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl ring-2 ring-emerald-500/40 p-0.5 bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm overflow-hidden flex items-center justify-center">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-[9px]" />
              ) : (
                <div className="w-full h-full bg-slate-900 rounded-[9px] text-white flex items-center justify-center text-sm font-black uppercase">
                  {greetingName[0]}
                </div>
              )}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900"
              title="Active"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                {isToday ? timeGreeting.salutation : `Welcome Back, ${greetingName}!`}
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                {isToday ? timeGreeting.badge : formatDisplayDate(selectedDate, todayDate)}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xl">
              {isToday
                ? timeGreeting.subtitle
                : `Reviewing intake and targets for ${formatDisplayDate(selectedDate, todayDate)}.`}
            </p>
          </div>
        </div>

        {/* Right side: Goal + Remaining Pill */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto text-xs">
          {profile?.profile?.goal && (
            <span className="hidden lg:inline-flex px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-300 bg-slate-800/80 border border-slate-700">
              🎯 {GOAL_LABELS[profile.profile.goal] || profile.profile.goal}
            </span>
          )}
          <div className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <span>🔥</span>
            <span>{fmt(remainingKcal)} kcal left</span>
          </div>
        </div>
      </div>

      <SummaryStrip />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <LoggedMeals />
        <div className="lg:col-span-5 space-y-6">
          <DailyProgressChart />
          <HydrationTracker />
        </div>
      </div>

      <SocialShareCardModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        type="daily"
        data={{
          date: selectedDate || todayDate,
          consumedKcal: day?.totals?.kcal || 0,
          targetKcal: targets?.kcal || 2000,
          consumedProtein: day?.totals?.protein || 0,
          targetProtein: targets?.protein || 120,
          glasses: currentGlasses,
          mealsCount: day?.meals?.length || 0,
        }}
      />
    </section>
  );
}
