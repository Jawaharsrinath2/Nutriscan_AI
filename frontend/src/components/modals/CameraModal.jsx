// Kept mounted (toggled with `hidden`, like the original) so the <video> element always exists for the stream.
export default function CameraModal({ camera, onCapture }) {
  return (
    <div className={`${camera.open ? "" : "hidden "}fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4`}>
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">📸 Take Food Picture</h3>
            <p className="text-xs text-slate-500">Center your plate in the frame to analyze ingredients & macros</p>
          </div>
          <button type="button" onClick={camera.closeCamera} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
            <video ref={camera.videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
            {!camera.available && (
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center text-white bg-slate-900/95">
                <p className="text-sm font-bold mb-2">Camera stream unavailable in this browser frame</p>
                <p className="text-xs text-slate-300 mb-4">You can still snap or pick a photo directly from your device camera roll:</p>
                <label htmlFor="cameraCaptureInput" className="cursor-pointer px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                  📱 Open Device Camera / Gallery
                </label>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={camera.closeCamera} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={onCapture} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm">🔴 Capture & Analyze Plate</button>
          </div>
        </div>
      </div>
    </div>
  );
}
