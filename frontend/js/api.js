const API_BASE = const API_BASE = "https://skip-the-hold-1.onrender.com/api"
const TOKEN_KEY = "skipthehold_token";
const USER_KEY = "skipthehold_user";

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token && options.auth !== false) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function login(payload) {
  return request("/auth/login", {
    method: "POST",
    body: payload,
    auth: false
  });
}

export async function register(payload) {
  return request("/auth/register", {
    method: "POST",
    body: payload,
    auth: false
  });
}

export async function getMe() {
  return request("/auth/me");
}

export async function getTrending(limit = 8) {
  return request(`/trending?limit=${limit}`);
}

export async function getCompanies(query = "") {
  return request(`/companies${query ? `?${query}` : ""}`);
}

export async function searchCompanies({ q = "", industry = "All", page = 1, limit = 20 }) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (industry) params.set("industry", industry);
  params.set("page", String(page));
  params.set("limit", String(limit));

  return request(`/companies/search?${params.toString()}`);
}

export async function getCompany(id) {
  return request(`/companies/${id}`);
}

export async function getCompanyBestTime(id) {
  return request(`/companies/${id}/best-time`);
}

export async function submitWaitTime(payload) {
  return request("/waittimes", {
    method: "POST",
    body: payload
  });
}

export async function betaSignup(payload) {
  return request("/beta-signup", {
    method: "POST",
    body: payload,
    auth: false
  });
}

export async function getAdminAnalytics() {
  return request("/admin/analytics");
}

export async function getAdminReports(limit = 50) {
  return request(`/admin/waittimes?limit=${limit}`);
}

export async function createCompany(payload) {
  return request("/admin/companies", {
    method: "POST",
    body: payload
  });
}

export async function updateCompany(id, payload) {
  return request(`/admin/companies/${id}`, {
    method: "PUT",
    body: payload
  });
}

export async function deleteWaitTime(id) {
  return request(`/admin/waittimes/${id}`, {
    method: "DELETE"
  });
}

export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) {
    return "No reports yet";
  }

  return `${Math.round(minutes)} min`;
}

export function formatDate(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function renderFeedback(element, message, tone = "") {
  element.textContent = message;
  element.className = `feedback ${tone}`.trim();
}
