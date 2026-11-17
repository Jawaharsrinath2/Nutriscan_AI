import { request } from "./client";

export const fetchToday = (day = null) =>
  request(day ? `/api/meals/today?day=${encodeURIComponent(day)}` : "/api/meals/today");
export const fetchLoggedDates = () => request("/api/meals/logged-dates");
export const logMeal = (meal) => request("/api/meals", { method: "POST", body: meal });
export const deleteMeal = (id) => request(`/api/meals/${encodeURIComponent(id)}`, { method: "DELETE" });
export const clearToday = (day = null) =>
  request(day ? `/api/meals/today?day=${encodeURIComponent(day)}` : "/api/meals/today", { method: "DELETE" });
