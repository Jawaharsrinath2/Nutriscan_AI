import { request } from "./client";

export const fetchToday = () => request("/api/meals/today");
export const logMeal = (meal) => request("/api/meals", { method: "POST", body: meal });
export const deleteMeal = (id) => request(`/api/meals/${encodeURIComponent(id)}`, { method: "DELETE" });
export const clearToday = () => request("/api/meals/today", { method: "DELETE" });
