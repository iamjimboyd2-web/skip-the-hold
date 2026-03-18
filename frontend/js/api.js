const API_BASE = "https://skip-the-hold-1.onrender.com/api";
const TOKEN_KEY = "skipthehold_token";
const USER_KEY = "skipthehold_user";

export async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token && options.auth !== false) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return response.json();
}
