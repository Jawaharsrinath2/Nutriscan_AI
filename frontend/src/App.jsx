import { useEffect, useState } from "react";
import StatusCard from "./components/common/StatusCard";
import Header from "./components/layout/Header";
import CameraModal from "./components/modals/CameraModal";
import ConfirmWeightsModal from "./components/modals/ConfirmWeightsModal";
import VisionModeModal from "./components/modals/VisionModeModal";
import { useAuth } from "./context/AuthContext";
import { useAppState } from "./context/AppState";
import { useCamera } from "./hooks/useCamera";
import AuthView from "./views/AuthView";
import GoalsView from "./views/GoalsView";
import LandingView from "./views/LandingView";
import OnboardingView from "./views/OnboardingView";
import ScannerView from "./views/ScannerView";
import TrackerView from "./views/TrackerView";

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

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { ready, needsOnboarding, loadError, confirmWeightsOpen, actions } = useAppState();
  const [tab, setTab] = useState("scanner");
  const [authView, setAuthView] = useState({ open: false, mode: "login" });
  const [visionOpen, setVisionOpen] = useState(false);
  const [editStep, setEditStep] = useState(null); // onboarding step opened from the Goals tab, or null
  // First-run onboarding stays mounted through the "Writing your plan" / "Plan ready" screens, which come
  // after the profile is saved (when needsOnboarding has already turned false).
  const [firstRun, setFirstRun] = useState(false);
  const camera = useCamera();

  useEffect(() => {
    if (needsOnboarding) setFirstRun(true);
  }, [needsOnboarding]);

  // Signing out lands on the landing page, not on whichever auth form was used to sign in.
  useEffect(() => {
    if (!user) {
      setAuthView({ open: false, mode: "login" });
      setTab("scanner");
      setEditStep(null);
      setFirstRun(false);
    }
  }, [user]);

  // Auth loading state
  if (authLoading) return <LoadingScreen />;

  // Not authenticated: Show either Landing page or Auth form
  if (!user) {
    if (authView.open) {
      return (
        <AuthView
          initialMode={authView.mode}
          onBack={() => setAuthView({ open: false, mode: "login" })}
        />
      );
    }
    return (
      <LandingView
        onGetStarted={() => setAuthView({ open: true, mode: "signup" })}
        onSignIn={() => setAuthView({ open: true, mode: "login" })}
        isAuthenticated={false}
      />
    );
  }

  // First sign-in: collect the profile before anything else. Later: the same stepper edits it.
  if (ready && (needsOnboarding || firstRun || editStep !== null)) {
    const editing = !firstRun && !needsOnboarding && editStep !== null;
    return (
      <OnboardingView
        key={editing ? `edit-${editStep}` : "onboard"}
        initialStep={editing ? editStep : 0}
        editing={editing}
        onDone={() => {
          setFirstRun(false);
          setEditStep(null);
          setTab(editing ? "goals" : "scanner");
        }}
        onCancel={() => setEditStep(null)}
      />
    );
  }

  const captureFromCamera = async () => {
    const blob = await camera.captureFrame();
    if (!blob) {
      // No live stream: fall back to the device camera / gallery picker.
      document.getElementById("cameraCaptureInput").click();
      return;
    }
    camera.closeCamera();
    actions.scanBlob(blob);
  };

  // Authenticated user viewing Landing page
  if (tab === "landing") {
    return (
      <>
        <Header activeTab={tab} onTabChange={setTab} onOpenVision={() => setVisionOpen(true)} />
        <LandingView
          isAuthenticated={true}
          onGoToApp={() => setTab("scanner")}
          onGetStarted={() => setTab("scanner")}
          onSignIn={() => setTab("scanner")}
        />
      </>
    );
  }

  return (
    <>
      <Header activeTab={tab} onTabChange={setTab} onOpenVision={() => setVisionOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {ready ? (
          <>
            <ScannerView visible={tab === "scanner"} onOpenCamera={camera.openCamera} onCloseCamera={camera.closeCamera} />
            <TrackerView visible={tab === "tracker"} />
            <GoalsView visible={tab === "goals"} onEditProfile={setEditStep} />
          </>
        ) : (
          <StatusCard error={loadError} />
        )}
      </main>

      <CameraModal camera={camera} onCapture={captureFromCamera} />
      <VisionModeModal open={visionOpen} onClose={() => setVisionOpen(false)} />
      <ConfirmWeightsModal open={confirmWeightsOpen} onClose={actions.closeConfirmWeights} />
    </>
  );
}
