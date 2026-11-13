import DailyProgressChart from "../components/tracker/DailyProgressChart";
import HydrationTracker from "../components/tracker/HydrationTracker";
import LoggedMeals from "../components/tracker/LoggedMeals";

/** /dashboard — today's log, progress chart and water. */
export default function TrackerView() {
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <LoggedMeals />
        <div className="lg:col-span-5 space-y-6">
          <DailyProgressChart />
          <HydrationTracker />
        </div>
      </div>
    </section>
  );
}
