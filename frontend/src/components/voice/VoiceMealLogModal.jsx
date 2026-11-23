import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAppState } from "../../context/AppState";
import {
  fetchVoiceSamples,
  parseVoiceTranscript,
  confirmVoiceMeal,
} from "../../api/voiceLogApi";

const MEAL_SLOTS = ["Breakfast", "Lunch", "Evening Snack", "Dinner"];

export default function VoiceMealLogModal({ isOpen, onClose }) {
  const { actions } = useAppState();

  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [recognitionLang, setRecognitionLang] = useState("en-IN"); // en-IN handles Tanglish very well

  const [samples, setSamples] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parsedResult, setParsedResult] = useState(null);

  // Editable items state after parse
  const [editableItems, setEditableItems] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("Breakfast");
  const [mealTitle, setMealTitle] = useState("");

  const [confirming, setConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(null);
  const [confirmError, setConfirmError] = useState(null);

  const recognitionRef = useRef(null);

  // Load sample prompts
  useEffect(() => {
    if (isOpen) {
      fetchVoiceSamples()
        .then((res) => {
          if (res?.samples) setSamples(res.samples);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = recognitionLang;

      rec.onresult = (event) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + " ";
        }
        setTranscript(currentTranscript.trim());
      };

      rec.onerror = (err) => {
        console.warn("Speech recognition error:", err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } catch (e) {
      console.warn("Failed to initialize speech recognition:", e);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [recognitionLang]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      setTranscript("");
      setParsedResult(null);
      setEditableItems([]);
      setParseError(null);
      setConfirmSuccess(null);
      setConfirmError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setParseError(null);
      setParsedResult(null);
      try {
        recognitionRef.current.lang = recognitionLang;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Could not start recognition:", err);
      }
    }
  };

  const handleApplySample = (sampleText) => {
    setTranscript(sampleText);
    setParseError(null);
    setParsedResult(null);
    setConfirmSuccess(null);
  };

  const handleParseTranscript = async () => {
    if (!transcript.trim()) {
      setParseError("Please speak or type your meal details first!");
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListening(false);
    }

    setParsing(true);
    setParseError(null);
    setConfirmSuccess(null);
    setConfirmError(null);

    try {
      const res = await parseVoiceTranscript(transcript.trim());
      setParsedResult(res);
      setEditableItems(res.items || []);
      setSelectedSlot(res.suggested_slot || "Breakfast");
      setMealTitle(res.meal_title || "Voice Logged Meal");
    } catch (err) {
      setParseError(err.message || "Could not parse voice log. Please try again.");
    } finally {
      setParsing(false);
    }
  };

  // Live recalculate totals when items change
  const currentTotals = editableItems.reduce(
    (acc, it) => ({
      kcal: acc.kcal + (it.kcal || 0),
      protein: +(acc.protein + (it.protein || 0)).toFixed(1),
      carbs: +(acc.carbs + (it.carbs || 0)).toFixed(1),
      fat: +(acc.fat + (it.fat || 0)).toFixed(1),
      fiber: +(acc.fiber + (it.fiber || 0)).toFixed(1),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const handleRemoveItem = (index) => {
    setEditableItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmAndLog = async () => {
    if (!editableItems.length) {
      setConfirmError("No food items to log.");
      return;
    }

    setConfirming(true);
    setConfirmError(null);
    setConfirmSuccess(null);

    const payload = {
      title: mealTitle || "Voice Meal",
      slot: selectedSlot,
      items: editableItems,
      kcal: currentTotals.kcal,
      protein: currentTotals.protein,
      carbs: currentTotals.carbs,
      fat: currentTotals.fat,
      fiber: currentTotals.fiber,
    };

    try {
      const logged = await confirmVoiceMeal(payload);
      setConfirmSuccess(logged);
      // Refresh global app state so targets and dashboard immediately show new meal!
      if (actions?.refresh) {
        actions.refresh();
      }
    } catch (err) {
      setConfirmError(err.message || "Failed to confirm and log meal.");
    } finally {
      setConfirming(false);
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !parsing && !confirming) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-xl shadow-inner">
              🎙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">
                  Voice Meal Logger
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400 text-amber-950 tracking-wider">
                  AI Voice NLP
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Speak naturally in English, Tamil, or Tanglish — Gemini will parse portions & macros
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition text-lg font-bold"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* SUCCESS BANNER */}
          {confirmSuccess && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎉</span>
                <div>
                  <h3 className="text-base font-extrabold text-emerald-900">
                    Meal Successfully Logged to {confirmSuccess.slot}!
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Added <span className="font-bold">{confirmSuccess.title}</span> ({confirmSuccess.kcal} kcal, {confirmSuccess.protein}g protein) to today's diet targets.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmSuccess(null);
                    setParsedResult(null);
                    setTranscript("");
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  🎙️ Log Another Meal
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100/50 transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* INPUT AREA: MIC & TRANSCRIPT */}
          {!confirmSuccess && (
            <div className="space-y-4">
              {/* Mic & Wave Section */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-inner flex flex-col items-center justify-center space-y-4 text-center">
                {/* Visualizer Wave */}
                <div className="flex items-center gap-1.5 h-10">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        isListening
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-slate-600 h-2"
                      }`}
                      style={{
                        height: isListening
                          ? `${Math.max(12, ((i * 13) % 36) + 8)}px`
                          : "8px",
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                  ))}
                </div>

                {/* Big Mic Button */}
                <div className="relative">
                  {isListening && (
                    <div className="absolute -inset-3 rounded-full bg-emerald-500/30 animate-ping" />
                  )}
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={!speechSupported}
                    className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-xl ${
                      isListening
                        ? "bg-rose-500 hover:bg-rose-600 text-white ring-4 ring-rose-400/50"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white ring-4 ring-emerald-400/40"
                    } ${!speechSupported ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span className="text-3xl">{isListening ? "⏹️" : "🎙️"}</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    {isListening
                      ? "Listening... Speak naturally in English, Tamil, or Tanglish"
                      : "Tap mic to speak or type in the box below"}
                  </p>
                  <p className="text-xs text-slate-400">
                    e.g. &ldquo;Kaalaila 3 idli, oru cup sambar, aprm filter coffee saapten&rdquo; or &ldquo;2 rotis with chicken curry&rdquo;
                  </p>
                </div>

                {/* Language Mode Toggle */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-400">Speech Language:</span>
                  <button
                    type="button"
                    onClick={() => setRecognitionLang("en-IN")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      recognitionLang === "en-IN"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    English / Tanglish (en-IN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecognitionLang("ta-IN")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      recognitionLang === "ta-IN"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    Tamil (ta-IN)
                  </button>
                </div>

                {!speechSupported && (
                  <p className="text-xs text-amber-300 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/40">
                    ℹ️ Web Speech recognition is not supported in this browser. You can type or click samples below!
                  </p>
                )}
              </div>

              {/* Editable Transcript Textarea */}
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Speech Transcript / Meal Description:</span>
                  {transcript && (
                    <button
                      type="button"
                      onClick={() => setTranscript("")}
                      className="text-slate-400 hover:text-rose-600 transition"
                    >
                      Clear
                    </button>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Type or speak what you ate... (e.g. Kaalaila 3 idli, sambar, and 1 boiled egg)"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm text-slate-800 transition"
                />
              </div>

              {/* 1-Click Sample Chips */}
              {samples.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <span>⚡</span>
                    <span>Quick 1-Click Test Samples:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {samples.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplySample(s.prompt)}
                        className="group text-left px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition flex items-center gap-2"
                      >
                        <span className="text-base">{s.icon || "🍽️"}</span>
                        <div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                            {s.label}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                            &ldquo;{s.prompt}&rdquo;
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {parseError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{parseError}</span>
                </div>
              )}

              {/* Parse Action Button */}
              <button
                type="button"
                onClick={handleParseTranscript}
                disabled={parsing || !transcript.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {parsing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Parsing Voice Speech with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <span>🤖 Analyze & Parse Voice Meal</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* PARSED RESULT INSPECTION & CONFIRMATION */}
          {parsedResult && !confirmSuccess && (
            <div className="pt-4 border-t border-slate-200 space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    AI Parsed Meal Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review and adjust items before adding to today&apos;s diet targets
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                  Gemini Verified
                </span>
              </div>

              {/* Meal Title & Slot Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Meal Title:
                  </label>
                  <input
                    type="text"
                    value={mealTitle}
                    onChange={(e) => setMealTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Meal Slot:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {MEAL_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-2 py-2 rounded-xl text-xs font-bold transition text-center ${
                          selectedSlot === slot
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {slot.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Food Items List */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Identified Dishes ({editableItems.length}):
                </label>
                <div className="space-y-2">
                  {editableItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs flex items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.portion || `${item.grams}g`} • {item.grams} grams
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-slate-800">
                            {item.kcal} kcal
                          </div>
                          <div className="text-xs font-semibold text-emerald-700">
                            {item.protein}g protein
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition"
                          title="Remove dish"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Macros Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <div className="text-center">
                  <div className="text-xs text-slate-400 font-medium">Calories</div>
                  <div className="text-xl font-black text-amber-400">{currentTotals.kcal}</div>
                  <div className="text-[10px] text-slate-400">kcal</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400 font-medium">Protein</div>
                  <div className="text-xl font-black text-emerald-400">{currentTotals.protein}</div>
                  <div className="text-[10px] text-slate-400">grams</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400 font-medium">Carbs</div>
                  <div className="text-xl font-black text-cyan-400">{currentTotals.carbs}</div>
                  <div className="text-[10px] text-slate-400">grams</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400 font-medium">Fats</div>
                  <div className="text-xl font-black text-rose-400">{currentTotals.fat}</div>
                  <div className="text-[10px] text-slate-400">grams</div>
                </div>
                <div className="col-span-2 sm:col-span-1 text-center">
                  <div className="text-xs text-slate-400 font-medium">Fiber</div>
                  <div className="text-xl font-black text-purple-400">{currentTotals.fiber}</div>
                  <div className="text-[10px] text-slate-400">grams</div>
                </div>
              </div>

              {/* AI Tanglish Coach Note */}
              {parsedResult.tanglish_note && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
                  <span className="text-base shrink-0">💡</span>
                  <div>
                    <span className="font-bold">AI Coach Note: </span>
                    <span>{parsedResult.tanglish_note}</span>
                  </div>
                </div>
              )}

              {confirmError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  ⚠️ {confirmError}
                </div>
              )}

              {/* Confirm Logging Button */}
              <button
                type="button"
                onClick={handleConfirmAndLog}
                disabled={confirming || editableItems.length === 0}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {confirming ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Adding to Today's Diary...</span>
                  </>
                ) : (
                  <>
                    <span>✅ Confirm & Add to {selectedSlot} Diary ({currentTotals.kcal} kcal)</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
