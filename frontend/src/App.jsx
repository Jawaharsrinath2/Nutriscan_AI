import { useRef } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import { useAuth } from "./context/AuthContext";
import { useAppState } from "./context/AppState";
import { usePageTitle } from "./hooks/usePageTitle";
import { HOME, PATHS } from "./lib/paths";
import AuthView from "./views/AuthView";
import GoalsView from "./views/GoalsView";
import LandingView from "./views/LandingView";
import OnboardingView from "./views/OnboardingView";
import ScannerView from "./views/ScannerView";
import TrackerView from "./views/TrackerView";
import ProfileView from "./views/ProfileView";
import AdminRoute from "./components/admin/AdminRoute";
import AdminLayout from "./views/admin/AdminLayout";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg mb-4 animate-pulse">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2m9-10a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      </div>
      <p className="text-slate-400 text-sm font-medium">Loading NutriScan AI…</p>
    </div>
  );
}

// ── route guards ─────────────────────────────────────────────────────────────

/** Pages that need a signed-in user. Signing out (from anywhere) lands on the landing page. */
function RequireUser({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to={PATHS.landing} replace />;
}

/** Login and signup: a signed-in person goes straight to the app. */
function SignedOutOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to={HOME} replace /> : children;
}

// ── pages ────────────────────────────────────────────────────────────────────

function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  usePageTitle(null);
  return (
    <LandingView
      isAuthenticated={!!user}
      onGoToApp={() => navigate(HOME)}
      onGetStarted={() => navigate(user ? HOME : PATHS.signup)}
      onSignIn={() => navigate(user ? HOME : PATHS.login)}
    />
  );
}

function AuthPage({ mode }) {
  const navigate = useNavigate();
  usePageTitle(mode === "signup" ? "Create account" : "Sign in");
  return (
    <AuthView
      initialMode={mode}
      onModeChange={(next) => navigate(next === "signup" ? PATHS.signup : PATHS.login, { replace: true })}
      onBack={() => navigate(PATHS.landing)}
    />
  );
}

/** First-run questionnaire. Stays mounted through "Writing your plan" / "Plan ready", which come after the
 *  profile is saved (when needsOnboarding has already turned false); only a fresh visit by an onboarded
 *  person is sent to the app. */
function OnboardingPage() {
  const { ready, needsOnboarding } = useAppState();
  const navigate = useNavigate();
  const startedHere = useRef(false);
  usePageTitle("Set up your plan");
  if (needsOnboarding) startedHere.current = true;
  if (!ready) return <LoadingScreen />;
  if (!needsOnboarding && !startedHere.current) return <Navigate to={HOME} replace />;
  return <OnboardingView key="onboard" onDone={() => navigate(HOME, { replace: true })} />;
}

/** The same stepper, opened at one step from the Goals page to edit the saved profile. */
function ProfileEditPage() {
  const { ready, needsOnboarding } = useAppState();
  const { step } = useParams();
  const navigate = useNavigate();
  usePageTitle("Edit profile");
  if (!ready) return <LoadingScreen />;
  if (needsOnboarding) return <Navigate to={PATHS.onboarding} replace />;
  const initialStep = Math.max(0, Number.parseInt(step, 10) || 0);
  return (
    <OnboardingView
      key={`edit-${initialStep}`}
      initialStep={initialStep}
      editing
      onDone={() => navigate(PATHS.dietPlan)}
      onCancel={() => navigate(PATHS.dietPlan)}
    />
  );
}

function Titled({ title, children }) {
  usePageTitle(title);
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path={PATHS.landing} element={<LandingPage />} />
      <Route path={PATHS.login} element={<SignedOutOnly><AuthPage mode="login" /></SignedOutOnly>} />
      <Route path={PATHS.signup} element={<SignedOutOnly><AuthPage mode="signup" /></SignedOutOnly>} />

      <Route path={PATHS.onboarding} element={<RequireUser><OnboardingPage /></RequireUser>} />
      <Route path={PATHS.profileEdit(":step")} element={<RequireUser><ProfileEditPage /></RequireUser>} />

      <Route element={<RequireUser><AppLayout /></RequireUser>}>
        <Route path={PATHS.scan} element={<Titled title="Food Scanner"><ScannerView /></Titled>} />
        <Route path={PATHS.dashboard} element={<Titled title="Dashboard"><TrackerView /></Titled>} />
        <Route path={PATHS.dietPlan} element={<Titled title="Diet Plan & Goals"><GoalsView /></Titled>} />
        <Route path={PATHS.profile} element={<Titled title="Profile & Settings"><ProfileView /></Titled>} />
      </Route>

      <Route
        path={PATHS.admin}
        element={
          <AdminRoute>
            <Titled title="Admin Control Center">
              <AdminLayout />
            </Titled>
          </AdminRoute>
        }
      />

      <Route path="*" element={<Navigate to={PATHS.landing} replace />} />
    </Routes>
  );
}
