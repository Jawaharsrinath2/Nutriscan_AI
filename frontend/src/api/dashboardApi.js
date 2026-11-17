import { request } from "./client";

export const fetchDashboard = () => request("/api/dashboard");
