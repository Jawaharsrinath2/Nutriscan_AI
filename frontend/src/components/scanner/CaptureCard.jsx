import { useAppState } from "../../context/AppState";
import DishProfileSelect from "./DishProfileSelect";
import PhotoViewport from "./PhotoViewport";
import QuickDishChips from "./QuickDishChips";
import UploadButtons from "./UploadButtons";

export default function CaptureCard({ onOpenCamera, onCloseCamera }) {
  const { plate, actions } = useAppState();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">1. Capture or Upload Meal Photo</h2>
          <p className="text-xs text-slate-500">Take a picture of your plate or pick an image to inspect before eating</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            plate.scanNote ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}
        >
          {plate.badge}
        </span>
      </div>

      <div className="p-4 space-y-4">
        <PhotoViewport />
        {plate.items.length > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-900 font-semibold">
              <span>⚖️</span>
              <span>{plate.items.length} food items on plate</span>
            </div>
            <button
              type="button"
              onClick={actions.openConfirmWeights}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
            >
              Adjust Approx Weights →
            </button>
          </div>
        )}
        {plate.scanNote && (
          <p role="status" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ {plate.scanNote}
          </p>
        )}
        <UploadButtons onOpenCamera={onOpenCamera} onCloseCamera={onCloseCamera} />
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
          <DishProfileSelect />
          <QuickDishChips />
        </div>
      </div>
    </div>
  );
}
