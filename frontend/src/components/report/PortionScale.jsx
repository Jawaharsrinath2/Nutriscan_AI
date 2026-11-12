import { useAppState } from "../../context/AppState";

const SCALES = [0.5, 1, 1.5, 2];
const ACTIVE = "portion-scale-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-emerald-700 shadow-sm transition";
const INACTIVE = "portion-scale-btn px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition";

export default function PortionScale() {
  const { plate, actions } = useAppState();
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
      <span className="text-[11px] font-semibold text-slate-500 px-2">Portion:</span>
      {SCALES.map((scale) => (
        <button
          key={scale}
          type="button"
          onClick={() => actions.scalePortion(scale)}
          className={Math.abs(plate.portionScale - scale) < 0.01 ? ACTIVE : INACTIVE}
        >
          {scale}x
        </button>
      ))}
    </div>
  );
}
