import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PATHS } from "../lib/paths";
import {
  fetchAuditPresets,
  lookupBarcode,
  auditPackagingPhoto,
  logPackagedFoodToDiary,
} from "../api/auditApi";
import SocialShareCardModal from "../components/share/SocialShareCardModal";
import AuditResultModal from "../components/audit/AuditResultModal";

const GRADE_STYLES = {
  A: {
    bg: "from-emerald-500 to-green-600",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    label: "Grade A - Excellent Health Quality",
  },
  B: {
    bg: "from-green-500 to-lime-600",
    text: "text-green-700",
    badge: "bg-green-100 text-green-800 border-green-200",
    label: "Grade B - Good Nutritional Quality",
  },
  C: {
    bg: "from-amber-400 to-yellow-500",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    label: "Grade C - Moderate / Mindful Portions",
  },
  D: {
    bg: "from-orange-500 to-amber-600",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    label: "Grade D - Poor Nutritional Profile",
  },
  E: {
    bg: "from-rose-500 to-red-600",
    text: "text-rose-700",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    label: "Grade E - Highly Processed / Unhealthy",
  },
};

const NOVA_LABELS = {
  1: { text: "NOVA 1: Unprocessed / Natural", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  2: { text: "NOVA 2: Culinary Ingredient", color: "bg-blue-50 text-blue-700 border-blue-200" },
  3: { text: "NOVA 3: Processed Food", color: "bg-amber-50 text-amber-700 border-amber-200" },
  4: { text: "NOVA 4: Ultra-Processed Food (UPF)", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function PackagedFoodAuditView() {
  const navigate = useNavigate();

  // Mode: "scan" | "upload" | "manual"
  const [activeTab, setActiveTab] = useState("manual");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditResult, setAuditResult] = useState(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Per 100g vs Per Serving toggle
  const [viewServing, setViewServing] = useState(true);

  // Diary Logging state
  const [consumedGrams, setConsumedGrams] = useState(50);
  const [selectedSlot, setSelectedSlot] = useState("Evening Snack");
  const [logLoading, setLogLoading] = useState(false);
  const [logSuccess, setLogSuccess] = useState(null);

  // Live Camera Scanner
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanLoopRef = useRef(null);

  // Load preset sample barcodes
  useEffect(() => {
    fetchAuditPresets()
      .then(setPresets)
      .catch((err) => console.warn("Failed to load presets", err));
  }, []);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported by your browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Check if native BarcodeDetector API exists
      if ("BarcodeDetector" in window) {
        try {
          detectorRef.current = new window.BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
          });
          runDetectionLoop();
        } catch (e) {
          console.warn("BarcodeDetector formats unsupported:", e);
        }
      }
    } catch (err) {
      setCameraError(err.message || "Could not start camera feed.");
      stopCamera();
    }
  };

  const runDetectionLoop = async () => {
    if (!videoRef.current || !detectorRef.current) return;
    try {
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          const detected = barcodes[0].rawValue;
          stopCamera();
          handleLookup(detected);
          return;
        }
      }
    } catch (err) {
      // transient detection frame error
    }
    scanLoopRef.current = requestAnimationFrame(runDetectionLoop);
  };

  const handleLookup = async (code) => {
    const cleanCode = (code || barcodeInput).trim();
    if (!cleanCode) return;
    setAuditModalOpen(true);
    setLoading(true);
    setError(null);
    setLogSuccess(null);

    try {
      const result = await lookupBarcode(cleanCode);
      setAuditResult(result);
      setConsumedGrams(result.nutriments?.serving_grams || 50);
      setBarcodeInput(cleanCode);
    } catch (err) {
      setError(err.message || "Product not found. Try snapping a photo of the label.");
      setAuditResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAuditModalOpen(true);
    setLoading(true);
    setError(null);
    setLogSuccess(null);

    try {
      const result = await auditPackagingPhoto(file);
      setAuditResult(result);
      setConsumedGrams(result.nutriments?.serving_grams || 50);
    } catch (err) {
      setError(err.message || "Failed to analyze packaging photo.");
      setAuditResult(null);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  // Compute live macros based on consumed grams
  const computePortionMacros = (grams) => {
    if (!auditResult?.nutriments) return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    const n = auditResult.nutriments;
    const ratio = (grams || 0) / 100;
    return {
      kcal: Math.round(n.kcal_100g * ratio),
      protein: +(n.protein_100g * ratio).toFixed(1),
      carbs: +(n.carbs_100g * ratio).toFixed(1),
      fat: +(n.fat_100g * ratio).toFixed(1),
      fiber: +(n.fiber_100g * ratio).toFixed(1),
    };
  };

  const handleLogToDiary = async () => {
    if (!auditResult) return;
    setLogLoading(true);
    setLogSuccess(null);
    setError(null);

    const macros = computePortionMacros(consumedGrams);
    const payload = {
      product_name: auditResult.product_name,
      brand: auditResult.brand,
      image_url: auditResult.image_url,
      grams: parseFloat(consumedGrams),
      slot: selectedSlot,
      kcal: macros.kcal,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber,
    };

    try {
      const logged = await logPackagedFoodToDiary(payload);
      setLogSuccess({
        slot: logged.slot,
        title: logged.title,
        kcal: logged.kcal,
        protein: logged.protein,
      });
    } catch (err) {
      setError(err.message || "Failed to log packaged food to today's diary.");
    } finally {
      setLogLoading(false);
    }
  };

  const portionMacros = computePortionMacros(consumedGrams);
  const gradeStyle = GRADE_STYLES[auditResult?.nutriscore_grade] || GRADE_STYLES.C;
  const novaStyle = NOVA_LABELS[auditResult?.nova_group] || NOVA_LABELS[4];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-4">
      {/* Sleek, Compact Food Label Audit Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white px-4 sm:px-5 py-3 border border-slate-700/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 p-0.5 shrink-0 flex items-center justify-center text-xl shadow-sm">
            🔍
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                Packaged Food &amp; Barcode Health Audit
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                NutriScore A to E • NOVA 1 to 4
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xl">
              Inspect supermarket food labels, detect hidden sugars &amp; palm oil, and log consumed portions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5 shadow-2xs">
            <span>⚡</span>
            <span>Instant Barcode &amp; Photo OCR</span>
          </span>
        </div>
      </div>

      {/* Prominent Loading Banner */}
      {loading && (
        <div className="p-5 rounded-2xl bg-white border-2 border-emerald-500 shadow-lg flex items-center justify-center gap-4 text-emerald-950 animate-pulse">
          <span className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-sm font-extrabold text-emerald-900">
              🔍 Auditing Food Label with Gemini Vision...
            </p>
            <p className="text-xs text-slate-500">
              Analyzing ingredients list, refined palm oil, hidden sugars, additives, and computing NutriGrade...
            </p>
          </div>
        </div>
      )}

      {/* Recent Audit Quick Bar (shown when an item was audited but pop-up was closed) */}
      {auditResult && !auditModalOpen && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  {auditResult.product_name}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${gradeStyle.badge}`}>
                  NutriScore {auditResult.nutriscore_grade}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Health Score: {auditResult.health_score}/100 • {auditResult.summary_status.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAuditModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <span>👁️ Open Pop-up Audit Card</span>
          </button>
        </div>
      )}

      {/* Scanner & Inputs Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
        {/* Navigation Tabs for Scanner */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("manual");
              stopCamera();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "manual"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>⌨️</span>
            <span>Enter Barcode</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("scan");
              startCamera();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "scan"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>📷</span>
            <span>Live Camera Scanner</span>
          </button>

          <label
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "upload"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>🖼️</span>
            <span>Upload Photo / Label</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                setActiveTab("upload");
                stopCamera();
                handlePhotoUpload(e);
              }}
            />
          </label>
        </div>

        {/* Tab 1: Live Camera Feed */}
        {activeTab === "scan" && (
          <div className="space-y-3">
            <div className="relative max-w-md mx-auto aspect-video sm:aspect-square bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-emerald-500">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan Reticle Overlay */}
              <div className="absolute inset-8 border-2 border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                <div className="w-full h-0.5 bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <p className="text-[11px] text-center text-white/90 font-medium bg-black/60 px-2 py-1 rounded backdrop-blur self-center">
                  Align product barcode inside the frame
                </p>
                <div className="w-full h-0.5 bg-emerald-400/30" />
              </div>
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                {cameraError} You can switch to Manual Barcode or Photo Upload mode.
              </div>
            )}

            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={cameraActive ? stopCamera : startCamera}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                {cameraActive ? "⏹️ Stop Camera" : "▶️ Restart Camera"}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Barcode Input */}
        {activeTab === "manual" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                🔢
              </span>
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Enter 8 to 13-digit EAN/UPC barcode (e.g. 8901719101038)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-800 text-sm font-mono tracking-wider outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !barcodeInput.trim()}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Auditing...</span>
                </>
              ) : (
                <>
                  <span>🔍 Audit Label</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 3: Photo upload hint */}
        {activeTab === "upload" && (
          <div className="p-6 border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-2xl text-center space-y-3 bg-slate-50/50">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">
              📸
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Snap or Upload Food Packaging or Back Nutrition Facts Table
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Gemini Vision will automatically read the ingredients, serving size, and macro table.
              </p>
            </div>
            <label className="inline-block px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition shadow-sm">
              Choose Photo File
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </label>
          </div>
        )}

        {/* Quick Sample Presets Chips */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            ⚡ Quick 1-Click Test Samples:
          </p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.barcode}
                type="button"
                onClick={() => {
                  setBarcodeInput(p.barcode);
                  handleLookup(p.barcode);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-700 hover:text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">({p.brand})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="font-bold">Audit Lookup Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert for Diary Logging */}
      {logSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
              ✓
            </div>
            <div>
              <p className="text-sm font-bold">
                Logged to today&apos;s {logSuccess.slot}!
              </p>
              <p className="text-xs text-emerald-700">
                {logSuccess.title} • {logSuccess.kcal} kcal and {logSuccess.protein}g protein added to your nutrition dashboard.
              </p>
            </div>
          </div>
          <Link
            to={PATHS.dashboard}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm whitespace-nowrap"
          >
            📊 View on Dashboard →
          </Link>
        </div>
      )}

      {/* AUDIT REPORT CARD */}
      {auditResult && (
        <div className="space-y-6">
          {/* Main Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Top Grade & Product Bar */}
            <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4 sm:gap-5">
                {auditResult.image_url ? (
                  <img
                    src={auditResult.image_url}
                    alt={auditResult.product_name}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-2xl border border-slate-200 p-1.5 bg-slate-50 shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl shrink-0">
                    📦
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {auditResult.brand && (
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {auditResult.brand}
                      </span>
                    )}
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${novaStyle.color}`}>
                      {novaStyle.text}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                    {auditResult.product_name}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Barcode: {auditResult.barcode}
                  </p>
                </div>
              </div>

              {/* NutriGrade Letter & Health Score Badge + Share Card */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                  title="Generate shareable card for Instagram / WhatsApp"
                >
                  <span>📸</span>
                  <span>Share Card</span>
                </button>

                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradeStyle.bg} text-white flex flex-col items-center justify-center shadow-md`}
                  >
                    <span className="text-2xl font-black">{auditResult.nutriscore_grade}</span>
                    <span className="text-[9px] uppercase tracking-wider font-bold">NutriScore</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500">Health Index</div>
                    <div className="text-2xl font-black text-slate-800">
                      {auditResult.health_score} <span className="text-xs font-normal text-slate-400">/ 100</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${gradeStyle.badge}`}>
                      {auditResult.summary_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Health Verdict Callout */}
            <div className="p-6 bg-slate-50/70 border-b border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <span>🤖 AI Nutritionist Verdict</span>
              </div>
              <p className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed">
                {auditResult.verdict}
              </p>
            </div>

            {/* Red Flags & Green Highlights Grid */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100">
              {/* Red Flags */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700">
                  <span>🚨 Red Flags &amp; Watchouts</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px]">
                    {auditResult.red_flags.length}
                  </span>
                </div>
                {auditResult.red_flags.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No critical red flags detected.</p>
                ) : (
                  <div className="space-y-2">
                    {auditResult.red_flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs font-medium flex items-start gap-2.5"
                      >
                        <span className="text-rose-500 text-sm mt-0.5">⚠️</span>
                        <span className="leading-relaxed">{flag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Green Highlights */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <span>🌿 Positive Nutritional Highlights</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                    {auditResult.green_flags.length}
                  </span>
                </div>
                {auditResult.green_flags.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No significant positive highlights.</p>
                ) : (
                  <div className="space-y-2">
                    {auditResult.green_flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start gap-2.5"
                      >
                        <span className="text-emerald-500 text-sm mt-0.5">✓</span>
                        <span className="leading-relaxed">{flag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Nutrition Facts Table */}
            <div className="p-6 sm:p-8 space-y-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Nutrition Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">
                    Official values per pack / serving size
                  </p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setViewServing(true)}
                    className={`px-3 py-1 rounded-lg transition ${
                      viewServing ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    Per Serving ({auditResult.nutriments?.serving_size || `${auditResult.nutriments?.serving_grams}g`})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewServing(false)}
                    className={`px-3 py-1 rounded-lg transition ${
                      !viewServing ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    Per 100g
                  </button>
                </div>
              </div>

              {/* Macro Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-xs text-slate-500 font-medium">Calories</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {viewServing ? auditResult.nutriments.serving_kcal : auditResult.nutriments.kcal_100g}
                    <span className="text-xs font-normal text-slate-400"> kcal</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-center">
                  <span className="text-xs text-blue-700 font-medium">Protein</span>
                  <div className="text-lg font-black text-blue-900 mt-0.5">
                    {viewServing ? auditResult.nutriments.serving_protein : auditResult.nutriments.protein_100g}
                    <span className="text-xs font-normal text-blue-500"> g</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-center">
                  <span className="text-xs text-amber-700 font-medium">Carbohydrates</span>
                  <div className="text-lg font-black text-amber-900 mt-0.5">
                    {viewServing ? auditResult.nutriments.serving_carbs : auditResult.nutriments.carbs_100g}
                    <span className="text-xs font-normal text-amber-500"> g</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 text-center">
                  <span className="text-xs text-rose-700 font-medium">Fats</span>
                  <div className="text-lg font-black text-rose-900 mt-0.5">
                    {viewServing ? auditResult.nutriments.serving_fat : auditResult.nutriments.fat_100g}
                    <span className="text-xs font-normal text-rose-500"> g</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 text-center">
                  <span className="text-xs text-purple-700 font-medium">Sugars</span>
                  <div className="text-lg font-black text-purple-900 mt-0.5">
                    {viewServing ? auditResult.nutriments.serving_sugars : auditResult.nutriments.sugars_100g}
                    <span className="text-xs font-normal text-purple-500"> g</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-center">
                  <span className="text-xs text-emerald-700 font-medium">Fiber</span>
                  <div className="text-lg font-black text-emerald-900 mt-0.5">
                    {viewServing
                      ? (auditResult.nutriments.fiber_100g * (auditResult.nutriments.serving_grams / 100)).toFixed(1)
                      : auditResult.nutriments.fiber_100g}
                    <span className="text-xs font-normal text-emerald-500"> g</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-xs text-slate-500 font-medium">Sodium</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {Math.round(
                      (viewServing
                        ? auditResult.nutriments.sodium_100g * (auditResult.nutriments.serving_grams / 100)
                        : auditResult.nutriments.sodium_100g) * 1000
                    )}
                    <span className="text-xs font-normal text-slate-400"> mg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingredients Text Box */}
            {auditResult.ingredients_text && (
              <div className="p-6 sm:p-8 space-y-2 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ingredients List
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed font-mono bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {auditResult.ingredients_text}
                </p>
              </div>
            )}

            {/* Smart Healthy Alternatives Swaps */}
            <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <span>💡 Better Clean Food Alternatives</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {auditResult.healthy_swaps.map((swap, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-2xs text-xs font-medium text-slate-800 flex items-start gap-2.5"
                  >
                    <span className="text-emerald-600 text-base shrink-0">✨</span>
                    <span className="leading-snug">{swap}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ACTION DRAWER: LOG TO DAILY TARGET */}
          <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider text-emerald-100">
                  <span>🍽️ Daily Budget Integration</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black mt-1">
                  Did you eat this? Add it to today&apos;s diet diary
                </h3>
                <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                  Select your consumed portion and meal slot to automatically deduct from your remaining calories &amp; macros.
                </p>
              </div>

              {/* Live Portion Summary Tag */}
              <div className="bg-white/10 backdrop-blur border border-white/20 px-4 py-3 rounded-2xl shrink-0 text-right">
                <span className="text-[11px] text-emerald-200 font-semibold block">Total Consumed</span>
                <span className="text-2xl font-black text-white">{portionMacros.kcal} kcal</span>
                <span className="text-xs text-emerald-100 block mt-0.5">
                  {portionMacros.protein}g Protein • {portionMacros.carbs}g Carbs • {portionMacros.fat}g Fat
                </span>
              </div>
            </div>

            {/* Portion Grams & Slot Selection Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-white/15">
              {/* Grams Selector */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-emerald-100">
                  <span>Portion Consumed:</span>
                  <span className="text-sm font-mono text-white">{consumedGrams} grams</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="5"
                    value={consumedGrams}
                    onChange={(e) => setConsumedGrams(Number(e.target.value))}
                    className="w-full accent-white h-2 bg-white/20 rounded-lg cursor-pointer"
                  />
                </div>
                {/* Quick portion buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConsumedGrams(auditResult.nutriments?.serving_grams || 25)}
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition"
                  >
                    1 Serving ({auditResult.nutriments?.serving_grams || 25}g)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsumedGrams(50)}
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition"
                  >
                    50g
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsumedGrams(100)}
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition"
                  >
                    Full Pack (100g)
                  </button>
                </div>
              </div>

              {/* Meal Slot Selector & Log Button */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-emerald-100">
                  Select Meal Slot:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Breakfast", "Lunch", "Evening Snack", "Dinner"].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition text-center ${
                        selectedSlot === slot
                          ? "bg-white text-emerald-900 shadow-md scale-102"
                          : "bg-white/15 hover:bg-white/25 text-white"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={logLoading}
                  onClick={handleLogToDiary}
                  className="w-full py-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-sm transition shadow-lg flex items-center justify-center gap-2 mt-2"
                >
                  {logLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin" />
                      <span>Logging to Diet Diary...</span>
                    </>
                  ) : (
                    <>
                      <span>🍽️ Add {portionMacros.kcal} kcal to Today&apos;s Diet Target</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Inspection Result Pop-up Modal */}
      <AuditResultModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        loading={loading}
        error={error}
        auditResult={auditResult}
        onOpenShareCard={() => setShareOpen(true)}
      />

      {/* Social Share Card Modal */}
      <SocialShareCardModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        type="audit"
        data={auditResult || {}}
      />
    </div>
  );
}
