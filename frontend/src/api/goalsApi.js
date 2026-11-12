import { request } from "./client";

export const fetchGoals = () => request("/api/goals");
export const fetchPlans = () => request("/api/goals/plans");
export const selectPlan = (planKey) => request("/api/goals/plan", { method: "PUT", body: { plan_key: planKey } });
export const saveCustomGoals = (targets) => request("/api/goals/custom", { method: "PUT", body: targets });
