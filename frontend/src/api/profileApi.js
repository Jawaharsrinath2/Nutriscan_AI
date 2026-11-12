import { request } from "./client";

export const fetchProfile = () => request("/api/profile");
export const saveProfile = (profile) => request("/api/profile", { method: "PUT", body: profile });
export const previewTargets = (profile, signal) =>
  request("/api/profile/targets/preview", { method: "POST", body: profile, signal });
export const recalculateTargets = () => request("/api/profile/targets/recalculate", { method: "POST" });
