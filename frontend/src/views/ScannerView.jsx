import { useOutletContext } from "react-router-dom";
import NutritionReport from "../components/report/NutritionReport";
import CaptureCard from "../components/scanner/CaptureCard";
import SamplePlates from "../components/scanner/SamplePlates";

/** /scan — the camera lives in AppLayout (its modal must outlive this page), reached through the outlet. */
export default function ScannerView() {
  const { camera, openVoiceLog } = useOutletContext();
  return (
    <section className="space-y-6">
      {/* Quick Voice Log CTA Banner */}
      {openVoiceLog && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shrink-0">
              🎙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                  Prefer speaking over photos?
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-amber-950">
                  NEW
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Log meals in seconds by speaking in English, Tamil, or Tanglish (e.g. &ldquo;2 chapati with dal&rdquo; or &ldquo;3 idli, sambar&rdquo;)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openVoiceLog}
            className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold text-xs transition shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95"
          >
            <span>🎙️</span>
            <span>Open Voice Log →</span>
          </button>
        </div>
      )}

      {/* Left = Camera/Upload & Sample Plates | Right = Pre-Meal Nutrition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-5">
          <CaptureCard onOpenCamera={camera.openCamera} onCloseCamera={camera.closeCamera} />
          <SamplePlates />
        </div>
        <div className="lg:col-span-7 space-y-5">
          <NutritionReport />
        </div>
      </div>
    </section>
  );
}
