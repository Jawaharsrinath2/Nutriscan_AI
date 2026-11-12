export default function StatusCard({ error }) {
  if (!error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-sm font-semibold text-slate-500">
        Loading NutriScan…
      </div>
    );
  }
  return (
    <div className="bg-rose-50 rounded-2xl border border-rose-200 shadow-sm p-6 space-y-2">
      <h2 className="text-base font-extrabold text-rose-950">Can't load NutriScan data</h2>
      <p className="text-xs text-rose-900/90">{error.message}</p>
      <p className="text-xs text-rose-900/90">
        Start the backend from the <code>backend</code> folder with <code>uvicorn app.main:app --reload</code>, then refresh this page.
      </p>
    </div>
  );
}
