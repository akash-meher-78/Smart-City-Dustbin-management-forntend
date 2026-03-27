const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:3000";

const BASE = RAW_BASE.replace(/\/$/, "");
const BIN_CACHE_KEY = "smartbin-known-bin-ids";

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
  driver: {
    all: "/api/drivers",
    byId: (driverId) => `/api/driver/${encodeURIComponent(driverId)}`,
    deleteById: (driverId) => `/api/driver/${encodeURIComponent(driverId)}`,
  },
  route: {
    assign: "/api/route/assign",
    assignedByDriverId: (driverId) => `/api/route/driver/${encodeURIComponent(driverId)}`,
    assignedByEmail: (email) => `/api/route/driver?email=${encodeURIComponent(email)}`,
    markCollected: "/api/route/collect",
  },
  bin: {
    all: "/api/bin/all",
    fillLevels: "/api/bin/fill-level",
    create: "/api/bin/create",
    byId: (binId) => `/api/bin/${encodeURIComponent(binId)}`,
    deleteWithBody: "/api/bin/delete",
    deleteById: (binId) => `/api/bin/${encodeURIComponent(binId)}`,
    deleteByIdAlt: (binId) => `/api/bin/delete/${encodeURIComponent(binId)}`,
  },
};

function readKnownBinIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BIN_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string" && id.trim()) : [];
  } catch {
    return [];
  }
}

function writeKnownBinIds(ids) {
  if (typeof window === "undefined") return;
  const clean = [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
  localStorage.setItem(BIN_CACHE_KEY, JSON.stringify(clean));
}

function rememberBinId(binId) {
  const id = String(binId || "").trim();
  if (!id) return;
  writeKnownBinIds([...readKnownBinIds(), id]);
}

function forgetBinId(binId) {
  const id = String(binId || "").trim();
  if (!id) return;
  writeKnownBinIds(readKnownBinIds().filter((item) => item !== id));
}

function extractBins(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.bins)) return data.bins;
  if (Array.isArray(data?.data?.bins)) return data.data.bins;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function rememberBinsFromResponseData(data) {
  const bins = extractBins(data);
  bins.forEach((bin) => rememberBinId(bin?.binId || bin?.id));
}

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
  getAll: async () => {
    const listCandidates = [API_ENDPOINTS.bin.all, "/api/bins", "/api/bin"];

    for (const path of listCandidates) {
      const res = await apiFetch(path);
      if (!res.ok) continue;
      rememberBinsFromResponseData(res.data);
      return res;
    }

    const knownIds = readKnownBinIds();
    if (!knownIds.length) {
      return { ok: true, status: 200, data: { bins: [] } };
    }

    const fetched = await Promise.all(
      knownIds.map(async (binId) => {
        const item = await apiFetch(API_ENDPOINTS.bin.byId(binId));
        if (!item.ok) return null;
        const bin = item?.data?.bin || item?.data?.data?.bin || item?.data?.data || item?.data;
        if (!bin) return null;
        rememberBinId(bin?.binId || bin?.id || binId);
        return bin;
      })
    );

    const bins = fetched.filter(Boolean);
    return { ok: true, status: 200, data: { bins } };
  },
  getFillLevels: async () => {
    const fillCandidates = [
      API_ENDPOINTS.bin.fillLevels,
      "/api/bin/fill-levels",
      "/api/bin/levels",
      "/api/fill-level",
      "/api/fill-levels",
    ];

    for (const path of fillCandidates) {
      const res = await apiFetch(path);
      if (res.ok) return res;
    }

    return binApi.getAll();
  },
  create: async (payload) => {
    const res = await apiFetch(API_ENDPOINTS.bin.create, { method: "POST", body: payload });
    if (res.ok) {
      const created = res?.data?.bin || res?.data?.data?.bin || res?.data?.data || res?.data;
      rememberBinId(created?.binId || created?.id || payload?.binId);
    }
    return res;
  },
  getById: async (binId) => {
    const res = await apiFetch(API_ENDPOINTS.bin.byId(binId));
    if (res.ok) {
      const found = res?.data?.bin || res?.data?.data?.bin || res?.data?.data || res?.data;
      rememberBinId(found?.binId || found?.id || binId);
    }
    return res;
  },
  deleteById: async (binId) => {
    const bodyDelete = await apiFetch(API_ENDPOINTS.bin.deleteWithBody, {
      method: "DELETE",
      body: { binId },
    });
    if (bodyDelete.ok || (bodyDelete.status !== 404 && bodyDelete.status !== 405)) {
      if (bodyDelete.ok) forgetBinId(binId);
      return bodyDelete;
    }

    const primary = await apiFetch(API_ENDPOINTS.bin.deleteById(binId), { method: "DELETE" });
    if (primary.ok || primary.status !== 404) {
      if (primary.ok) forgetBinId(binId);
      return primary;
    }

    const alt = await apiFetch(API_ENDPOINTS.bin.deleteByIdAlt(binId), { method: "DELETE" });
    if (alt.ok) forgetBinId(binId);
    return alt;
  },
};

