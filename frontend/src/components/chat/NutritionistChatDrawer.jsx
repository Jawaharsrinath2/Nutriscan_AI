import { useState, useEffect, useRef } from "react";
import { useAppState } from "../../context/AppState";
import { fetchStarterPrompts, sendChatMessage } from "../../api/chatbotApi";

export default function NutritionistChatDrawer() {
  const { day, targets, profile } = useAppState();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Vanakkam machan! 👋 Naan unoda 24/7 AI Nutritionist & Diet Coach. Unoda goals, today's logged meals, and balance calories pathi ellam enaku theriyum. Inaiku diet la enna doubt? Meal planning, healthy food swaps, or craving hacks edhavadhu kekalama!",
      suggested_followups: [
        "Inaiku dinner ku enna sapdalam?",
        "Protein target reach aaga options sollu?",
        "4 PM snack craving healthy-ah enna iruku?",
      ],
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [starterPrompts, setStarterPrompts] = useState([]);
  const [language, setLanguage] = useState("tanglish");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const remainingKcal = Math.max(0, (targets?.kcal ?? 0) - (day?.totals?.kcal ?? 0));
  const remainingProtein = Math.max(0, (targets?.protein ?? 0) - (day?.totals?.protein ?? 0));

  useEffect(() => {
    fetchStarterPrompts()
      .then((data) => {
        if (data) setStarterPrompts(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, sending]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    const userMsg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    setInputText("");
    setSending(true);

    try {
      // Send chat payload (history without followups)
      const payloadMessages = updatedMessages.map(({ role, content }) => ({
        role,
        content,
      }));

      const res = await sendChatMessage(payloadMessages, language);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          suggested_followups: res.suggested_followups || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry machan, small connection error. Innoru thadava try pannu please!",
          suggested_followups: [],
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* FLOATING ACTION LAUNCHER BUTTON */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-[80] animate-bounce">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-2xl hover:shadow-emerald-500/30 ring-4 ring-emerald-400/30 hover:scale-105 active:scale-95 transition-all"
            title="Chat with 24/7 AI Dietitian & Coach"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg shadow-inner">
              🤖
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                <span>AI Dietitian</span>
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              </div>
              <div className="text-[10px] text-emerald-100 font-medium">
                24/7 Tanglish Coach
              </div>
            </div>
          </button>
        </div>
      )}

      {/* CHATBOT DRAWER / POPUP WINDOW */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-[90] w-[calc(100vw-24px)] sm:w-[420px] max-h-[88vh] h-[640px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scaleUp">
          {/* Top Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-lg shadow-inner">
                  🤖
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-300 ring-2 ring-emerald-700" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-extrabold tracking-tight">
                    AI Nutritionist & Coach
                  </h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-400 text-amber-950">
                    24/7
                  </span>
                </div>
                <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                  <span>Context: {remainingKcal} kcal left</span>
                  <span>•</span>
                  <span>{remainingProtein}g protein needed</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Switch */}
              <button
                type="button"
                onClick={() =>
                  setLanguage((l) => (l === "tanglish" ? "english" : "tanglish"))
                }
                className="px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-[10px] font-extrabold uppercase transition tracking-wider"
                title="Switch response language"
              >
                {language === "tanglish" ? "Tanglish" : "English"}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition text-sm font-bold"
                title="Minimize chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Context Pill Strip */}
          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1 truncate">
              <span>🎯 Goal: <strong>{profile?.profile?.goal || "Fitness"}</strong></span>
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
              🔥 {remainingKcal} kcal left
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-xs font-medium"
                      : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs"
                  }`}
                >
                  {m.content}
                </div>

                {/* Follow-up Chips for Assistant Replies */}
                {m.role === "assistant" &&
                  m.suggested_followups &&
                  m.suggested_followups.length > 0 &&
                  idx === messages.length - 1 &&
                  !sending && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[95%]">
                      {m.suggested_followups.map((tip, qIdx) => (
                        <button
                          key={qIdx}
                          type="button"
                          onClick={() => handleSendMessage(tip)}
                          className="px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-800 text-[11px] font-semibold transition text-left shadow-2xs active:scale-95"
                        >
                          💬 {tip}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}

            {/* Typing Indicator */}
            {sending && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-slate-200 text-slate-500 w-fit">
                <span className="text-xs">🤖 Nutritionist is typing</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Starter Prompt Quick Chips (Visible when only 1 message) */}
          {messages.length === 1 && starterPrompts.length > 0 && (
            <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-1.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Quick Questions:
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {starterPrompts.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => handleSendMessage(sp.prompt)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left transition flex items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-emerald-800"
                  >
                    <span>{sp.icon}</span>
                    <span className="truncate">{sp.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Chat Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask in Tanglish... (e.g. Night enna sapdalum?)"
                disabled={sending}
                className="flex-1 px-3 py-1.5 bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={sending || !inputText.trim()}
                className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center transition shadow-xs shrink-0"
                title="Send message"
              >
                ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
