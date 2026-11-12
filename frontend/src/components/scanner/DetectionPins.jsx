import { coverTransform } from "../../lib/photoGeometry";

const inView = (p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100;

function Pin({ x, y, label }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5" style={{ left: `${x}%`, top: `${y}%` }}>
      <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white hotspot-dot shadow"></span>
      <span className="px-2 py-0.5 rounded-md bg-slate-950/80 text-white text-[10px] font-semibold backdrop-blur whitespace-nowrap shadow">
        {label}
      </span>
    </div>
  );
}

// Preset pins are stored as % of the viewport; detection boxes are fractions of the original photo
// and must be mapped through the object-cover crop.
export default function DetectionPins({ pins, containerSize, naturalSize }) {
  const toView = coverTransform(containerSize, naturalSize);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {pins.map((pin, i) => {
        if (pin.kind === "preset") return <Pin key={i} x={pin.x} y={pin.y} label={pin.label} />;

        const topLeft = toView(pin.box.x0, pin.box.y0);
        const bottomRight = toView(pin.box.x1, pin.box.y1);
        const center = { x: (topLeft.x + bottomRight.x) / 2, y: (topLeft.y + bottomRight.y) / 2 };
        if (!inView(center)) return null;
        return (
          <div key={i}>
            <div
              className="absolute rounded-md border-2 border-emerald-400/70"
              style={{
                left: `${topLeft.x}%`,
                top: `${topLeft.y}%`,
                width: `${bottomRight.x - topLeft.x}%`,
                height: `${bottomRight.y - topLeft.y}%`,
              }}
            ></div>
            <Pin x={center.x} y={center.y} label={pin.label} />
          </div>
        );
      })}
    </div>
  );
}
