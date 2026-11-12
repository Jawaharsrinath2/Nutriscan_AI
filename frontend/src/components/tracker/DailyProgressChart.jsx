import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { useAppState } from "../../context/AppState";

const FONT = { size: 11, family: "Inter", weight: "600" };

export default function DailyProgressChart() {
  const { day, targets } = useAppState();
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    chartRef.current = new Chart(canvasRef.current.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Protein (g)", "Carbs (g)", "Fat (g)"],
        datasets: [
          { label: "Consumed Today", data: [0, 0, 0], backgroundColor: "#10b981", borderRadius: 8 },
          { label: "Daily Target", data: [0, 0, 0], backgroundColor: "#e2e8f0", borderRadius: 8 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top", labels: { boxWidth: 12, font: FONT } } },
        scales: {
          y: { beginAtZero: true, grid: { color: "#f1f5f9" } },
          x: { grid: { display: false } },
        },
      },
    });
    return () => chartRef.current.destroy();
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    chart.data.datasets[0].data = [day.totals.protein, day.totals.carbs, day.totals.fat];
    chart.data.datasets[1].data = [targets.protein, targets.carbs, targets.fat];
    chart.update();
  }, [day, targets]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="text-base font-bold text-slate-900">Daily Consumed vs. Target Macros</h3>
      <div className="relative h-64 w-full">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
