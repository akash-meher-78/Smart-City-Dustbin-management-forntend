import { useState } from "react";

const BinManager = ({ bins, onCreateBin, onDeleteBin, onGetBinById, onRefresh }) => {
  const [binId, setBinId] = useState("");
  const [lookupBinId, setLookupBinId] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [binHeight, setBinHeight] = useState(100);
  const [lat, setLat] = useState(20.2961);
  const [lng, setLng] = useState(85.8245);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanBinId = String(binId || "").trim();
    if (!cleanBinId) {
      setMessageType("error");
      setMessage("Bin ID is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const existing = await onGetBinById(cleanBinId);
      if (existing?.ok && existing?.data) {
        setMessageType("error");
        setMessage(`Bin ID ${cleanBinId} already exists`);
        return;
      }

      const latNum = Number(lat);
      const lngNum = Number(lng);
      const heightNum = Number(binHeight);

      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        setMessageType("error");
        setMessage("Latitude and longitude must be valid numbers");
        return;
      }

      if (!Number.isFinite(heightNum) || heightNum <= 0) {
        setMessageType("error");
        setMessage("Bin height must be greater than 0");
        return;
      }

      const payload = {
        binId: cleanBinId,
        // Backend schema requires location as a string.
        location: `${latNum},${lngNum}`,
        binHeight: heightNum,
        lat: latNum,
        lng: lngNum,
      };

      const res = await onCreateBin(payload);
      if (!res?.ok) {
        const errorMsg = res?.data?.message || res?.data?.error || res?.data?.details || "Failed to create dustbin";
        setMessageType("error");
        setMessage(`Create failed: ${errorMsg}`);
        return;
      }

      setBinId("");
      setMessageType("success");
      setMessage("Dustbin created successfully");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (targetBinId) => {
    const res = await onDeleteBin(targetBinId);
    if (!res?.ok) {
      const errorMsg = res?.data?.message || res?.data?.error || res?.data?.details || "Failed to delete dustbin";
      setMessageType("error");
      setMessage(`Delete failed: ${errorMsg}`);
      return;
    }

    setMessageType("success");
    setMessage("Dustbin deleted successfully");
  };

  const handleLookup = async () => {
    const targetBinId = String(lookupBinId || "").trim();
    if (!targetBinId) {
      setMessageType("error");
      setMessage("Enter Bin ID to fetch");
      return;
    }

    const res = await onGetBinById(targetBinId);
    if (!res?.ok) {
      const errorMsg = res?.data?.message || res?.data?.error || res?.data?.details || "Failed to fetch dustbin";
      setMessageType("error");
      setMessage(`Fetch failed: ${errorMsg}`);
      setLookupResult(null);
      return;
    }

    const rawBin = res?.data?.bin || res?.data?.data?.bin || res?.data?.data || res?.data;
    setLookupResult(rawBin || null);
    setMessage("");
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3 rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3">
        <input
          type="text"
          value={lookupBinId}
          onChange={(e) => setLookupBinId(e.target.value)}
          placeholder="Find Bin by ID"
          className="md:col-span-2 bg-(--color-card) border border-(--color-accent-35) rounded-md px-3 py-2 text-(--color-text)"
        />
        <button
          type="button"
          onClick={handleLookup}
          className="rounded-md bg-(--color-primary) px-4 py-2 text-(--color-text) font-semibold"
        >
          Fetch Bin
        </button>
        <button
          type="button"
          onClick={() => setLookupResult(null)}
          className="rounded-md border border-(--color-accent-25) bg-(--color-card) px-4 py-2 text-(--color-text-muted) font-semibold"
        >
          Clear
        </button>

        {lookupResult && (
          <div className="md:col-span-4 rounded-lg border border-(--color-accent-20) bg-(--color-card) p-3">
            <p className="font-semibold text-(--color-text)">{lookupResult.binId || lookupResult.id || lookupBinId}</p>
            <p className="text-sm text-(--color-text-muted)">Fill: {Number(lookupResult.fill ?? 0)}%</p>
            <p className="text-sm text-(--color-text-muted)">
              Location: {Number(lookupResult.lat ?? lookupResult.location?.lat ?? 0)}, {Number(lookupResult.lng ?? lookupResult.location?.lng ?? 0)}
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleCreate} className="grid md:grid-cols-4 gap-3 rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3">
        <input
          type="text"
          value={binId}
          onChange={(e) => setBinId(e.target.value)}
          placeholder="Bin ID"
          className="bg-(--color-card) border border-(--color-accent-35) rounded-md px-3 py-2 text-(--color-text)"
        />
        <input
          type="number"
          value={binHeight}
          onChange={(e) => setBinHeight(e.target.value)}
          placeholder="Height"
          className="bg-(--color-card) border border-(--color-accent-35) rounded-md px-3 py-2 text-(--color-text)"
        />
        <input
          type="number"
          step="0.000001"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="Latitude"
          className="bg-(--color-card) border border-(--color-accent-35) rounded-md px-3 py-2 text-(--color-text)"
        />
        <input
          type="number"
          step="0.000001"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          placeholder="Longitude"
          className="bg-(--color-card) border border-(--color-accent-35) rounded-md px-3 py-2 text-(--color-text)"
        />
        <div className="md:col-span-4 flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-(--color-primary) px-4 py-2 text-(--color-text) font-semibold"
          >
            {isSubmitting ? "Creating..." : "Create Dustbin"}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-md border border-(--color-accent-25) bg-(--color-card) px-4 py-2 text-(--color-text-muted) font-semibold"
          >
            Refresh
          </button>
        </div>
      </form>

      {message ? (
        <p className={`text-sm font-medium ${messageType === "error" ? "text-red-400" : "text-green-400"}`}>{message}</p>
      ) : null}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {bins.map((bin) => (
          <div key={bin.id} className="rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3">
            <p className="font-semibold text-(--color-text)">{bin.id}</p>
            <p className="text-sm text-(--color-text-muted)">Fill Level: {bin.fill}%</p>
            <p className="text-xs text-(--color-text-soft)">Updated {new Date(bin.updatedAt).toLocaleTimeString()}</p>
            <button
              type="button"
              onClick={() => handleDelete(bin.id)}
              className="mt-3 rounded-md border border-red-400/60 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BinManager;
