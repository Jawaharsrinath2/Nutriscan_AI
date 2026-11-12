import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const COLORS = ["#6366f1", "#f59e0b", "#f43f5e"];

export default function MacroDoughnut({ split }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    chartRef.current = new Chart(canvasRef.current.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Protein (kcal)", "Carbs (kcal)", "Fat (kcal)"],
        datasets: [{ data: [0, 0, 0], backgroundColor: COLORS, borderWidth: 2, borderColor: "#ffffff" }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11, family: "Inter", weight: "600" } } },
        },
      },
    });
    return () => chartRef.current.destroy();
  }, []);

  useEffect(() => {
    if (!chartRef.current || !split) return;
    chartRef.current.data.datasets[0].data = [split.protein_kcal, split.carbs_kcal, split.fat_kcal];
    chartRef.current.update();
  }, [split]);

  return (
    <div className="md:col-span-5 bg-slate-50 rounded-xl p-3 border border-slate-200/70">
      <div className="text-xs font-bold text-slate-700 text-center mb-1">Calorie Split by Macro</div>
      <div className="relative h-44 w-full">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
