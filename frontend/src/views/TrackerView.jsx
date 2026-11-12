import DailyProgressChart from "../components/tracker/DailyProgressChart";
import HydrationTracker from "../components/tracker/HydrationTracker";
import LoggedMeals from "../components/tracker/LoggedMeals";

export default function TrackerView({ visible }) {
  return (
    <section className={visible ? "space-y-6" : "hidden space-y-6"}>
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
