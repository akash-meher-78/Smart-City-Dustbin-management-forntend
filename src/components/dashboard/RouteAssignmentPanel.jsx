import { useMemo, useState } from "react";

const RouteAssignmentPanel = ({
  drivers,
  bins,
  isAssigning,
  onAssignRoute,
  assignFeedback,
}) => {
  const [driverQuery, setDriverQuery] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedBinIds, setSelectedBinIds] = useState([]);

  const filteredDrivers = useMemo(() => {
    const query = driverQuery.trim().toLowerCase();
    if (!query) return drivers;
    return drivers.filter((driver) => {
      const name = String(driver?.name || "").toLowerCase();
      const email = String(driver?.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [driverQuery, drivers]);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => String(driver.id) === String(selectedDriverId)) || null,
    [drivers, selectedDriverId]
  );

  const sortedBins = useMemo(() => [...bins].sort((a, b) => b.fill - a.fill), [bins]);


  const toggleBin = (binId) => {
    setSelectedBinIds((prev) =>
      prev.includes(binId) ? prev.filter((id) => id !== binId) : [...prev, binId]
    );
  };

  const selectCriticalBins = () => {
    const critical = sortedBins.filter((bin) => Number(bin.fill) >= 80).map((bin) => bin.id);
    setSelectedBinIds(critical);
  };

  const clearBins = () => setSelectedBinIds([]);

  const handleAssign = async () => {
    if (!selectedDriver) return;
    if (!selectedBinIds.length) return;

    const selectedBins = sortedBins.filter((bin) => selectedBinIds.includes(bin.id));
    await onAssignRoute({ driver: selectedDriver, bins: selectedBins, binIds: selectedBinIds });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-(--color-accent-20) bg-(--color-surface) p-4">
        <h3 className="text-lg font-semibold text-(--color-text)">Assign Driver Route</h3>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          Search driver by name or email, then select bins for pickup.
        </p>

        <div className="mt-3 space-y-3">
          <input
            type="text"
            value={driverQuery}
            onChange={(e) => setDriverQuery(e.target.value)}
            placeholder="Search driver by name or email"
            className="w-full rounded-md border border-(--color-accent-35) bg-(--color-card) px-3 py-2 text-(--color-text)"
          />

          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            disabled={drivers.length === 0}
            className="w-full rounded-md border border-(--color-accent-35) bg-(--color-card) px-3 py-2 text-(--color-text)"
          >
            <option value="">{drivers.length === 0 ? "No driver registered yet" : "Select driver"}</option>
            {filteredDrivers.map((driver) => (
              <option key={driver.id || driver.email} value={driver.id}>
                {driver.name} ({driver.email})
              </option>
            ))}
          </select>

          {drivers.length === 0 ? (
            <p className="text-sm font-medium text-(--color-text-muted)">No driver registered yet.</p>
          ) : null}

          {selectedDriver ? (
            <div className="rounded-md border border-(--color-accent-20) bg-(--color-card) p-3">
              <p className="font-semibold text-(--color-text)">{selectedDriver.name}</p>
              <p className="text-sm text-(--color-text-muted)">{selectedDriver.email}</p>
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectCriticalBins}
              className="rounded-md border border-(--color-accent-25) bg-(--color-card) px-3 py-1.5 text-xs font-semibold text-(--color-text-muted)"
            >
              Select Fill 80%+
            </button>
            <button
              type="button"
              onClick={clearBins}
              className="rounded-md border border-(--color-accent-25) bg-(--color-card) px-3 py-1.5 text-xs font-semibold text-(--color-text-muted)"
            >
              Clear
            </button>
          </div>

          <button
            type="button"
            disabled={isAssigning || !selectedDriver || selectedBinIds.length === 0}
            onClick={handleAssign}
            className="w-full rounded-md bg-(--color-primary) px-4 py-2 text-sm font-semibold text-(--color-text) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAssigning ? "Assigning Route..." : `Assign ${selectedBinIds.length} Bin(s)`}
          </button>

          {assignFeedback ? (
            <p
              className={`text-sm font-medium ${
                assignFeedback.type === "error" ? "text-red-400" : "text-green-400"
              }`}
            >
              {assignFeedback.message}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-(--color-accent-20) bg-(--color-surface) p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-(--color-text)">Select Bins</h3>
          <span className="rounded-full bg-(--color-primary-20) px-2 py-0.5 text-xs font-bold text-(--color-primary)">
            {selectedBinIds.length} selected
          </span>
        </div>

        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {sortedBins.map((bin) => {
            const checked = selectedBinIds.includes(bin.id);
            const hasLocation = bin.lng !== undefined && bin.lat !== undefined;
            return (
              <label
                key={bin.id}
                className="flex cursor-pointer items-center justify-between rounded-md border border-(--color-accent-20) bg-(--color-card) px-3 py-2"
              >
                <span>
                  <span className="block font-semibold text-(--color-text)">{bin.id}</span>
                  <span className="block text-xs text-(--color-text-muted)">Fill Level {bin.fill}%</span>
                  {hasLocation ? (
                    <span className="block text-xs text-(--color-text-soft)">
                      Lng: {Number(bin.lng).toFixed(4)}, Lat: {Number(bin.lat).toFixed(4)}
                    </span>
                  ) : null}
                </span>
                <input type="checkbox" checked={checked} onChange={() => toggleBin(bin.id)} />
              </label>
            );
          })}

          {sortedBins.length === 0 ? (
            <p className="text-sm text-(--color-text-muted)">No bins found from fill-level endpoint.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default RouteAssignmentPanel;
