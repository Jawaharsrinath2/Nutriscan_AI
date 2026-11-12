import IngredientsTable from "../components/ingredients/IngredientsTable";
import SummaryStrip from "../components/layout/SummaryStrip";
import NutritionReport from "../components/report/NutritionReport";
import CaptureCard from "../components/scanner/CaptureCard";
import SamplePlates from "../components/scanner/SamplePlates";

export default function ScannerView({ visible, onOpenCamera, onCloseCamera }) {
  return (
    <section className={visible ? "space-y-6" : "hidden space-y-6"}>
      <SummaryStrip />

      {/* Left = Camera/Upload & Sample Plates | Right = Pre-Meal Nutrition & Ingredients */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-5">
          <CaptureCard onOpenCamera={onOpenCamera} onCloseCamera={onCloseCamera} />
          <SamplePlates />
        </div>
        <div className="lg:col-span-7 space-y-5">
          <NutritionReport />
          <IngredientsTable />
        </div>
      </div>
    </section>
  );
}
