import { useEffect, useRef, useState } from "react";
import { useAppState } from "../../context/AppState";
import DetectionPins from "./DetectionPins";
import ScannerOverlay from "./ScannerOverlay";

const ZONE = "relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border-2 border-dashed border-slate-300 group";

export default function PhotoViewport() {
  const { plate, scanning, actions } = useAppState();
  const zoneRef = useRef(null);
  const [containerSize, setContainerSize] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    );
    observer.observe(zoneRef.current);
    return () => observer.disconnect();
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) actions.scanFile(file);
  };

  return (
    <div
      ref={zoneRef}
      className={dragging ? `${ZONE} ring-4 ring-emerald-400` : ZONE}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {plate.imageUrl ? (
        <>
          <img
            src={plate.imageUrl}
            alt="Scanned Meal Preview"
            className="w-full h-full object-cover max-w-full transition duration-300"
            onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
          <DetectionPins pins={plate.pins} containerSize={containerSize} naturalSize={naturalSize} />

          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/85 via-slate-900/50 to-transparent p-3 flex items-end justify-between">
            <div>
              {plate.cuisine && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white ${
                    plate.scanNote ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                >
                  {plate.cuisine}
                </span>
              )}
              <h3 className="text-white font-bold text-sm sm:text-base mt-1 drop-shadow">{plate.title}</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={actions.clearPhoto}
                className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg bg-white/20 hover:bg-rose-600/80 text-white backdrop-blur text-xs font-semibold transition"
                title="Remove photo"
              >
                ✕ Remove
              </button>
              <button
                type="button"
                onClick={actions.rescan}
                disabled={scanning}
                className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur text-xs font-semibold transition"
                title="Run the detector on this photo"
              >
                🔄 Re-Scan
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 select-none bg-slate-900/95">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-3xl mb-3 shadow-inner group-hover:scale-105 group-hover:border-emerald-500/50 transition-all">
            📸
          </div>
          <p className="text-sm font-bold text-slate-200">No Meal Photo Captured Yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Drag &amp; drop a food image here, or snap / upload below to inspect ingredients &amp; calories
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span>Supports JPG, PNG, WEBP</span>
            <span>•</span>
            <span>or pick a Demo Plate below</span>
          </div>
        </div>
      )}

      <ScannerOverlay visible={scanning} />
    </div>
  );
}
