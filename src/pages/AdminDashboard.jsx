import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../components/dashboard/MapView";
import BinManager from "../components/dashboard/BinManager";
import { authApi } from "../utils/api";
import adminApi from "../utils/adminApi";

const statCards = [
  { label: "Total Bins", key: "total", accent: "border-(--color-primary-50)" },
  { label: "Needs Pickup", key: "critical", accent: "border-(--color-primary-60)" },
  { label: "Vans Active", key: "activeVans", accent: "border-(--color-accent-60)" },
  { label: "Pickups Today", key: "completed", accent: "border-(--color-accent-50)" },
];

const sidebarItems = ["Dashboard", "All Bins", "Routes & Map", "Vehicles", "Alerts"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [liveBins, setLiveBins] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState(localStorage.getItem("smartbin-user-name") || "Admin");
  const defaultDriverLocation = useMemo(() => ({ lat: 20.2961, lng: 85.8245 }), []);

  const stats = useMemo(() => {
    const active = liveBins.filter((bin) => !bin.pickedUp);
    return {
      total: liveBins.length,
      critical: active.filter((bin) => bin.fill >= 80).length,
      activeVans: 1,
      completed: liveBins.length - active.length,
    };
  }, [liveBins]);

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

  const driverUsers = useMemo(() => {
    if (drivers.length > 0) return drivers;
    return allUsers.filter((user) => String(user?.role || "").toLowerCase() === "driver");
  }, [drivers, allUsers]);

  const fetchBinsData = useCallback(async () => {
    const res = await adminApi.getAllBins();
    const payload = res.data;
    const serverBins = Array.isArray(payload?.bins) ? payload.bins : Array.isArray(payload) ? payload : [];

    if (!res.ok) {
      setLiveBins([]);
      return;
    }

    const normalized = serverBins.map((s, index) => ({
      id: s.binId || s.id || `BIN-${index + 1}`,
      fill: Number.isFinite(s.fill) ? s.fill : Number(s.fill || 0),
      lat: Number(s.lat ?? s.location?.lat ?? 20.2961),
      lng: Number(s.lng ?? s.location?.lng ?? 85.8245),
      pickedUp: false,
      updatedAt: s.lastUpdated || s.updatedAt || Date.now(),
    }));
    setLiveBins(normalized);
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
    let mounted = true;
    (async () => {
      const res = await adminApi.getCurrentUser();
      if (!mounted) return;

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) navigate("/");
        return;
      }

      const u = res.data?.user || res.data?.data?.user || res.data?.data || res.data;
      const normalizedRole = String(u?.role || localStorage.getItem("smartbin-role") || "").toLowerCase();
      if (normalizedRole && normalizedRole !== "admin") {
        localStorage.setItem("smartbin-role", normalizedRole);
        navigate("/dashboard/driver");
        return;
      }

      if (u?.name) {
        setUserName(u.name);
        localStorage.setItem("smartbin-user-name", u.name);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [usersRes, driversRes] = await Promise.all([adminApi.getAllUsers(), adminApi.getAllDrivers()]);
      if (!mounted) return;

      if (usersRes.ok) {
        const usersPayload = usersRes.data?.users || usersRes.data?.data?.users || usersRes.data?.data || usersRes.data;
        setAllUsers(Array.isArray(usersPayload) ? usersPayload : []);
      }

      if (driversRes.ok) {
        const driversPayload =
          driversRes.data?.drivers || driversRes.data?.data?.drivers || driversRes.data?.data || driversRes.data;
        setDrivers(Array.isArray(driversPayload) ? driversPayload : []);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

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

  const handleLogout = async () => {
    await authApi.logout();
    localStorage.removeItem("smartbin-role");
    localStorage.removeItem("smartbin-user-name");
    localStorage.removeItem("auth-token");
    localStorage.removeItem("smartbin-email");
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
          <div className="h-105 overflow-hidden rounded-xl border border-(--color-accent-25)">
            <MapView bins={liveBins} routeBins={sortedByPriority} driverLocation={defaultDriverLocation} />
          </div>
        </section>
      );
    }

    if (activeSection === "Vehicles") {
      return (
        <section className="rounded-2xl border border-(--color-accent-25) bg-(--color-card-90) p-4 shadow-lg">
          <h2 className="text-xl font-bold text-(--color-text) mb-3">Driver & Vehicle</h2>
          <div className="space-y-2.5 text-(--color-text-muted)">
            <div className="rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3">
              <p className="font-semibold text-(--color-text)">Drivers ({driverUsers.length})</p>
            </div>
            {driverUsers.length === 0 ? (
              <div className="rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3">No driver users available</div>
            ) : (
              driverUsers.map((user, index) => (
                <div
                  key={user.id || user._id || user.email || `driver-${index}`}
                  className="rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3"
                >
                  <p className="font-semibold text-(--color-text)">{user.name || user.fullName || "Unknown User"}</p>
                </div>
              ))
            )}
          </div>
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

        <aside className="hidden lg:flex lg:w-72 xl:w-80 flex-col border-r border-(--color-accent-20) bg-(--color-card-90) backdrop-blur-sm">
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
    </div>
  );
};

export default AdminDashboard;
