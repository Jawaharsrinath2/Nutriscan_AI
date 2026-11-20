import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import {
  renderShareCard,
  CARD_THEMES,
  CARD_FORMATS,
} from "../../lib/shareCardRenderer";

const CAPTION_PRESETS = [
  "🔥 NutriScan AI Pre-Meal Check",
  "💪 High Protein Clean Fuel",
  "🥗 Mindful & Healthy Eating",
  "⚡ Target Crushed & Logged Today!",
  "🔍 Inspect Before You Eat",
];

export default function SocialShareCardModal({
  isOpen,
  onClose,
  type = "meal", // "meal" | "audit" | "daily"
  data = {},
}) {
  const { user } = useAuth();
  const canvasRef = useRef(null);

  const [format, setFormat] = useState("story"); // "story" | "square"
  const [themeId, setThemeId] = useState("emerald");
  const [caption, setCaption] = useState(CAPTION_PRESETS[0]);
  const [customCaption, setCustomCaption] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Re-render canvas whenever format, theme, or caption changes
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    let active = true;
    setIsRendering(true);

    const activeCaption = customCaption.trim() || caption;

    renderShareCard(canvasRef.current, {
      type,
      format,
      themeId,
      data,
      caption: activeCaption,
      user,
    }).finally(() => {
      if (active) setIsRendering(false);
    });

    return () => {
      active = false;
    };
  }, [isOpen, type, format, themeId, caption, customCaption, data, user]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const filename = `nutriscan-${type}-${format}-${Date.now()}.png`;
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setCopiedToast(true);
          setTimeout(() => setCopiedToast(false), 2500);
        } catch (err) {
          console.warn("Clipboard write failed, downloading instead", err);
          handleDownload();
        }
      }, "image/png");
    } catch (err) {
      console.warn("Canvas toBlob error", err);
    }
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `nutriscan-${type}.png`, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "NutriScan AI Nutrition Card",
            text: customCaption || caption,
          });
        } else {
          handleDownload();
        }
      }, "image/png");
    } catch (err) {
      handleDownload();
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col md:flex-row overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Live Canvas Preview Container */}
        <div className="md:w-1/2 bg-slate-950 p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
          {/* Glowing ambient light behind card */}
          <div className="absolute w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Canvas Wrapper with max-height to scale properly */}
          <div className="relative z-10 w-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className={`rounded-2xl shadow-2xl border border-white/20 transition-all ${
                format === "story"
                  ? "max-h-[55vh] sm:max-h-[65vh] aspect-[9/16]"
                  : "max-h-[50vh] sm:max-h-[60vh] aspect-square"
              }`}
              style={{ width: "auto", objectFit: "contain" }}
            />

            {isRendering && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs rounded-2xl flex items-center justify-center">
                <span className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-3 font-medium text-center">
            ✨ Rendered in High-Res Retina PNG • Ready for Socials
          </p>
        </div>

        {/* Right Side: Customization & Actions Controls */}
        <div className="md:w-1/2 p-5 sm:p-7 flex flex-col justify-between overflow-y-auto space-y-5 bg-white">
          <div className="space-y-5">
            {/* Header & Close */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  📸 Social Share Card
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Customize Your Card
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Format Selection (Story vs Square) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Select Card Ratio:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat("story")}
                  className={`p-3 rounded-2xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                    format === "story"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-base">📱</span>
                  <span>Story (9:16)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("square")}
                  className={`p-3 rounded-2xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                    format === "square"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-base">⏹️</span>
                  <span>Square Post (1:1)</span>
                </button>
              </div>
            </div>

            {/* Theme Style Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Card Theme &amp; Gradient:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(CARD_THEMES).map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setThemeId(th.id)}
                    className={`p-2.5 rounded-2xl text-xs font-bold border flex items-center gap-2.5 transition ${
                      themeId === th.id
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/40 shadow-xs shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${th.bgGradient[0]}, ${th.accent})`,
                      }}
                    />
                    <span>{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Headline / Motivational Caption */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Banner Tag / Caption:
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CAPTION_PRESETS.map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => {
                      setCaption(cap);
                      setCustomCaption("");
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                      caption === cap && !customCaption
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or type a custom motivational caption..."
                value={customCaption}
                onChange={(e) => setCustomCaption(e.target.value)}
                maxLength={45}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-slate-800"
              />
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            {copiedToast && (
              <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold text-center animate-fadeIn">
                ✓ Image copied to clipboard! Ready to paste into WhatsApp, Slack, etc.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>📥</span>
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>📋</span>
                <span>Copy Image</span>
              </button>
            </div>

            {navigator.canShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <span>📲</span>
                <span>Share via Instagram / WhatsApp / Apps</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
