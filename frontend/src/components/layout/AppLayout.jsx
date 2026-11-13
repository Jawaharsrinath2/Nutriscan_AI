import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppState } from "../../context/AppState";
import { useCamera } from "../../hooks/useCamera";
import { PATHS } from "../../lib/paths";
import StatusCard from "../common/StatusCard";
import CameraModal from "../modals/CameraModal";
import ConfirmWeightsModal from "../modals/ConfirmWeightsModal";
import VisionModeModal from "../modals/VisionModeModal";
import Header from "./Header";

/** Chrome shared by the signed-in pages (/scan, /dashboard, /dietplan): header, modals, camera. */
export default function AppLayout() {
  const { ready, needsOnboarding, loadError, confirmWeightsOpen, actions } = useAppState();
  const [visionOpen, setVisionOpen] = useState(false);
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
    <>
      <Header onOpenVision={() => setVisionOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {ready ? <Outlet context={{ camera }} /> : <StatusCard error={loadError} />}
      </main>

      <CameraModal camera={camera} onCapture={captureFromCamera} />
      <VisionModeModal open={visionOpen} onClose={() => setVisionOpen(false)} />
      <ConfirmWeightsModal open={confirmWeightsOpen} onClose={actions.closeConfirmWeights} />
    </>
  );
}
