import { request } from "./client";

const toPayload = (items) => ({ items: items.map(({ id, key, grams }) => ({ id, key, grams })) });

export const evaluatePlate = (items, signal) =>
  request("/api/nutrition/evaluate", { method: "POST", body: toPayload(items), signal });

export const autoFitPlate = (items) => request("/api/nutrition/auto-fit", { method: "POST", body: toPayload(items) });