export const routeApi = {
  assignRoute: async (payload) => {
    const assignCandidates = [
      API_ENDPOINTS.route.assign,
      "/api/routes/assign",
      "/api/driver/assign-route",
      "/api/driver/route/assign",
    ];

    for (const path of assignCandidates) {
      const res = await apiFetch(path, { method: "POST", body: payload });
      if (res.ok || ![404, 405].includes(res.status)) return res;
    }

    return { ok: false, status: 404, data: { message: "Route assignment endpoint not found" } };
  },

  getAssignedRoute: async ({ driverId, email } = {}) => {
    const candidates = [];
    if (driverId) {
      candidates.push(
        API_ENDPOINTS.route.assignedByDriverId(driverId),
        `/api/routes/driver/${encodeURIComponent(driverId)}`,
        `/api/driver/${encodeURIComponent(driverId)}/routes`
      );
    }
    if (email) {
      candidates.push(
        API_ENDPOINTS.route.assignedByEmail(email),
        `/api/routes/driver?email=${encodeURIComponent(email)}`,
        `/api/driver/routes?email=${encodeURIComponent(email)}`
      );
    }
    candidates.push("/api/route/assigned", "/api/routes/assigned");

    for (const path of [...new Set(candidates)]) {
      const res = await apiFetch(path);
      if (res.ok || ![404, 405].includes(res.status)) return res;
    }

    return { ok: false, status: 404, data: { message: "Assigned route endpoint not found" } };
  },

  markCollected: async (payload) => {
    const collectCandidates = [
      API_ENDPOINTS.route.markCollected,
      "/api/routes/collect",
      "/api/route/complete",
      "/api/driver/collect",
    ];

    for (const path of collectCandidates) {
      const res = await apiFetch(path, { method: "POST", body: payload });
      if (res.ok || ![404, 405].includes(res.status)) return res;
    }

    return { ok: false, status: 404, data: { message: "Collect endpoint not found" } };
  },
};

export const driverApi = {
  getAll: () => apiFetch(API_ENDPOINTS.driver.all),
  getById: (driverId) => apiFetch(API_ENDPOINTS.driver.byId(driverId)),
  deleteById: async (driverId) => {
    const candidates = [
      API_ENDPOINTS.driver.deleteById(driverId),
      `/api/drivers/${encodeURIComponent(driverId)}`,
      `/api/driver/delete/${encodeURIComponent(driverId)}`,
      "/api/driver/delete",
    ];

    for (const path of candidates) {
      const withBody = path === "/api/driver/delete";
      const res = await apiFetch(path, {
        method: "DELETE",
        ...(withBody ? { body: { driverId } } : {}),
      });
      if (res.ok || ![404, 405].includes(res.status)) return res;
    }

    return { ok: false, status: 404, data: { message: "Driver delete endpoint not found" } };
  },
};

export default apiFetch;
