import axios from "axios";
import { useAuth } from "../hooks/useApi";

const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:3000";

const BASE = RAW_BASE.replace(/\/$/, "");
const BIN_CACHE_KEY = "smartbin-known-bin-ids";
const BIN_LIST_ENDPOINT_STATUS_KEY = "smartbin-bin-list-endpoint-status";
const OBJECT_ID_REGEX = /^[a-fA-F\d]{24}$/;

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
    current: "/api/users/current",
    update: "/api/users",
    deleteCurrent: "/api/users",
  },
  driver: {
    all: "/api/drivers",
    create: "/api/drivers",
    byId: (driverId) => `/api/drivers/${encodeURIComponent(driverId)}`,
    deleteById: (driverId) => `/api/drivers/${encodeURIComponent(driverId)}`,
    updateStatus: (driverId) => `/api/drivers/${encodeURIComponent(driverId)}/status`,
  },
  driverLocation: {
    upsert: "/api/driver",
    latestByDriverId: (driverId) => `/api/driver/${encodeURIComponent(driverId)}/location`,
    historyByDriverId: (driverId) => `/api/driver/${encodeURIComponent(driverId)}/location/history`,
    nearby: (lng, lat, distance = 5000) =>
      `/api/driver/nearby/location?lng=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}&distance=${encodeURIComponent(distance)}`,
    logsByDriverId: (driverId) => `/api/driver/${encodeURIComponent(driverId)}/location/logs`,
  },
  route: {
    all: "/api/routes",
    create: "/api/routes",
    byDriverId: (driverId) => `/api/routes/drivers/${encodeURIComponent(driverId)}`,
    byId: (routeId) => `/api/routes/${encodeURIComponent(routeId)}`,
    optimize: (driverId, lng, lat) =>
      `/api/routes/${encodeURIComponent(driverId)}/optimize?lng=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}`,
    markCollected: "/api/route/collect",
  },
  bin: {
    all: "/api/bins",
    create: "/api/bins",
    byId: (binId) => `/api/bins/${binId}`,
    deleteById: (binId) => `/api/bins/${binId}`,
  },
  pickup: {
    all: "/api/pickups",
    create: "/api/pickups",
    byId: (pickupId) => `/api/pickups/${encodeURIComponent(pickupId)}`,
    byDriverId: (driverId) => `/api/pickups/driver/${encodeURIComponent(driverId)}`,
    accept: (pickupId) => `/api/pickups/${encodeURIComponent(pickupId)}/accept`,
    complete: (pickupId) => `/api/pickups/${encodeURIComponent(pickupId)}/complete`,
    deleteById: (pickupId) => `/api/pickups/${encodeURIComponent(pickupId)}`,
  },
  alert: {
    all: "/api/alerts",
    byId: (id) => `/api/alerts/${encodeURIComponent(id)}`,
    byBinId: (binId) => `/api/alerts/bins/${encodeURIComponent(binId)}`,
    resolve: (id) => `/api/alerts/${encodeURIComponent(id)}/resolve`,
    deleteById: (id) => `/api/alerts/${encodeURIComponent(id)}`,
  },
};

function parseDriverCollection(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.drivers)) return data.drivers;
  if (Array.isArray(data?.data?.drivers)) return data.data.drivers;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function matchDriverByUser(driver, { userId, email } = {}) {
  const driverUser = driver?.user || {};
  const driverUserId = String(driverUser?._id || driverUser?.id || "").trim();
  const driverEmail = String(driverUser?.email || driver?.email || "").trim().toLowerCase();
  if (userId && driverUserId && String(userId) === driverUserId) return true;
  if (email && driverEmail && String(email).trim().toLowerCase() === driverEmail) return true;
  return false;
}

function readKnownBinIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BIN_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
        .filter((id) => typeof id === "string" && id.trim())
        .map((id) => String(id).trim())
        .filter((id) => OBJECT_ID_REGEX.test(id))
      : [];
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
  bins.forEach((bin) => rememberBinId(bin?._id || bin?.id));
}

function readBinListEndpointStatus() {
  if (typeof window === "undefined") return "unknown";
  const value = localStorage.getItem(BIN_LIST_ENDPOINT_STATUS_KEY);
  return value === "supported" || value === "unsupported" ? value : "unknown";
}

function writeBinListEndpointStatus(status) {
  if (typeof window === "undefined") return;
  if (!["supported", "unsupported"].includes(status)) return;
  localStorage.setItem(BIN_LIST_ENDPOINT_STATUS_KEY, status);
}

