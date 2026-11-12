// Labels for the onboarding answers. Keys match backend/app/schemas/profile.py.

export const SEXES = [
  { key: "male", label: "Male", icon: "👨" },
  { key: "female", label: "Female", icon: "👩" },
];

export const GOALS = [
  { key: "lose", label: "Lose weight", icon: "🔥", desc: "Steady fat loss with enough protein to keep muscle." },
  { key: "gain", label: "Gain weight", icon: "🍚", desc: "A small surplus to build size without excess fat." },
  { key: "strength", label: "Build strength", icon: "🏋️", desc: "Eat at maintenance and train to get stronger." },
];

export const ACTIVITIES = [
  { key: "desk", label: "Desk job", icon: "💻", desc: "Sitting most of the day, little walking." },
  { key: "light", label: "Lightly active", icon: "🚶", desc: "On your feet a few hours or a daily walk." },
  { key: "active", label: "Active", icon: "🏃", desc: "Moving most of the day or regular sport." },
  { key: "very_active", label: "Very active", icon: "⚡", desc: "Physical job or hard training most days." },
];

export const EXPERIENCE = [
  { key: "beginner", label: "Beginner", desc: "Under a year of training" },
  { key: "intermediate", label: "Intermediate", desc: "1–3 years" },
  { key: "advanced", label: "Advanced", desc: "3+ years" },
];

export const DIET_PREFS = [
  { key: "veg", label: "Vegetarian", icon: "🥬" },
  { key: "eggetarian", label: "Eggetarian", icon: "🥚" },
  { key: "nonveg", label: "Non-veg", icon: "🍗" },
];

export const AVOID_OPTIONS = ["Dairy", "Gluten", "Nuts", "Soy", "Seafood", "Spicy food", "Sugar", "Fried food"];

export const labelOf = (options, key) => options.find((o) => o.key === key)?.label ?? key;

// Blank answers for a new person; also the shape the backend expects on PUT /api/profile.
export const EMPTY_PROFILE = {
  sex: "male",
  age: "",
  height_cm: "",
  weight_kg: "",
  target_weight_kg: "",
  goal: null,
  activity: null,
  gym: null,
  gym_days: 3,
  experience: null,
  home_workouts: false,
  diet_pref: null,
  avoid: [],
  kcal_adjust: 0,
};

// Strip the form's strings/nulls into the numbers the API wants.
export function toApiProfile(form) {
  const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  return {
    sex: form.sex,
    age: num(form.age),
    height_cm: num(form.height_cm),
    weight_kg: num(form.weight_kg),
    target_weight_kg: num(form.target_weight_kg),
    goal: form.goal,
    activity: form.activity,
    gym: Boolean(form.gym),
    gym_days: form.gym ? Number(form.gym_days) : 0,
    experience: form.gym ? form.experience : null,
    home_workouts: form.gym ? false : Boolean(form.home_workouts),
    diet_pref: form.diet_pref,
    avoid: form.avoid,
    kcal_adjust: Number(form.kcal_adjust) || 0,
  };
}

export const bmiOf = (heightCm, weightKg) => {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  return h > 0 && w > 0 ? Math.round((w / (h * h)) * 10) / 10 : null;
};
