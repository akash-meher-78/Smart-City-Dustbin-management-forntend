import { useState } from "react";
import { useToast, ToastContainer } from "../ui/Toast";

const OBJECT_ID_REGEX = /^[a-fA-F\d]{24}$/;

const resolveBinIdentifier = (bin) =>
  String(bin?.binNumber || bin?.binId || bin?.id || bin?._id || "").trim();

const resolveDeleteIdentifier = (bin) =>
  String(bin?.deleteId || bin?._id || bin?.binNumber || bin?.binId || bin?.id || "").trim();

const resolveDeleteCandidates = (bin) => {
  const candidates = [bin?.deleteId, bin?._id, bin?.id, bin?.binNumber, bin?.binId]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const uniq = [...new Set(candidates)];
  const objectIds = uniq.filter((id) => OBJECT_ID_REGEX.test(id));
  const nonObjectIds = uniq.filter((id) => !OBJECT_ID_REGEX.test(id));
  return [...objectIds, ...nonObjectIds];
};

const resolveBinLabel = (bin) =>
  String(bin?.binNumber || bin?.binId || bin?.id || bin?._id || "Unknown bin").trim();

const BinManager = ({ bins, onCreateBin, onDeleteBin, onGetBinById, onRefresh }) => {
  const { toasts, removeToast, success, error, info } = useToast();
  const [binId, setBinId] = useState("");
  const [lookupBinId, setLookupBinId] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [binHeight, setBinHeight] = useState(100);
  const [lat, setLat] = useState(20.2961);
  const [lng, setLng] = useState(85.8245);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanBinId = String(binId || "").trim();
    if (!cleanBinId) {
      error("Bin ID is required", "Create Failed");
      return;
    }

    setIsSubmitting(true);
    try {
      const duplicate = bins.some((bin) => {
        const existingLabel = resolveBinLabel(bin).toLowerCase();
        return existingLabel === cleanBinId.toLowerCase();
      });
      if (duplicate) {
        error(`Bin ID ${cleanBinId} already exists`, "Duplicate Bin");
        return;
      }

      const latNum = Number(lat);
      const lngNum = Number(lng);
      const heightNum = Number(binHeight);

      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        error("Latitude and longitude must be valid numbers", "Invalid Location");
        return;
      }

      if (!Number.isFinite(heightNum) || heightNum <= 0) {
        error("Bin height must be greater than 0", "Invalid Height");
        return;
      }

      const payload = {
        binNumber: cleanBinId,
        location: {
          lat: latNum,
          lng: lngNum,
        },
        binHeight: heightNum,
      };

      const res = await onCreateBin(payload);
      if (!res?.ok) {
        const errorMsg = res?.data?.message || res?.data?.error || res?.data?.details || "Failed to create dustbin";
        error(errorMsg, "Create Failed");
        return;
      }

      setBinId("");
      success(`Bin ${cleanBinId} created successfully`, "Create Complete");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (bin) => {
    const deleteCandidates = resolveDeleteCandidates(bin);
    const primaryDeleteId = deleteCandidates[0] || "";

    if (!primaryDeleteId) {
      error("Invalid bin ID", "Delete Failed");
      return;
    }

    setDeletingId(primaryDeleteId);

    try {
      const res = await onDeleteBin({ candidates: deleteCandidates, binId: primaryDeleteId });

      if (!res?.ok) {
        const errorMsg =
          res?.data?.message ||
          res?.data?.error ||
          res?.data?.details ||
          `Server returned status ${res?.status}`;
        error(errorMsg, "Delete Failed");
        setDeletingId(null);
        return;
      }

      success(`Bin ${resolveBinLabel(bin)} deleted successfully`, "Success");

      setTimeout(() => {
        setDeletingId(null);
        onRefresh();
      }, 500);
    } catch (err) {
      error(err?.message || "Network error during delete", "Delete Failed");
      setDeletingId(null);
    }
  };

  const handleLookup = async () => {
    const targetBinId = String(lookupBinId || "").trim();
    if (!targetBinId) {
      error("Enter Bin ID to fetch", "Lookup Failed");
      return;
    }

    const localMatch = bins.find((bin) => {
      const candidates = [bin?.binNumber, bin?.id, bin?.deleteId, bin?._id]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean);
      return candidates.includes(targetBinId.toLowerCase());
    });

    if (localMatch) {
      setLookupResult(localMatch.raw || localMatch);
      success(`Bin ${resolveBinLabel(localMatch)} found`, "Lookup Complete");
      return;
    }

    if (!OBJECT_ID_REGEX.test(targetBinId)) {
      error("For server lookup, enter Mongo _id. binNumber lookup works from local list only.", "Lookup Failed");
      setLookupResult(null);
      return;
    }

    info(`Fetching bin ${targetBinId}...`, "Loading");
    const res = await onGetBinById(targetBinId);
    if (!res?.ok) {
      const errorMsg = res?.data?.message || res?.data?.error || res?.data?.details || "Failed to fetch dustbin";
      error(errorMsg, "Fetch Failed");
      setLookupResult(null);
      return;
    }

    const rawBin = res?.data?.bin || res?.data?.data?.bin || res?.data?.data || res?.data;
    setLookupResult(rawBin || null);
    success(`Bin ${targetBinId} found`, "Lookup Complete");
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
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

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {bins.map((bin) => (
            <div key={resolveBinIdentifier(bin) || resolveBinLabel(bin)} className="rounded-lg border border-(--color-accent-20) bg-(--color-surface) p-3">
              <p className="font-semibold text-(--color-text)">{resolveBinLabel(bin)}</p>
              <p className="text-sm text-(--color-text-muted)">Fill Level: {bin.fill}%</p>
              <p className="text-xs text-(--color-text-soft)">Updated {new Date(bin.updatedAt).toLocaleTimeString()}</p>
              <button
                type="button"
                onClick={() => handleDelete(bin)}
                disabled={deletingId === resolveDeleteIdentifier(bin)}
                className={`mt-3 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all ${deletingId === resolveDeleteIdentifier(bin)
                    ? "border-red-600/80 bg-red-600/20 text-red-400 cursor-not-allowed"
                    : "border-red-400/60 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                  }`}
              >
                {deletingId === resolveDeleteIdentifier(bin) ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-3 h-3 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default BinManager;
