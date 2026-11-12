import { request } from "./client";

export const fetchPlans = () => request("/api/plans");
// kind: "diet" | "workout" | "both". Each AI plan takes 10-30 s to write.
export const generatePlans = (kind = "both") => request("/api/plans/generate", { method: "POST", body: { kind } });
