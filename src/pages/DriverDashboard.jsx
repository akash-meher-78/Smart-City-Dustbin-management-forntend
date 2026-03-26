import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../components/dashboard/MapView";
import { authApi, userApi } from "../utils/api";
import driverApiService from "../utils/driverApi";

const driverSidebarItems = ["Today's Route", "Live Map", "Alerts"];

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [liveBins, setLiveBins] = useState([]);
  const [activeSection, setActiveSection] = useState("Today's Route");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState(localStorage.getItem("smartbin-user-name") || "Driver");
  const defaultDriverLocation = useMemo(() => ({ lat: 20.2961, lng: 85.8245 }), []);

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

  const driverStops = useMemo(() => sortedByPriority.slice(0, 8), [sortedByPriority]);
  const completedStops = driverStops.filter((bin) => bin.pickedUp).length;
  const progress = driverStops.length === 0 ? 0 : Math.round((completedStops / driverStops.length) * 100);

  const fetchBinsData = useCallback(async () => {
    const res = await driverApiService.getAllBins();
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
      const res = await userApi.getCurrent();
      if (!mounted) return;

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) navigate("/");
        return;
      }

      const u = res.data?.user || res.data?.data?.user || res.data?.data || res.data;
      const normalizedRole = String(u?.role || localStorage.getItem("smartbin-role") || "").toLowerCase();
      if (normalizedRole && normalizedRole !== "driver") {
        localStorage.setItem("smartbin-role", normalizedRole);
        navigate("/dashboard/admin");
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

  const handlePickup = (binId) => {
    setLiveBins((prevBins) =>
      prevBins.map((bin) =>
        bin.id === binId ? { ...bin, pickedUp: true, fill: 0, updatedAt: Date.now() } : bin
      )
    );
  };

  const handleLogout = async () => {
    await authApi.logout();
    localStorage.removeItem("smartbin-role");
    localStorage.removeItem("smartbin-user-name");
    localStorage.removeItem("auth-token");
    localStorage.removeItem("smartbin-email");
    navigate("/");
  };

  const renderSection = () => {
    if (activeSection === "Live Map") {
      return (
        <section className="rounded-2xl border border-(--color-accent-25) bg-(--color-card-90) p-4 shadow-lg">
          <h2 className="text-xl font-bold text-(--color-text) mb-3">Live Navigation</h2>
          <div className="h-110 overflow-hidden rounded-xl border border-(--color-accent-25)">
            <MapView bins={liveBins} routeBins={driverStops} driverLocation={defaultDriverLocation} />
          </div>
        </section>
      );
    }

    if (activeSection === "Alerts") {
      return (
        <section className="rounded-2xl border border-(--color-accent-25) bg-(--color-card-90) p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-(--color-text)">Route Alerts</h2>
            <span className="rounded-full bg-(--color-primary-20) px-2 py-0.5 text-xs font-bold text-(--color-primary)">
              {alerts.length} active
            </span>
          </div>
          <div className="space-y-2.5">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3">
                <p className="font-semibold text-(--color-text)">{alert.id} - Fill {alert.fill}%</p>
                <p className="text-sm text-(--color-text-muted)">{alert.zone}</p>
                <p className="text-xs text-(--color-text-soft)">{alert.time}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    return (
      <div className="grid xl:grid-cols-3 gap-4">
        <section className="xl:col-span-2 rounded-2xl border border-(--color-accent-25) bg-(--color-card-90) p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-(--color-text)">Today's Route</h2>
            <span className="rounded-full bg-(--color-primary-20) px-2.5 py-1 text-xs font-bold text-(--color-primary)">
              LIVE
            </span>
          </div>

          <div className="mb-4 rounded-xl border border-(--color-accent-20) bg-(--color-surface) p-3">
            <div className="mb-1 flex items-center justify-between text-sm text-(--color-text-muted)">
              <span>Route Progress</span>
              <span className="font-semibold">{progress}% complete</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-(--color-card-hover)">
              <div className="h-full bg-(--color-primary)" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="space-y-2.5">
            {driverStops.map((bin, index) => (
              <div
                key={bin.id}
                className="rounded-lg border border-(--color-accent-20) bg-(--color-surface) px-3 py-2.5 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-(--color-text)">Stop {index + 1}: {bin.id}</p>
                  <p className="text-sm text-(--color-text-muted)">Fill Level {bin.fill}%</p>
                </div>
                {bin.pickedUp ? (
                  <span className="rounded-full bg-(--color-card-hover) px-2.5 py-1 text-xs font-bold text-(--color-primary)">
                    Done
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePickup(bin.id)}
                    className="rounded-lg bg-(--color-primary) px-3 py-1.5 text-xs font-semibold text-(--color-text)"
                  >
                    Mark Picked Up
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-(--color-accent-25) bg-(--color-card-90) p-4 shadow-lg">
          <h2 className="text-xl font-bold text-(--color-text) mb-3">Live Navigation</h2>
          <div className="h-96 overflow-hidden rounded-xl border border-(--color-accent-25)">
            <MapView bins={liveBins} routeBins={driverStops} driverLocation={defaultDriverLocation} />
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-transparent text-(--color-text)">
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
            {driverSidebarItems.map((item) => (
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
            <p className="text-sm text-(--color-text-muted)">Field Driver</p>
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
            {driverSidebarItems.map((item) => (
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
            <p className="text-sm text-(--color-text-muted)">Field Driver</p>
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
              className="inline-flex items-center gap-2 rounded-lg border border-(--color-accent-35) bg-(--color-card) px-3 py-2 text-sm font-semibold text-(--color-text-muted)"
              aria-label="Open navigation menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="mb-5 rounded-2xl border border-(--color-accent-25) bg-(--color-card-85) p-5 shadow-xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-(--color-text)">{userName}</h1>
            <p className="mt-1 text-(--color-text-muted)">
              Route monitoring and pickup updates
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

export default DriverDashboard;
