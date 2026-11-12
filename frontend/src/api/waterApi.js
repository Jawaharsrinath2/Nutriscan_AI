import { request } from "./client";

export const fetchWater = () => request("/api/water/today");
export const setWater = (glasses) => request("/api/water/today", { method: "PUT", body: { glasses } });
