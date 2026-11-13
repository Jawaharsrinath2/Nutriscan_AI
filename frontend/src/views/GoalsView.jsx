import { useNavigate } from "react-router-dom";
import CustomTargetsForm from "../components/goals/CustomTargetsForm";
import ProfileCard from "../components/goals/ProfileCard";
import TargetsCard from "../components/goals/TargetsCard";
import DietPlanCard from "../components/plans/DietPlanCard";
import WorkoutPlanCard from "../components/plans/WorkoutPlanCard";
import { PATHS } from "../lib/paths";

/** /dietplan — profile, targets, and the diet and workout plans. */
export default function GoalsView() {
  const navigate = useNavigate();
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ProfileCard onEdit={(step) => navigate(PATHS.profileEdit(step))} />
        <div className="lg:col-span-6 space-y-6">
          <TargetsCard />
          <CustomTargetsForm />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <DietPlanCard />
        <WorkoutPlanCard />
      </div>
    </section>
  );
}
