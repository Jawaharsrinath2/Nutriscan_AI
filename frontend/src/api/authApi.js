import { request } from "./client";

export function signup(email, username, password) {
  return request("/api/auth/signup", { method: "POST", body: { email, username, password } });
}

export function login(email, password) {
  return request("/api/auth/login", { method: "POST", body: { email, password } });
}

export function googleAuth(credential) {
  return request("/api/auth/google", { method: "POST", body: { credential } });
}

export function fetchMe() {
  return request("/api/auth/me");
}

export function fetchAuthConfig() {
  return request("/api/auth/config");
}

export function forgotPassword(email) {
  return request("/api/auth/forgot-password", { method: "POST", body: { email } });
}

export function verifyResetCode(email, code) {
  return request("/api/auth/verify-reset-code", { method: "POST", body: { email, code } });
}

export function resetPassword(email, code, newPassword) {
  return request("/api/auth/reset-password", { method: "POST", body: { email, code, new_password: newPassword } });
}

export function fetchDevCode(email) {
  return request(`/api/auth/dev/latest-code?email=${encodeURIComponent(email)}`);
}
