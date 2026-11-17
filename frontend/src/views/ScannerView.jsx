import { useOutletContext } from "react-router-dom";
import NutritionReport from "../components/report/NutritionReport";
import CaptureCard from "../components/scanner/CaptureCard";
import SamplePlates from "../components/scanner/SamplePlates";

/** /scan — the camera lives in AppLayout (its modal must outlive this page), reached through the outlet. */
export default function ScannerView() {
  const { camera } = useOutletContext();
  return (
    <section className="space-y-6">
      {/* Left = Camera/Upload & Sample Plates | Right = Pre-Meal Nutrition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-5">
          <CaptureCard onOpenCamera={camera.openCamera} onCloseCamera={camera.closeCamera} />
          <SamplePlates />
        </div>
        <div className="lg:col-span-7 space-y-5">
          <NutritionReport />
        </div>
      </div>
    </section>
  );
}
