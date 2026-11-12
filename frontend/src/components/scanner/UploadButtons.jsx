import { useAppState } from "../../context/AppState";

// Clear the input after reading so picking the same file twice still triggers a scan.
const takeFile = (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  return file;
};

export default function UploadButtons({ onOpenCamera, onCloseCamera }) {
  const { actions } = useAppState();

  return (
    <div className="grid grid-cols-2 gap-3">
      <label htmlFor="fileUploadInput" className="cursor-pointer flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span>Upload Food Photo</span>
      </label>
      <input
        id="fileUploadInput"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = takeFile(e);
          if (file) actions.scanFile(file);
        }}
      />

      <button type="button" onClick={onOpenCamera} className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Take Camera Photo</span>
      </button>
      {/* Fallback mobile camera capture input (also opened from the camera modal) */}
      <input
        id="cameraCaptureInput"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = takeFile(e);
          if (file) {
            onCloseCamera();
            actions.scanFile(file);
          }
        }}
      />
    </div>
  );
}
