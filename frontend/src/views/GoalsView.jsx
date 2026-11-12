import CustomTargetsForm from "../components/goals/CustomTargetsForm";
import ProfileCard from "../components/goals/ProfileCard";
import TargetsCard from "../components/goals/TargetsCard";

export default function GoalsView({ visible, onEditProfile }) {
  return (
    <section className={visible ? "space-y-6" : "hidden space-y-6"}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ProfileCard onEdit={onEditProfile} />
        <div className="lg:col-span-6 space-y-6">
          <TargetsCard />
          <CustomTargetsForm />
        </div>
      </div>
    </section>
  );
}
