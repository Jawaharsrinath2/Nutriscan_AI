import { request } from "./client";

export function scanPhoto(blob, filename = "photo.jpg") {
  const form = new FormData();
  form.append("photo", blob, filename);
  return request("/api/scan", { method: "POST", form });
}
