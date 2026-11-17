import { request } from "./client";

export const fetchWater = (day = null) =>
  request(day ? `/api/water/today?day=${encodeURIComponent(day)}` : "/api/water/today");
export const setWater = (glasses, day = null) =>
  request(day ? `/api/water/today?day=${encodeURIComponent(day)}` : "/api/water/today", {
    method: "PUT",
    body: { glasses },
  });
