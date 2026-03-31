import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../components/dashboard/MapView";
import BinManager from "../components/dashboard/BinManager";
import RouteAssignmentPanel from "../components/dashboard/RouteAssignmentPanel";
import { authApi } from "../utils/api";
import adminApi from "../utils/adminApi";

const statCards = [
  { label: "Total Bins", key: "total", accent: "border-(--color-primary-50)" },
  { label: "Needs Pickup", key: "critical", accent: "border-(--color-primary-60)" },
  { label: "Pickups Today", key: "completed", accent: "border-(--color-accent-50)" },
  { label: "Drivers Active", key: "vansActive", accent: "border-(--color-accent-60)" },
];

const sidebarItems = ["Dashboard", "All Bins", "Routes & Map", "Driver", "Alerts"];

const parseLocation = (rawLocation) => {
  if (typeof rawLocation !== "string") return { lat: null, lng: null };
  const [latStr, lngStr] = rawLocation.split(",").map((v) => v.trim());
  const parsedLat = Number(latStr);
  const parsedLng = Number(lngStr);
  return {
    lat: Number.isFinite(parsedLat) ? parsedLat : null,
    lng: Number.isFinite(parsedLng) ? parsedLng : null,
  };
};

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const findFirstObjectId = (value, depth = 0) => {
  if (depth > 4 || value == null) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    return OBJECT_ID_REGEX.test(trimmed) ? trimmed : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstObjectId(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    const preferredKeys = ["_id", "id", "binId", "binID", "bin_id"];
    for (const key of preferredKeys) {
      const found = findFirstObjectId(value?.[key], depth + 1);
      if (found) return found;
    }

    for (const nestedValue of Object.values(value)) {
      const found = findFirstObjectId(nestedValue, depth + 1);
      if (found) return found;
    }
  }

  return "";
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [liveBins, setLiveBins] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState("");
  const [driverActionMessage, setDriverActionMessage] = useState("");
  const [removingDriverId, setRemovingDriverId] = useState("");
  const [driverToRemove, setDriverToRemove] = useState(null);
  const [isAssigningRoute, setIsAssigningRoute] = useState(false);
  const [isOptimizingRoute, setIsOptimizingRoute] = useState(false);
  const [assignFeedback, setAssignFeedback] = useState(null);
  const [assignedRouteBins, setAssignedRouteBins] = useState([]);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState(localStorage.getItem("smartbin-user-name") || "Admin");
  const hasCheckedSession = useRef(false);
  const defaultDriverLocation = useMemo(() => ({ lat: 20.2961, lng: 85.8245 }), []);

  const stats = useMemo(() => {
    const active = liveBins.filter((bin) => !bin.pickedUp);
    return {
      total: liveBins.length,
      critical: active.filter((bin) => bin.fill >= 80).length,
      completed: liveBins.length - active.length,
      vansActive: drivers.length,
    };
  }, [drivers.length, liveBins]);

  const sortedByPriority = useMemo(
    () => [...liveBins].filter((bin) => !bin.pickedUp).sort((a, b) => b.fill - a.fill),
    [liveBins]
  );

  const alerts = useMemo(
    () =>
      sortedByPriority.slice(0, 5).map((bin, index) => ({
        id: bin.id,
        fill: bin.fill,
        zone: `Zone ${String.fromCharCode(65 + (index % 4))}`,
        time: `${index + 1}h ago`,
      })),
    [sortedByPriority]
  );

  const fetchBinsData = useCallback(async () => {
    const res = await adminApi.getBinFillLevels();
    const payload = res.data;
    const serverBins = Array.isArray(payload?.bins) ? payload.bins : Array.isArray(payload) ? payload : [];

    if (!res.ok) {
      setLiveBins([]);
      return;
    }

    const normalized = serverBins.map((s, index) => {
      const parsedLocation = parseLocation(s.location);
      const fillValue = Number(s.fill?.value ?? s.fill ?? 0);
      const mongoId = findFirstObjectId(s) || null;
      const displayId = String(s.binNumber || s.binId || s.id || s._id || `BIN-${index + 1}`).trim();
      const deleteId = String(mongoId || s._id || s.id || displayId).trim();
      return {
        _id: mongoId,
        id: displayId,
        binNumber: displayId,
        deleteId,
        fill: Number.isFinite(fillValue) ? fillValue : 0,
        lat: Number(s.lat ?? s.location?.lat ?? parsedLocation.lat ?? 20.2961),
        lng: Number(s.lng ?? s.location?.lng ?? parsedLocation.lng ?? 85.8245),
        pickedUp: false,
        updatedAt: s.lastUpdated || s.updatedAt || Date.now(),
        raw: s,
      };
    });
    setLiveBins(normalized.length ? normalized : []);
  }, []);

  const fetchDriversData = useCallback(async () => {
    setDriversLoading(true);
    setDriversError("");

    try {
      const [driversRes, usersRes] = await Promise.all([adminApi.getAllDrivers(), adminApi.getAllUsers()]);

      if (!driversRes.ok) {
        const message = driversRes?.data?.message || driversRes?.data?.error || "Failed to fetch drivers";
        setDrivers([]);
        setDriversError(message);
        return;
      }

      const driversPayload = driversRes.data;
      const serverDrivers = Array.isArray(driversPayload?.drivers)
        ? driversPayload.drivers
        : Array.isArray(driversPayload?.data?.drivers)
        ? driversPayload.data.drivers
        : Array.isArray(driversPayload)
        ? driversPayload
        : [];

      const usersPayload = usersRes?.data;
      const serverUsers = Array.isArray(usersPayload?.users)
        ? usersPayload.users
        : Array.isArray(usersPayload?.data?.users)
        ? usersPayload.data.users
        : Array.isArray(usersPayload?.data)
        ? usersPayload.data
        : Array.isArray(usersPayload)
        ? usersPayload
        : [];

      const usersById = new Map(
        serverUsers
          .map((user) => {
            const userId = String(user?._id || user?.id || "").trim();
            return userId ? [userId, user] : null;
          })
          .filter(Boolean)
      );

      const normalized = serverDrivers
        .filter((driver) => {
          const topRole = String(driver?.role || "").toLowerCase();
          const userRole = String(driver?.user?.role || "").toLowerCase();
          const status = String(driver?.status || "").toLowerCase();
          const isDriver = topRole === "driver" || userRole === "driver" || Boolean(driver?.user);
          return isDriver && status !== "offline";
        })
        .map((driver) => {
          const rawUser = driver?.user;
          const linkedUserId =
            typeof rawUser === "object"
              ? String(rawUser?._id || rawUser?.id || "").trim()
              : String(rawUser || "").trim();
          const linkedUser = usersById.get(linkedUserId) || null;

          const derivedName =
            driver?.name ||
            (typeof rawUser === "object" ? rawUser?.name : "") ||
            linkedUser?.name ||
            (linkedUserId ? `Driver ${linkedUserId.slice(-4).toUpperCase()}` : "Unnamed driver");
          const derivedEmail =
            driver?.email ||
            (typeof rawUser === "object" ? rawUser?.email : "") ||
            linkedUser?.email ||
            "-";

          return {
            id: driver._id || driver.id || "",
            name: derivedName,
            email: derivedEmail,
            role: driver.role || (typeof rawUser === "object" ? rawUser?.role : "") || linkedUser?.role || "driver",
            vehicleNumber: driver.vehicleNumber || "-",
            status: String(driver?.status || "available").toLowerCase(),
            createdAt: driver.createdAt || null,
          };
        });

      setDrivers(normalized);
    } catch (error) {
      setDrivers([]);
      setDriversError(error?.message || "Failed to fetch drivers");
    } finally {
      setDriversLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const safeFetch = async () => {
      if (!mounted) return;
      await fetchBinsData();
    };

    safeFetch();
    const interval = setInterval(safeFetch, 10000);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [fetchBinsData]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (activeSection !== "Driver" && activeSection !== "Routes & Map") return;
    fetchDriversData();
  }, [activeSection, fetchDriversData]);

  useEffect(() => {
    if (hasCheckedSession.current) return;
    hasCheckedSession.current = true;

    let mounted = true;
    (async () => {
      const hasSession = Boolean(localStorage.getItem("access-token") || localStorage.getItem("smartbin-role"));
      if (!hasSession) {
        navigate("/");
        return;
      }

      const normalizedRole = String(localStorage.getItem("smartbin-role") || "").toLowerCase();
      if (normalizedRole && normalizedRole !== "admin") {
        localStorage.setItem("smartbin-role", normalizedRole);
        navigate("/dashboard/driver");
        return;
      }

      if (!mounted) return;

      const storedName = localStorage.getItem("smartbin-user-name");
      if (storedName) {
        setUserName(storedName);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleCreateBin = async (payload) => {
    const res = await adminApi.createBin(payload);
    if (res.ok) await fetchBinsData();
    return res;
  };

  const handleDeleteBin = async (binId) => {
    const res = await adminApi.deleteBinById(binId);
    if (res.ok) await fetchBinsData();
    return res;
  };

  const handleGetBinById = async (binId) => adminApi.getBinById(binId);

  const extractRouteBinIds = useCallback((payload) => {
    const route = payload?.data || payload?.route || payload?.assignedRoute || payload;
    const routeBins = Array.isArray(route?.bins)
      ? route.bins
      : Array.isArray(payload?.bins)
      ? payload.bins
      : Array.isArray(payload?.data?.bins)
      ? payload.data.bins
      : [];

    return routeBins
      .map((bin) => {
        if (typeof bin === "string") return bin;
        if (typeof bin === "object" && bin) return bin.binId || bin.id || bin._id || "";
        return "";
      })
      .filter(Boolean);
  }, []);

  const mapBinIdsToLiveBins = useCallback(
    (binIds) => {
      const mapped = binIds
        .map((binId) => liveBins.find((bin) => String(bin.id) === String(binId)))
        .filter(Boolean);
      return mapped;
    },
    [liveBins]
  );

  const handleAssignRoute = async ({ driver, bins, binIds }) => {
    setAssignFeedback(null);
    setIsAssigningRoute(true);

    try {
      const objectIdRegex = OBJECT_ID_REGEX;

      const selectedKeys = bins
        .map((bin) => [
          String(bin?._id || "").trim(),
          String(bin?.id || "").trim(),
          String(bin?.binId || "").trim(),
          String(bin?.binNumber || "").trim(),
          findFirstObjectId(bin?.raw || {}),
        ])
        .flat()
        .filter(Boolean);

      const resolvedFromSelection = bins
        .map((bin) => String(bin?._id || findFirstObjectId(bin?.raw || {}) || "").trim())
        .filter((id) => objectIdRegex.test(id));

      let binObjectIds = Array.from(new Set(resolvedFromSelection));

      // If list response didn't include _id for all selected bins, resolve from a single bulk fetch.
      if (binObjectIds.length < bins.length) {
        const allBinsRes = await adminApi.getAllBins();
        const payload = allBinsRes?.data;
        const serverBins = Array.isArray(payload?.bins)
          ? payload.bins
          : Array.isArray(payload?.data?.bins)
          ? payload.data.bins
          : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
          ? payload
          : [];

        const byAnyKey = new Map();
        for (const item of serverBins) {
          const mongoId = String(findFirstObjectId(item) || "").trim();
          if (!objectIdRegex.test(mongoId)) continue;

          const keys = [
            String(item?._id || "").trim(),
            String(item?.id || "").trim(),
            String(item?.binId || "").trim(),
            String(item?.binNumber || "").trim(),
            String(findFirstObjectId(item) || "").trim(),
          ].filter(Boolean);

          keys.forEach((key) => {
            if (!byAnyKey.has(key)) byAnyKey.set(key, mongoId);
          });
        }

        const resolvedFromAll = selectedKeys.map((key) => byAnyKey.get(key)).filter(Boolean);
        binObjectIds = Array.from(new Set([...binObjectIds, ...resolvedFromAll]));
      }

      if (!binObjectIds.length) {
        setAssignFeedback({
          type: "error",
          message: "Route assignment failed: Could not resolve selected bins to database ids.",
        });
        return;
      }

      const payload = {
        driverId: driver.id,
        bins: binObjectIds,
      };

      const res = await adminApi.assignRoute(payload);
      if (!res?.ok) {
        const message =
          res?.data?.message ||
          res?.data?.error ||
          res?.data?.details ||
          "Failed to assign route";
        setAssignFeedback({ type: "error", message: `Route assignment failed: ${message}` });
        return;
      }

      const responseBinIds = extractRouteBinIds(res?.data);
      const mappedBins = responseBinIds.length ? mapBinIdsToLiveBins(responseBinIds) : bins;
      setAssignedRouteBins(mappedBins.length ? mappedBins : bins);
      setAssignFeedback({
        type: "success",
        message: `Route assigned to ${driver.name} (${driver.email}) with ${binIds.length} bin(s).`,
      });
    } finally {
      setIsAssigningRoute(false);
    }
  };

  const handleOptimizeRoute = async ({ driver, lng, lat }) => {
    setAssignFeedback(null);
    setIsOptimizingRoute(true);

    try {
      const res = await adminApi.optimizeRoute({
        driverId: driver.id,
        lng,
        lat,
      });

      if (!res?.ok) {
        const message =
          res?.data?.message ||
          res?.data?.error ||
          res?.data?.details ||
          "Failed to optimize route";
        setAssignFeedback({ type: "error", message: `Route optimization failed: ${message}` });
        return;
      }

      const optimizedBinIds = extractRouteBinIds(res?.data);
      const mappedBins = mapBinIdsToLiveBins(optimizedBinIds);

      setAssignedRouteBins(mappedBins);
      setAssignFeedback({
        type: "success",
        message: `Optimized route generated for ${driver.name} with ${optimizedBinIds.length} bin(s).`,
      });
    } finally {
      setIsOptimizingRoute(false);
    }
  };

  const handleRemoveDriver = (driver) => {
    const driverId = String(driver?.id || "").trim();
    if (!driverId) {
      setDriverActionMessage("Unable to remove this driver: missing driver ID.");
      return;
    }

    setDriverToRemove(driver);
  };

  const handleConfirmRemoveDriver = async () => {
    if (!driverToRemove) return;
    const driverId = String(driverToRemove?.id || "").trim();
    if (!driverId) {
      setDriverActionMessage("Unable to remove this driver: missing driver ID.");
      setDriverToRemove(null);
      return;
    }

    setRemovingDriverId(driverId);
    setDriverActionMessage("");

    try {
      const res = await adminApi.deleteDriverById(driverId);
      if (!res?.ok) {
        const message =
          res?.data?.message ||
          res?.data?.error ||
          res?.data?.details ||
          "Failed to remove driver";
        setDriverActionMessage(`Remove failed: ${message}`);
        setDriverToRemove(null);
        return;
      }

      const successMessage =
        res?.data?.message ||
        `Driver ${driverToRemove.name} removed successfully.`;
      setDriverActionMessage(successMessage);
      await fetchDriversData();
      setDriverToRemove(null);
    } finally {
      setRemovingDriverId("");
    }
  };

  const handleLogout = async () => {
    await authApi.logout();
    localStorage.removeItem("smartbin-role");
    localStorage.removeItem("smartbin-user-name");
    localStorage.removeItem("access-token");
    localStorage.removeItem("smartbin-email");
    localStorage.removeItem("smartbin-driver-id");
    navigate("/");
  };

  const renderSection = () => {
    if (activeSection === "All Bins") {
      return (
        <section className="rounded-2xl border border-(--color-accent-25) bg-(--color-card-90) p-4 shadow-lg">
          <h2 className="text-xl font-bold text-(--color-text) mb-3">All Bins</h2>
          <BinManager
            bins={liveBins}
            onCreateBin={handleCreateBin}
            onDeleteBin={handleDeleteBin}
            onGetBinById={handleGetBinById}
            onRefresh={fetchBinsData}
          />
        </section>
      );
    }

    if (activeSection === "Routes & Map") {
      return (
        <section className="rounded-2xl border border-(--color-accent-25) bg-(--color-card-90) p-4 shadow-lg">
          <h2 className="text-xl font-bold text-(--color-text) mb-3">Routes & Map</h2>
          <RouteAssignmentPanel
            drivers={drivers}
            bins={sortedByPriority}
            isAssigning={isAssigningRoute}
            isOptimizing={isOptimizingRoute}
            onAssignRoute={handleAssignRoute}
            onOptimizeRoute={handleOptimizeRoute}
            assignFeedback={assignFeedback}
          />
          <div className="mt-4 h-105 overflow-hidden rounded-xl border border-(--color-accent-25)">
            <MapView
              bins={liveBins}
              routeBins={assignedRouteBins.length > 0 ? assignedRouteBins : sortedByPriority}
              driverLocation={defaultDriverLocation}
            />
          </div>
        </section>
      );
    }

    if (activeSection === "Driver") {
      return (
        <section className="max-h-[calc(100vh-11rem)] overflow-y-auto rounded-2xl border border-(--color-accent-25) bg-(--color-card-90) p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-(--color-text)">Driver Name</h2>
            <button
              type="button"
              onClick={fetchDriversData}
              className="rounded-md border border-(--color-accent-25) bg-(--color-card) px-3 py-1.5 text-xs font-semibold text-(--color-text-muted)"
            >
              Refresh Drivers
            </button>
          </div>

          {driversLoading ? (
            <p className="text-sm text-(--color-text-muted)">Loading drivers...</p>
          ) : null}

          {!driversLoading && driversError ? (
            <p className="text-sm text-red-400">{driversError}</p>
          ) : null}

          {driverActionMessage ? (
            <p className={`mb-3 text-sm ${driverActionMessage.startsWith("Remove failed") ? "text-red-400" : "text-green-400"}`}>
              {driverActionMessage}
            </p>
          ) : null}

          {!driversLoading && !driversError && drivers.length === 0 ? (
            <p className="text-sm text-(--color-text-muted)">No drivers registered yet.</p>
          ) : null}

          {!driversLoading && !driversError && drivers.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {drivers.map((driver, index) => (
                <article key={driver.id || `${driver.email}-${index}`} className="rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3">
                  <p className="font-semibold text-(--color-text)">{driver.name}</p>
                  <p className="text-sm text-(--color-text-muted)">{driver.email}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-(--color-text-soft)">{driver.role}</p>
                  <p className="mt-1 text-xs text-(--color-text-soft)">Vehicle {driver.vehicleNumber || "-"}</p>
                  {driver.createdAt ? (
                    <p className="mt-1 text-xs text-(--color-text-soft)">
                      Joined {new Date(driver.createdAt).toLocaleDateString()}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={removingDriverId === driver.id}
                    onClick={() => handleRemoveDriver(driver)}
                    className="mt-3 rounded-md border border-red-400/60 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingDriverId === driver.id ? "Removing..." : "Remove Driver"}
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      );
    }

    if (activeSection === "Alerts") {
      return (
        <section className="rounded-2xl border border-(--color-accent-25) bg-(--color-card-90) p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-(--color-text)">Active Alerts</h2>
            <span className="rounded-full bg-(--color-primary-20) px-2 py-0.5 text-xs font-bold text-(--color-primary)">
              {alerts.length} new
            </span>
          </div>
          <div className="space-y-2.5">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3">
                <p className="font-semibold text-(--color-text)">{alert.id} Critical</p>
                <p className="text-sm text-(--color-text-muted)">{alert.zone} - Fill {alert.fill}%</p>
                <p className="text-xs text-(--color-text-soft)">{alert.time}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    return (
      <>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          {statCards.map((card) => (
            <div key={card.label} className={`rounded-xl border ${card.accent} bg-(--color-card-90) p-4 shadow-md`}>
              <p className="text-xs uppercase tracking-wider text-(--color-text-muted)">{card.label}</p>
              <p className="mt-1 text-4xl font-bold text-(--color-text)">{stats[card.key]}</p>
            </div>
          ))}
        </div>

        <div className="grid xl:grid-cols-3 gap-4 mb-4">
          <section className="xl:col-span-2 rounded-2xl border border-(--color-accent-25) bg-(--color-card-90) p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-(--color-text)">Live Map - All Zones</h2>
              <span className="rounded-full bg-(--color-primary-20) px-2.5 py-1 text-xs font-bold text-(--color-primary)">LIVE</span>
            </div>
            <div className="h-80 overflow-hidden rounded-xl border border-(--color-accent-25)">
              <MapView bins={liveBins} routeBins={sortedByPriority} driverLocation={defaultDriverLocation} />
            </div>
          </section>

          <section className="rounded-2xl border border-(--color-accent-25) bg-(--color-card-90) p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-(--color-text)">Active Alerts</h2>
              <span className="rounded-full bg-(--color-primary-20) px-2 py-0.5 text-xs font-bold text-(--color-primary)">
                {alerts.length} new
              </span>
            </div>
            <div className="space-y-2.5">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3">
                  <p className="font-semibold text-(--color-text)">{alert.id} Critical</p>
                  <p className="text-sm text-(--color-text-muted)">{alert.zone} - Fill {alert.fill}%</p>
                  <p className="text-xs text-(--color-text-soft)">{alert.time}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen w-full bg-(--color-bg) text-(--color-text)">
      <div className="flex min-h-screen">
        {mobileMenuOpen ? (
          <div className="fixed inset-0 bg-(--color-overlay) lg:hidden" style={{ zIndex: 1200 }} onClick={() => setMobileMenuOpen(false)} />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col transform border-r border-(--color-accent-20) bg-(--color-card-95) backdrop-blur-sm transition-transform duration-300 lg:hidden ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ zIndex: 1300 }}
        >
          <div className="flex items-center justify-between border-b border-(--color-accent-15) p-4">
            <h2 className="text-lg font-bold text-(--color-text)">Smart Waste Management System</h2>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md border border-(--color-accent-25) p-1.5 text-(--color-text-muted)"
              aria-label="Close navigation menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {sidebarItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setActiveSection(item);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left rounded-lg px-3 py-2.5 font-medium transition-colors ${
                  activeSection === item
                    ? "bg-(--color-primary-25) text-(--color-text) border border-(--color-primary-40)"
                    : "text-(--color-text-muted) hover:bg-(--color-card-hover)"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="mx-4 mb-4 mt-auto rounded-xl border border-(--color-accent-20) bg-(--color-surface-soft) p-4">
            <p className="font-semibold text-(--color-text)">{userName}</p>
            <p className="text-sm text-(--color-text-muted)">Admin</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg border-2 border-(--color-accent-20) bg-(--color-card) px-3 py-2 text-sm font-semibold text-(--color-text-muted) hover:bg-(--color-card-hover)"
            >
              Log Out
            </button>
          </div>
        </aside>

        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 xl:w-80 flex-col overflow-hidden border-r border-(--color-accent-20) bg-(--color-card-90) backdrop-blur-sm">
          <div className="p-6 border-b border-(--color-accent-15)">
            <h2 className="text-2xl font-bold text-(--color-text)">Smart Waste Management System</h2>
          </div>

          <nav className="p-4 space-y-2 flex-1">
            {sidebarItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveSection(item)}
                className={`w-full text-left rounded-lg px-3 py-2.5 font-medium transition-colors ${
                  activeSection === item
                    ? "bg-(--color-primary-25) text-(--color-text) border border-(--color-primary-40)"
                    : "text-(--color-text-muted) hover:bg-(--color-card-hover)"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="m-4 rounded-xl border border-(--color-accent-20) bg-(--color-surface-soft) p-4">
            <p className="font-semibold text-(--color-text)">{userName}</p>
            <p className="text-sm text-(--color-text-muted)">Admin</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg border-2 border-(--color-accent-20) bg-(--color-card) px-3 py-2 text-sm font-semibold text-(--color-text-muted) hover:bg-(--color-card-hover)"
            >
              Log Out
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-3 flex justify-end lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-(--color-accent-20) bg-(--color-card) px-3 py-2 text-sm font-semibold text-(--color-text-muted) lg:hidden"
              aria-label="Open navigation menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Menu
            </button>
          </div>

          <div className="mb-5 rounded-2xl border border-(--color-accent-25) bg-(--color-card-85) p-5 shadow-xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-(--color-text)">City Dashboard</h1>
            <p className="mt-1 text-(--color-text-muted)">
              Real-time dustbin monitoring across all zones
              <span className="ml-2 inline-block rounded-full border border-(--color-accent-35) bg-(--color-card) px-2 py-0.5 text-xs font-semibold text-(--color-text)">
                {currentTime.toLocaleTimeString()}
              </span>
            </p>
          </div>

          {renderSection()}
        </main>
      </div>

      {driverToRemove ? (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-(--color-overlay) px-4">
          <div className="w-full max-w-md rounded-2xl border border-(--color-accent-25) bg-(--color-card-95) p-5 shadow-2xl">
            <h3 className="text-xl font-bold text-(--color-text)">Remove Driver</h3>
            <p className="mt-2 text-sm text-(--color-text-muted)">
              Are you sure you want to remove this driver?
            </p>
            <div className="mt-3 rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3">
              <p className="font-semibold text-(--color-text)">{driverToRemove.name}</p>
              <p className="text-sm text-(--color-text-muted)">{driverToRemove.email}</p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDriverToRemove(null)}
                className="rounded-md border border-(--color-accent-25) bg-(--color-card) px-4 py-2 text-sm font-semibold text-(--color-text-muted)"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveDriver}
                disabled={removingDriverId === driverToRemove.id}
                className="rounded-md border border-red-400/60 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removingDriverId === driverToRemove.id ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminDashboard;
