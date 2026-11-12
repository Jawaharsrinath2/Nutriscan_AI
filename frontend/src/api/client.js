export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Paths are relative: Vite proxies /api in dev, FastAPI serves everything in production.
export async function request(path, { method = "GET", body, form, signal } = {}) {
  const init = { method, signal, headers: {} };

  // Attach auth token to every request
  const token = localStorage.getItem("nutriscan_token");
  if (token) {
    init.headers["Authorization"] = `Bearer ${token}`;
  }

  if (form) {
    init.body = form;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(path, init);
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError("Can't reach the NutriScan backend. Is it running on port 8000?", 0);
  }

  // Auto-logout on 401 for protected endpoints (skip auth endpoints themselves)
  const isAuthEndpoint = path.startsWith("/api/auth/login") || path.startsWith("/api/auth/signup") || path.startsWith("/api/auth/google");
  if (response.status === 401 && !isAuthEndpoint && token) {
    localStorage.removeItem("nutriscan_token");
    window.location.reload();
    return;
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      // Non-JSON error body; keep the status text.
    }
    throw new ApiError(detail, response.status);
  }
  return response.status === 204 ? null : response.json();
}
