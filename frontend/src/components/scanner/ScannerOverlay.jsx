export default function ScannerOverlay({ visible }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px] flex flex-col items-center justify-center text-white z-20">
      <div className="scanner-beam"></div>
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/90 flex items-center justify-center shadow-lg mb-2 animate-bounce">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
      </div>
      <p className="text-sm font-bold tracking-wide">Analyzing Ingredients & Portions...</p>
      <p className="text-xs text-emerald-200 mt-0.5">Estimating weight, kcal, protein, carbs & fats</p>
    </div>
  );
}
