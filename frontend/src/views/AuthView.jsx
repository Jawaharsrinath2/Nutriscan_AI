import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAuthConfig,
  fetchDevCode,
  forgotPassword,
  googleAuth,
  login,
  resetPassword,
  signup,
} from "../api/authApi";
import { useAuth } from "../context/AuthContext";

/* ── SVG Icons (inline to avoid extra deps) ────────────────────────────── */

const MailIcon = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

/* ── Feature bullets for the left panel ────────────────────────────────── */

const features = [
  { icon: "📸", title: "Scan Your Meals", desc: "AI-powered food photo detection with real-time nutrition data" },
  { icon: "📊", title: "Track Nutrition", desc: "Log meals, monitor macros, and hit your daily targets" },
  { icon: "🎯", title: "Achieve Goals", desc: "Personalized diet plans and smart portion recommendations" },
];

/* ── AuthView Component ────────────────────────────────────────────────── */

export default function AuthView({ initialMode = "login", onBack }) {
  const { saveAuth } = useAuth();
  const [mode, setMode] = useState(initialMode); // "login" | "signup" | "forgot_password"
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  const googleBtnRef = useRef(null);

  // Forgot password flow states
  const [resetStep, setResetStep] = useState(1); // 1 = enter email, 2 = enter code & new pass
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [devCodeAvailable, setDevCodeAvailable] = useState(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Fetch Google client ID on mount
  useEffect(() => {
    fetchAuthConfig()
      .then((cfg) => {
        if (cfg.google_client_id) setGoogleClientId(cfg.google_client_id);
      })
      .catch(() => {});
  }, []);

  // Google OAuth callback
  const handleGoogleResponse = useCallback(
    async (response) => {
      setLoading(true);
      setError("");
      try {
        const data = await googleAuth(response.credential);
        saveAuth(data);
      } catch (err) {
        setError(err.message || "Google sign-in failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [saveAuth],
  );

  // Load & render Google Sign-In button
  useEffect(() => {
    if (!googleClientId || mode === "forgot_password") return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: googleBtnRef.current.offsetWidth,
        text: "signin_with",
        shape: "pill",
      });
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [googleClientId, handleGoogleResponse, mode]);

  // Client-side validation for login/signup
  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
    if (mode === "signup") {
      if (!form.username.trim()) errs.username = "Username is required.";
      else if (form.username.length < 3) errs.username = "Username must be at least 3 characters.";
      else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = "Only letters, numbers, and underscores.";
    }
    if (!form.password) errs.password = "Password is required.";
    else if (form.password.length < 8) errs.password = "Password must be at least 8 characters.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!validate()) return;
    setLoading(true);
    try {
      const data =
        mode === "signup"
          ? await signup(form.email, form.username, form.password)
          : await login(form.email, form.password);
      saveAuth(data);
    } catch (err) {
      if (err.status === 429) setError("Too many attempts. Please wait a few minutes and try again.");
      else if (err.status === 423) setError(err.message);
      else if (err.status === 409) setError(err.message || "An account with this email or username already exists.");
      else setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot password: Step 1 request code
  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!resetEmail.trim() || !/\S+@\S+\.\S+/.test(resetEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(resetEmail.trim().toLowerCase());
      setSuccessMsg(res.detail || "Verification code sent to your email.");
      setResetStep(2);
      // Check dev helper for latest code (in case SMTP is in dev mock mode)
      fetchDevCode(resetEmail.trim().toLowerCase())
        .then((data) => {
          if (data?.code) setDevCodeAvailable(data.code);
        })
        .catch(() => {});
    } catch (err) {
      if (err.status === 429) setError("Too many requests. Please wait a few minutes before trying again.");
      else setError(err.message || "Could not send verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot password: Step 2 submit new password with code
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!resetCode.trim()) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(resetEmail.trim().toLowerCase(), resetCode.trim(), newPassword);
      setSuccessMsg(res.detail || "Password reset successfully! Please sign in with your new password.");
      // Pre-fill email and switch to login mode
      setForm((prev) => ({ ...prev, email: resetEmail, password: "" }));
      setMode("login");
      setResetStep(1);
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Failed to reset password. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
    setError("");
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError("");
    setSuccessMsg("");
    setFieldErrors({});
  };

  const startForgotPassword = () => {
    setMode("forgot_password");
    setResetStep(1);
    setResetEmail(form.email || "");
    setError("");
    setSuccessMsg("");
    setDevCodeAvailable(null);
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left decorative panel (hidden on mobile) ───────────────────── */}
      <div className="hidden md:flex md:w-[45%] relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex-col items-center justify-center p-12 text-white">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-8 left-8 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur transition"
          >
            <span>←</span>
            <span>Back to Home</span>
          </button>
        )}

        {/* Animated blobs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 text-center max-w-md">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2m9-10a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            NutriScan <span className="text-emerald-200">AI</span>
          </h1>
          <p className="text-lg text-emerald-100 mb-10">Your AI-Powered Nutrition Companion</p>

          <div className="space-y-6 text-left">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4 bg-white/10 backdrop-blur rounded-xl p-4">
                <span className="text-2xl mt-0.5">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-white">{f.title}</h3>
                  <p className="text-sm text-emerald-100">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Mobile gradient header */}
        <div className="md:hidden bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8 text-white text-center relative">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="absolute top-4 left-4 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/20 text-white text-xs font-semibold"
            >
              <span>← Home</span>
            </button>
          )}

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2m9-10a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              NutriScan <span className="text-emerald-200">AI</span>
            </h1>
          </div>
          <p className="text-sm text-emerald-100">Your AI-Powered Nutrition Companion</p>
        </div>

        {/* Form card */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50">
          <div className="w-full max-w-md">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="hidden sm:inline-flex items-center gap-1.5 mb-3 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition"
              >
                <span>←</span>
                <span>Back to Home</span>
              </button>
            )}

            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-slate-100">
              {/* ── FORGOT PASSWORD FLOW ───────────────────────────────── */}
              {mode === "forgot_password" ? (
                <div>
                  <div className="mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-3 border border-emerald-100">
                      🔐
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-1">
                      {resetStep === 1 ? "Reset your password" : "Enter verification code"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {resetStep === 1
                        ? "Enter your account email and we'll send you a 6-digit verification code."
                        : `We sent a 6-digit code to ${resetEmail}. Check your inbox.`}
                    </p>
                  </div>

                  {/* Success banner */}
                  {successMsg && (
                    <div className="mb-6 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
                      <span className="mt-0.5 text-emerald-600 flex-shrink-0">✓</span>
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* Error banner */}
                  {error && (
                    <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                      <span className="mt-0.5 text-red-500 flex-shrink-0">⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Development convenience auto-fill chip */}
                  {resetStep === 2 && devCodeAvailable && (
                    <div className="mb-4 p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                      <span className="text-slate-600">Dev Code: <strong>{devCodeAvailable}</strong></span>
                      <button
                        type="button"
                        onClick={() => setResetCode(devCodeAvailable)}
                        className="text-emerald-700 font-bold hover:underline"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}

                  {resetStep === 1 ? (
                    /* Step 1: Enter Email Form */
                    <form onSubmit={handleRequestResetCode} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Account Email</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <MailIcon />
                          </div>
                          <input
                            type="email"
                            value={resetEmail}
                            onChange={(e) => {
                              setResetEmail(e.target.value);
                              setError("");
                            }}
                            placeholder="you@example.com"
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
                            autoComplete="email"
                            autoFocus
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition disabled:opacity-60"
                      >
                        {loading ? <Spinner /> : "Send Verification Code"}
                      </button>
                    </form>
                  ) : (
                    /* Step 2: Enter Code & New Password */
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      {/* Code */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-sm font-medium text-slate-700">6-Digit Code</label>
                          <span className="text-xs text-slate-400">Expires in 15 mins</span>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <KeyIcon />
                          </div>
                          <input
                            type="text"
                            maxLength={6}
                            value={resetCode}
                            onChange={(e) => {
                              setResetCode(e.target.value.replace(/\D/g, ""));
                              setError("");
                            }}
                            placeholder="123456"
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center font-mono font-bold text-lg tracking-widest text-slate-900 transition"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <LockIcon />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              setError("");
                            }}
                            placeholder="At least 8 characters"
                            className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <LockIcon />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setError("");
                            }}
                            placeholder="Re-enter new password"
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition disabled:opacity-60"
                      >
                        {loading ? <Spinner /> : "Reset Password & Sign In"}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResetStep(1);
                            setError("");
                          }}
                          className="text-xs text-slate-500 hover:text-emerald-600 font-semibold transition"
                        >
                          Didn't get the code? Resend
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setError("");
                        setSuccessMsg("");
                      }}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1 mx-auto"
                    >
                      <span>←</span>
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ── STANDARD SIGNIN / SIGNUP FLOW ─────────────────────── */
                <div>
                  {/* Heading */}
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-1">
                    {mode === "login" ? "Welcome back" : "Create your account"}
                  </h2>
                  <p className="text-sm text-slate-500 mb-8">
                    {mode === "login"
                      ? "Sign in to continue your nutrition journey"
                      : "Start tracking your meals with AI"}
                  </p>

                  {/* Success banner */}
                  {successMsg && (
                    <div className="mb-6 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
                      <span className="mt-0.5 text-emerald-600 flex-shrink-0">✓</span>
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* Error banner */}
                  {error && (
                    <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                      <span className="mt-0.5 text-red-500 flex-shrink-0">⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <MailIcon />
                        </div>
                        <input
                          type="email"
                          value={form.email}
                          onChange={setField("email")}
                          placeholder="you@example.com"
                          className={`w-full pl-11 pr-4 py-2.5 rounded-xl border ${fieldErrors.email ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-emerald-500"} focus:outline-none focus:ring-2 focus:border-transparent text-sm transition`}
                          autoComplete="email"
                        />
                      </div>
                      {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
                    </div>

                    {/* Username (signup only) */}
                    {mode === "signup" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <UserIcon />
                          </div>
                          <input
                            type="text"
                            value={form.username}
                            onChange={setField("username")}
                            placeholder="cool_username"
                            className={`w-full pl-11 pr-4 py-2.5 rounded-xl border ${fieldErrors.username ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-emerald-500"} focus:outline-none focus:ring-2 focus:border-transparent text-sm transition`}
                            autoComplete="username"
                          />
                        </div>
                        {fieldErrors.username && <p className="mt-1 text-xs text-red-500">{fieldErrors.username}</p>}
                      </div>
                    )}

                    {/* Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-slate-700">Password</label>
                        {mode === "login" && (
                          <button
                            type="button"
                            onClick={startForgotPassword}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <LockIcon />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={setField("password")}
                          placeholder="••••••••"
                          className={`w-full pl-11 pr-11 py-2.5 rounded-xl border ${fieldErrors.password ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-emerald-500"} focus:outline-none focus:ring-2 focus:border-transparent text-sm transition`}
                          autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? <Spinner /> : mode === "login" ? "Sign In" : "Create Account"}
                    </button>
                  </form>

                  {/* Divider & Google OAuth */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-4 text-slate-400 font-medium">or continue with</span>
                    </div>
                  </div>

                  {googleClientId ? (
                    <div ref={googleBtnRef} className="flex justify-center min-h-[44px]" />
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setError(
                          "Google Sign-In is ready! To activate live Google OAuth, provide your GOOGLE_CLIENT_ID in backend/.env."
                        )
                      }
                      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition shadow-sm"
                    >
                      <GoogleIcon />
                      <span>Continue with Google</span>
                    </button>
                  )}

                  {/* Toggle mode */}
                  <p className="mt-6 text-center text-sm text-slate-500">
                    {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                      type="button"
                      onClick={switchMode}
                      className="text-emerald-600 font-semibold hover:text-emerald-700 transition"
                    >
                      {mode === "login" ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-slate-400">
              By continuing, you agree to NutriScan AI's Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
