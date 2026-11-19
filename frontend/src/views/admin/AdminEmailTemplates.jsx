import { useEffect, useRef, useState } from "react";
import { fetchEmailTemplate, fetchEmailTemplates, previewEmailTemplate, testSendEmail, updateEmailTemplate } from "../../api/adminApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../hooks/useToast";

export default function AdminEmailTemplates() {
  const { user } = useAuth();
  const showToast = useToast();

  const [templates, setTemplates] = useState([]);
  const [activeKey, setActiveKey] = useState("welcome");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form State
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [textContent, setTextContent] = useState("");
  const [variables, setVariables] = useState([]);
  const [description, setDescription] = useState("");
  const [editTab, setEditTab] = useState("html"); // "html" | "text"

  // Live Preview State
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "mobile"
  const [previewError, setPreviewError] = useState(null);

  // Test Send Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState(user?.email || "");

  const activeTextareaRef = useRef(null);

  // 1. Load initial template list
  useEffect(() => {
    fetchEmailTemplates()
      .then((list) => {
        setTemplates(list);
        if (list.length > 0 && !list.find((t) => t.key === activeKey)) {
          setActiveKey(list[0].key);
        }
      })
      .catch((err) => showToast(err.message, "⚠️"))
      .finally(() => setLoading(false));
  }, []);

  // 2. Load active template detail
  useEffect(() => {
    if (!activeKey) return;
    setLoading(true);
    fetchEmailTemplate(activeKey)
      .then((tpl) => {
        setSubject(tpl.subject);
        setHtmlContent(tpl.html_content);
        setTextContent(tpl.text_content);
        setVariables(tpl.variables || []);
        setDescription(tpl.description || "");
      })
      .catch((err) => showToast(err.message, "⚠️"))
      .finally(() => setLoading(false));
  }, [activeKey]);

  // 3. Debounced Live Preview update on edit
  useEffect(() => {
    if (!subject || !htmlContent) return;
    const timer = setTimeout(() => {
      previewEmailTemplate(activeKey, {
        subject,
        html_content: htmlContent,
        text_content: textContent,
      })
        .then((res) => {
          setPreviewSubject(res.subject);
          setPreviewHtml(res.html);
          setPreviewError(null);
        })
        .catch((err) => {
          setPreviewError(err.message);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [subject, htmlContent, textContent, activeKey]);

  // Click-to-insert variable at cursor position
  const insertVariable = (varName) => {
    const snippet = `{{ ${varName} }}`;
    if (editTab === "html") {
      setHtmlContent((prev) => prev + snippet);
    } else {
      setTextContent((prev) => prev + snippet);
    }
    showToast(`Inserted ${snippet}`, "✨");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmailTemplate(activeKey, {
        subject,
        html_content: htmlContent,
        text_content: textContent,
        description,
      });
      showToast("Email template saved successfully! Live emails will use this content.", "💾");
    } catch (err) {
      showToast(err.message, "⚠️");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testRecipient) return;
    setTesting(true);
    try {
      await testSendEmail(activeKey, {
        recipient_email: testRecipient,
        subject,
        html_content: htmlContent,
        text_content: textContent,
      });
      showToast(`Test email dispatched to ${testRecipient}!`, "🚀");
      setTestModalOpen(false);
    } catch (err) {
      showToast(err.message, "⚠️");
    } finally {
      setTesting(false);
    }
  };

  if (loading && templates.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm font-medium animate-pulse">
        Loading email templates…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Template Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900">Email Template Manager</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Live Dynamic Content
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Customize HTML and plain-text email templates. All edits reflect immediately across all system notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTestModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <span>✉️</span>
            <span>Send Test Email</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm shadow-emerald-600/20"
          >
            <span>💾</span>
            <span>{saving ? "Saving…" : "Save Template"}</span>
          </button>
        </div>
      </div>

      {/* Template Selection Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {templates.map((tpl) => (
          <button
            key={tpl.key}
            type="button"
            onClick={() => setActiveKey(tpl.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeKey === tpl.key
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{tpl.key === "welcome" ? "🥗" : "🔐"}</span>
            <span>{tpl.name}</span>
          </button>
        ))}
      </div>

      {/* Subject Line & Insertion Tags */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Subject Line
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email Subject Line (supports {{ variables }})"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {variables.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Insert variable:</span>
            {variables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVariable(v)}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-[11px] font-mono font-medium text-slate-600 transition"
                title={`Click to insert {{ ${v} }}`}
              >
                + &#123;&#123; {v} &#125;&#125;
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Split-Screen: Editor on Left, Live Render Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Pane: Code / Content Editor */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Editor Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditTab("html")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  editTab === "html" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                HTML Template
              </button>
              <button
                type="button"
                onClick={() => setEditTab("text")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  editTab === "text" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Plain Text Fallback
              </button>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 font-mono">Jinja2 Syntax</span>
          </div>

          {/* Textarea */}
          <div className="p-4 flex-1 flex flex-col">
            {editTab === "html" ? (
              <textarea
                ref={activeTextareaRef}
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={22}
                spellCheck={false}
                className="w-full h-full font-mono text-xs text-slate-800 bg-slate-900 text-slate-100 p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed overflow-y-auto"
                placeholder="Write your HTML and Jinja template here…"
              />
            ) : (
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={22}
                spellCheck={false}
                className="w-full h-full font-mono text-xs text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed overflow-y-auto"
                placeholder="Plain text version for text-only email clients…"
              />
            )}
          </div>
        </div>

        {/* Right Pane: Live Rendered Preview */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Preview Controls */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Live Client Preview</span>
              <span className="text-[10px] text-slate-400 font-medium">(Rendered with Mock Data)</span>
            </div>

            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                  previewDevice === "desktop" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                  previewDevice === "mobile" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Mobile
              </button>
            </div>
          </div>

          {/* Render Subject Bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs flex items-center gap-2">
            <span className="font-bold text-slate-400 uppercase text-[10px]">Subject:</span>
            <span className="font-semibold text-slate-800 truncate">{previewSubject || subject}</span>
          </div>

          {/* Preview Container */}
          <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-100/70 overflow-hidden">
            {previewError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-1 max-w-md">
                <div className="font-bold">⚠️ Template Syntax Error:</div>
                <div className="font-mono text-[11px]">{previewError}</div>
              </div>
            ) : (
              <div
                className={`w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 ${
                  previewDevice === "mobile" ? "max-w-[375px]" : "max-w-full"
                }`}
              >
                <iframe
                  srcDoc={previewHtml}
                  title="Email Preview"
                  className="w-full h-[480px] border-none bg-white"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Email Delivery Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>✉️</span>
                <span>Send Real Test Email</span>
              </h3>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Dispatches a live test version of <strong>{activeKey}</strong> with sample parameters to verify inbox layout and spam filters.
            </p>

            <form onSubmit={handleSendTest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Email Address</label>
                <input
                  type="email"
                  required
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 disabled:opacity-40"
                >
                  {testing ? "Dispatching…" : "Send Test Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
