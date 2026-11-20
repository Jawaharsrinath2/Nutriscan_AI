import { request } from "./client";

export const fetchAdminOverview = () => request("/api/admin/overview");

export const fetchAdminUsers = ({ search = "", role = "", status = "", page = 1, limit = 20 } = {}) => {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (role) query.set("role", role);
  if (status) query.set("status", status);
  query.set("page", page);
  query.set("limit", limit);
  return request(`/api/admin/users?${query.toString()}`);
};

export const updateUserStatus = (userId, { is_active, unlock }) =>
  request(`/api/admin/users/${userId}/status`, {
    method: "PUT",
    body: { is_active, unlock },
  });

export const updateUserRole = (userId, role) =>
  request(`/api/admin/users/${userId}/role`, {
    method: "PUT",
    body: { role },
  });

export const deleteUser = (userId) =>
  request(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });

export const sendUserResetCode = (userId) =>
  request(`/api/admin/users/${userId}/send-reset-code`, {
    method: "POST",
  });

export const sendUserWeeklySummary = (userId) =>
  request(`/api/admin/users/${userId}/send-weekly-summary`, {
    method: "POST",
  });

export const broadcastWeeklySummary = () =>
  request("/api/admin/broadcast-weekly-summary", {
    method: "POST",
  });


export const fetchAdminUserDetail = (userId) => request(`/api/admin/users/${userId}/detail`);

export const fetchAdminUserMeals = (userId, day) => {
  const query = day ? `?day=${encodeURIComponent(day)}` : "";
  return request(`/api/admin/users/${userId}/meals${query}`);
};

export const fetchAdminUserPlans = (userId) => request(`/api/admin/users/${userId}/plans`);


export const fetchEmailTemplates = () => request("/api/admin/emails");

export const fetchEmailTemplate = (key) => request(`/api/admin/emails/${encodeURIComponent(key)}`);

export const updateEmailTemplate = (key, data) =>
  request(`/api/admin/emails/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: data,
  });

export const previewEmailTemplate = (key, data) =>
  request(`/api/admin/emails/${encodeURIComponent(key)}/preview`, {
    method: "POST",
    body: data,
  });

export const testSendEmail = (key, data) =>
  request(`/api/admin/emails/${encodeURIComponent(key)}/test-send`, {
    method: "POST",
    body: data,
  });

export const fetchAdminSystem = () => request("/api/admin/system");
