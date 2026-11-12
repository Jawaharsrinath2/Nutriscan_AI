import { request } from "./client";

export const fetchVision = () => request("/api/vision");
export const setVisionMode = (mode) => request("/api/vision", { method: "PUT", body: { mode } });
