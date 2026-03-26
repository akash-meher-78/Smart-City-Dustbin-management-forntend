const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:3000";

const BASE = RAW_BASE.replace(/\/$/, "");

function getStoredToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("auth-token") || "";
}

function getDefaultCredentials() {
  if (typeof window === "undefined") return "omit";

  try {
    const baseOrigin = new URL(BASE).origin;
    return baseOrigin === window.location.origin ? "include" : "omit";
  } catch {
    return "omit";
  }
}

export const API_ENDPOINTS = {
  auth: {
    register: "/api/v1/auth/register",
    login: "/api/v1/auth/login",
    logout: "/api/v1/auth/logout",
    sendOtp: "/api/v1/auth/otp/send",
    verifyOtp: "/api/v1/auth/otp/verify",
  },
  user: {
    all: "/api/users",
    current: "/api/user/current",
    update: "/api/user/update",
    deleteCurrent: "/api/user/delete",
  },
  bin: {
    all: "/api/bin/all",
    create: "/api/bin/create",
    byId: (binId) => `/api/bin/${encodeURIComponent(binId)}`,
    deleteById: (binId) => `/api/bin/${encodeURIComponent(binId)}`,
    deleteByIdAlt: (binId) => `/api/bin/delete/${encodeURIComponent(binId)}`,
  },
};

export async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`;
  const token = getStoredToken();
  const { withCredentials, useAuth = true, ...rawOptions } = options;
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...(useAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: withCredentials === true ? "include" : getDefaultCredentials(),
  };

  const merged = {
    ...defaultOptions,
    ...rawOptions,
    headers: { ...defaultOptions.headers, ...(rawOptions.headers || {}) },
  };

  if (merged.body && typeof merged.body !== "string") {
    merged.body = JSON.stringify(merged.body);
  }

  try {
    const res = await fetch(url, merged);
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
    } catch {
      return { ok: res.ok, status: res.status, data: text };
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {
        message: "Network error. Please check your internet connection and API base URL.",
        details: error?.message || "Unknown network error",
      },
    };
  }
}

export const authApi = {
  register: (payload) => apiFetch(API_ENDPOINTS.auth.register, { method: "POST", body: payload, useAuth: false }),
  login: (payload) => apiFetch(API_ENDPOINTS.auth.login, { method: "POST", body: payload, useAuth: false }),
  logout: () => apiFetch(API_ENDPOINTS.auth.logout, { method: "GET" }),
  sendOtp: (payload) => apiFetch(API_ENDPOINTS.auth.sendOtp, { method: "POST", body: payload, useAuth: false }),
  verifyOtp: (payload) => apiFetch(API_ENDPOINTS.auth.verifyOtp, { method: "POST", body: payload, useAuth: false }),
};

export const userApi = {
  getCurrent: () => apiFetch(API_ENDPOINTS.user.current),
  getAll: () => apiFetch(API_ENDPOINTS.user.all),
  updateCurrent: (payload) => apiFetch(API_ENDPOINTS.user.update, { method: "PATCH", body: payload }),
  deleteCurrent: () => apiFetch(API_ENDPOINTS.user.deleteCurrent, { method: "DELETE" }),
};

export const binApi = {
  getAll: () => apiFetch(API_ENDPOINTS.bin.all),
  create: (payload) => apiFetch(API_ENDPOINTS.bin.create, { method: "POST", body: payload }),
  getById: (binId) => apiFetch(API_ENDPOINTS.bin.byId(binId)),
  deleteById: async (binId) => {
    const primary = await apiFetch(API_ENDPOINTS.bin.deleteById(binId), { method: "DELETE" });
    if (primary.ok || primary.status !== 404) return primary;
    return apiFetch(API_ENDPOINTS.bin.deleteByIdAlt(binId), { method: "DELETE" });
  },
};

export default apiFetch;
