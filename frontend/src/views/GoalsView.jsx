import CustomTargetsForm from "../components/goals/CustomTargetsForm";
import DietPlanCards from "../components/goals/DietPlanCards";

export default function GoalsView({ visible }) {
  return (
    <section className={visible ? "space-y-6" : "hidden space-y-6"}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <DietPlanCards />
        <CustomTargetsForm />
      </div>
    </section>
  );
}
