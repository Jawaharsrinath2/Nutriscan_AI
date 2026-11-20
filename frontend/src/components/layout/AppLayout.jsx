import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppState } from "../../context/AppState";
import { useCamera } from "../../hooks/useCamera";
import { PATHS } from "../../lib/paths";
import StatusCard from "../common/StatusCard";
import CameraModal from "../modals/CameraModal";
import ConfirmWeightsModal from "../modals/ConfirmWeightsModal";
import VisionModeModal from "../modals/VisionModeModal";
import VoiceMealLogModal from "../voice/VoiceMealLogModal";
import NutritionistChatDrawer from "../chat/NutritionistChatDrawer";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

/** Chrome shared by the signed-in pages: Left Sidebar, TopBar, modals, camera. */
export default function AppLayout() {
  const { ready, needsOnboarding, loadError, confirmWeightsOpen, actions } = useAppState();
  const [visionOpen, setVisionOpen] = useState(false);
  const [voiceLogOpen, setVoiceLogOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const camera = useCamera();

  // First sign-in: collect the profile before anything else.
  if (ready && needsOnboarding) return <Navigate to={PATHS.onboarding} replace />;

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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sleek Modern Left Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenVision={() => setVisionOpen(true)}
        onOpenVoiceLog={() => setVoiceLogOpen(true)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <TopBar
          onOpenMobile={() => setMobileMenuOpen(true)}
          onOpenVoiceLog={() => setVoiceLogOpen(true)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {ready ? (
            <Outlet
              context={{
                camera,
                openVoiceLog: () => setVoiceLogOpen(true),
              }}
            />
          ) : (
            <StatusCard error={loadError} />
          )}
        </main>
      </div>

      <CameraModal camera={camera} onCapture={captureFromCamera} />
      <VisionModeModal open={visionOpen} onClose={() => setVisionOpen(false)} />
      <ConfirmWeightsModal open={confirmWeightsOpen} onClose={actions.closeConfirmWeights} />
      <VoiceMealLogModal isOpen={voiceLogOpen} onClose={() => setVoiceLogOpen(false)} />
      <NutritionistChatDrawer />
    </div>
  );
}
