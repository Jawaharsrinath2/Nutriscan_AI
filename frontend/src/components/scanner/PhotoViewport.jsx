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
      {plate.imageUrl && (
        <img
          src={plate.imageUrl}
          alt="Scanned Meal Preview"
          className="w-full h-full object-cover max-w-full transition duration-300"
          onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
      )}

      <ScannerOverlay visible={scanning} />
      <DetectionPins pins={plate.pins} containerSize={containerSize} naturalSize={naturalSize} />

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/85 via-slate-900/50 to-transparent p-3 flex items-end justify-between">
        <div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white ${
              plate.scanNote ? "bg-amber-500" : "bg-emerald-500"
            }`}
          >
            {plate.cuisine}
          </span>
          <h3 className="text-white font-bold text-sm sm:text-base mt-1 drop-shadow">{plate.title}</h3>
        </div>
        <button
          type="button"
          onClick={actions.rescan}
          disabled={scanning || !plate.imageUrl}
          className="shrink-0 whitespace-nowrap ml-2 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur text-xs font-semibold transition"
          title="Run the detector on this photo"
        >
          🔄 Re-Scan
        </button>
      </div>
    </div>
  );
}