function getDeleteIdCandidates(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map((id) => String(id || "").trim()).filter(Boolean))];
  }

  if (input && typeof input === "object") {
    const raw = Array.isArray(input.candidates)
      ? input.candidates
      : [input._id, input.id, input.deleteId, input.binNumber, input.binId];
    const normalized = [...new Set(raw.map((id) => String(id || "").trim()).filter(Boolean))];
    const objectIds = normalized.filter((id) => OBJECT_ID_REGEX.test(id));
    const nonObjectIds = normalized.filter((id) => !OBJECT_ID_REGEX.test(id));
    return [...objectIds, ...nonObjectIds];
  }

  const id = String(input || "").trim();
  return id ? [id] : [];
}

const axiosInstance = axios.create({
  baseURL: BASE,
});

axiosInstance.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function apiFetch(path, options = {}) {
  const { method = "GET", body, headers = {} } = options;

  try {
    const res = await axiosInstance({
      url: path,
      method,
      data: body,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      withCredentials: getDefaultCredentials() === "include",
    });

    return {
      ok: true,
      status: res.status,
      data: res.data,
    };
  } catch (error) {
    return {
      ok: false,
      status: error.response?.status || 0,
      data: error.response?.data || {
        message: "Network error",
        details: error.message,
      },
    };
  }
}

export const authApi = {
  register: (payload) => apiFetch(API_ENDPOINTS.auth.register, { method: "POST", body: payload, useAuth: false }),
  login: (payload) => apiFetch(API_ENDPOINTS.auth.login, { method: "POST", body: payload, useAuth: false }),
  logout: () => apiFetch(API_ENDPOINTS.auth.logout, { method: "GET", useAuth: true }),
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
    const listEndpointStatus = readBinListEndpointStatus();

    if (listEndpointStatus !== "unsupported") {
      const res = await apiFetch(API_ENDPOINTS.bin.all);
      if (res.ok) {
        writeBinListEndpointStatus("supported");
        rememberBinsFromResponseData(res.data);
        return res;
      }

      if ([404, 405, 500, 502, 503].includes(res.status)) {
        writeBinListEndpointStatus("unsupported");
      }
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
        rememberBinId(bin?._id || bin?.id || binId);
        return bin;
      })
    );

    const bins = fetched.filter(Boolean);
    return { ok: true, status: 200, data: { bins } };
  },
  getFillLevels: async () => {
    return binApi.getAll();
  },
  create: async (payload) => {
    const res = await apiFetch(API_ENDPOINTS.bin.create, { method: "POST", body: payload });
    if (res.ok) {
      const created = res?.data?.bin || res?.data?.data?.bin || res?.data?.data || res?.data;
      rememberBinId(created?._id || created?.id);
    }
    return res;
  },
  getById: async (binId) => {
    const res = await apiFetch(API_ENDPOINTS.bin.byId(binId));
    if (res.ok) {
      const found = res?.data?.bin || res?.data?.data?.bin || res?.data?.data || res?.data;
      rememberBinId(found?._id || found?.id || binId);
    }
    return res;
  },
  deleteById: async (binId) => {
    const candidates = getDeleteIdCandidates(binId);
    if (!candidates.length) {
      return {
        ok: false,
        status: 400,
        data: { message: "Bin ID is required" },
      };
    }

    let lastResponse = null;

    for (const candidate of candidates) {
      const response = await apiFetch(API_ENDPOINTS.bin.deleteById(candidate), { method: "DELETE" });
      lastResponse = response;

      if (!response.ok) {
        if ([404, 405].includes(response.status)) continue;
        return response;
      }

      const deletedBin = response?.data?.bin || response?.data?.data?.bin || response?.data?.data || null;
      if (!deletedBin) {
        continue;
      }

      // Remove all variants from local cache because server payload shape is inconsistent.
      const deletedIds = [
        candidate,
        deletedBin?.binNumber,
        deletedBin?.binId,
        deletedBin?.id,
        deletedBin?._id,
      ]
        .map((id) => String(id || "").trim())
        .filter(Boolean);

      deletedIds.forEach((id) => forgetBinId(id));
      return response;
    }

    return {
      ok: false,
      status: lastResponse?.status || 404,
      data: {
        message:
          lastResponse?.data?.message ||
          "Bin was not deleted. Please verify the exact Bin ID shown when the bin was created.",
      },
    };
  },
};

export const routeApi = {
  createRoute: async (payload) => {
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;

    const rawBins = Array.isArray(payload?.bins)
      ? payload.bins
      : Array.isArray(payload?.binIds)
        ? payload.binIds
        : [];

    const normalizedBins = rawBins
      .flat(2)
      .map((value) => String(value ?? "").trim())
      .map((value) => {
        // Recover accidentally stringified array values like "[ 'BIN-1' ]"
        const match = value.match(/^\[\s*['\"]?([^'\"\]]+)['\"]?\s*\]$/);
        return match ? match[1] : value;
      })
      .filter(Boolean);

    const objectIdBins = Array.from(new Set(normalizedBins.filter((value) => objectIdRegex.test(value))));

    if (!payload?.driverId || !objectIdBins.length) {
      return {
        ok: false,
        status: 400,
        data: {
          message: "driverId and bins(ObjectId[]) are required",
          details: "Selected bins could not be mapped to Mongo ObjectIds.",
        },
      };
    }

    const normalizedPayload = {
      driverId: payload?.driverId,
      bins: objectIdBins,
    };

    const createCandidates = ["/api/routes", API_ENDPOINTS.route.create, "/api/route", "/api/route/create"];

    for (const path of createCandidates) {
      const res = await apiFetch(path, { method: "POST", body: normalizedPayload });
      if (res.ok || ![404, 405].includes(res.status)) return res;
    }

    return { ok: false, status: 404, data: { message: "Route create endpoint not found" } };
  },

  assignRoute: async (payload) => {
    return routeApi.createRoute(payload);
  },

  getAllRoutes: async () => {
    const candidates = ["/api/routes", API_ENDPOINTS.route.all, "/api/route", "/api/route/all"];

    for (const path of candidates) {
      const res = await apiFetch(path);
      if (res.ok || ![404, 405].includes(res.status)) return res;
    }

    return { ok: false, status: 404, data: { message: "Route list endpoint not found" } };
  },

  getRouteByDriver: async (driverId) => {
    if (!driverId) {
      return { ok: false, status: 400, data: { message: "driverId is required" } };
    }

    const candidates = [
      `/api/routes/drivers/${encodeURIComponent(driverId)}`,
      API_ENDPOINTS.route.byDriverId(driverId),
      `/api/routes/driver/${encodeURIComponent(driverId)}`,
      `/api/route/driver/${encodeURIComponent(driverId)}`,
      `/api/driver/${encodeURIComponent(driverId)}/routes`,
    ];

    for (const path of candidates) {
      const res = await apiFetch(path);
      if (res.ok || ![404, 405].includes(res.status)) return res;
    }

    return { ok: false, status: 404, data: { message: "Route by driver endpoint not found" } };
  },

  getRouteById: async (routeId) => {
    if (!routeId) {
      return { ok: false, status: 400, data: { message: "routeId is required" } };
    }

    const candidates = [
      `/api/routes/${encodeURIComponent(routeId)}`,
      API_ENDPOINTS.route.byId(routeId),
      `/api/route/${encodeURIComponent(routeId)}`,
    ];

    for (const path of candidates) {
      const res = await apiFetch(path);
      if (res.ok || ![404, 405].includes(res.status)) return res;
    }

    return { ok: false, status: 404, data: { message: "Route by id endpoint not found" } };
  },

  optimizeRoute: async ({ driverId, lng, lat }) => {
    if (!driverId) {
      return { ok: false, status: 400, data: { message: "driverId is required" } };
    }

    const safeLng = Number.isFinite(Number(lng)) ? Number(lng) : 0;
    const safeLat = Number.isFinite(Number(lat)) ? Number(lat) : 0;

    const candidates = [
      `/api/routes/${encodeURIComponent(driverId)}/optimize?lng=${encodeURIComponent(safeLng)}&lat=${encodeURIComponent(safeLat)}`,
      API_ENDPOINTS.route.optimize(driverId, safeLng, safeLat),
      `/api/route/${encodeURIComponent(driverId)}/optimize?lng=${encodeURIComponent(safeLng)}&lat=${encodeURIComponent(safeLat)}`,
    ];

    for (const path of candidates) {
      const res = await apiFetch(path, { method: "POST" });
      if (res.ok || ![404, 405].includes(res.status)) return res;
    }

    return { ok: false, status: 404, data: { message: "Optimize route endpoint not found" } };
  },

  deleteRoute: async (routeId) => {
    if (!routeId) {
      return { ok: false, status: 400, data: { message: "routeId is required" } };
    }

    const candidates = [
      `/api/routes/${encodeURIComponent(routeId)}`,
      API_ENDPOINTS.route.byId(routeId),
      `/api/route/${encodeURIComponent(routeId)}`,
    ];

    for (const path of candidates) {
      const res = await apiFetch(path, { method: "DELETE" });
      if (res.ok || ![404, 405].includes(res.status)) return res;
    }

    return { ok: false, status: 404, data: { message: "Route delete endpoint not found" } };
  },

  getAssignedRoute: async ({ driverId } = {}) => {
    if (!driverId) {
      return { ok: false, status: 400, data: { message: "driverId is required to fetch assigned route" } };
    }
    // Use only the correct endpoint for driverId
    return await routeApi.getRouteByDriver(driverId);
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
  create: (payload) => apiFetch(API_ENDPOINTS.driver.create, { method: "POST", body: payload }),
  getById: (driverId) => apiFetch(API_ENDPOINTS.driver.byId(driverId)),
  updateStatus: (driverId, payload) =>
    apiFetch(API_ENDPOINTS.driver.updateStatus(driverId), { method: "PATCH", body: payload }),
  resolveDriverIdByUser: async ({ userId, email } = {}) => {
    if (!userId && !email) {
      return { ok: false, status: 400, data: { message: "userId or email is required" } };
    }

    const allDrivers = await apiFetch(API_ENDPOINTS.driver.all);
    if (!allDrivers.ok) return allDrivers;

    const list = parseDriverCollection(allDrivers.data);
    const match = list.find((driver) => matchDriverByUser(driver, { userId, email }));

    if (!match) {
      return { ok: false, status: 404, data: { message: "Driver profile not found" } };
    }

    return {
      ok: true,
      status: 200,
      data: {
        driver: match,
        driverId: match?._id || match?.id,
      },
    };
  },
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


    const deactivate = await apiFetch(API_ENDPOINTS.driver.updateStatus(driverId), {
      method: "PATCH",
      body: { status: "offline" },
    });

    if (deactivate.ok) {
      return {
        ...deactivate,
        data: {
          ...(deactivate?.data || {}),
          message: "Driver deleted successfully",
        },
      };
    }

    return { ok: false, status: 404, data: { message: "Driver delete endpoint not found" } };
  },
};

export default apiFetch;

export const driverLocationApi = {
  upsert: (payload) => apiFetch(API_ENDPOINTS.driverLocation.upsert, { method: "POST", body: payload }),
  getLatest: (driverId) => apiFetch(API_ENDPOINTS.driverLocation.latestByDriverId(driverId)),
  getHistory: (driverId) => apiFetch(API_ENDPOINTS.driverLocation.historyByDriverId(driverId)),
  getNearby: ({ lng, lat, distance = 5000 }) =>
    apiFetch(API_ENDPOINTS.driverLocation.nearby(lng, lat, distance)),
  deleteLogs: (driverId) => apiFetch(API_ENDPOINTS.driverLocation.logsByDriverId(driverId), { method: "DELETE" }),
};

export const pickupApi = {
  create: (payload) => apiFetch(API_ENDPOINTS.pickup.create, { method: "POST", body: payload }),
  getAll: () => apiFetch(API_ENDPOINTS.pickup.all),
  getById: (pickupId) => apiFetch(API_ENDPOINTS.pickup.byId(pickupId)),
  getByDriverId: (driverId) => apiFetch(API_ENDPOINTS.pickup.byDriverId(driverId)),
  accept: (pickupId, payload) => apiFetch(API_ENDPOINTS.pickup.accept(pickupId), { method: "PATCH", body: payload }),
  complete: (pickupId) => apiFetch(API_ENDPOINTS.pickup.complete(pickupId), { method: "PATCH" }),
  deleteById: (pickupId) => apiFetch(API_ENDPOINTS.pickup.deleteById(pickupId), { method: "DELETE" }),
};

export const alertApi = {
  getAll: () => apiFetch(API_ENDPOINTS.alert.all),
  getById: (id) => apiFetch(API_ENDPOINTS.alert.byId(id)),
  getByBinId: (binId) => apiFetch(API_ENDPOINTS.alert.byBinId(binId)),
  resolve: (id) => apiFetch(API_ENDPOINTS.alert.resolve(id), { method: "PATCH" }),
  deleteById: (id) => apiFetch(API_ENDPOINTS.alert.deleteById(id), { method: "DELETE" }),
};
