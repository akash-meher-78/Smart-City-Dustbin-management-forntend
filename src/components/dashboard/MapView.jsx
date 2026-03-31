import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getColor } from "../../utils/utils";
import { createDriverIcon } from "../icons/DriverIcon";
import { createBinIcon } from "../icons/BinIcon";

// Helper to get bin status label
function getStatusLabel(fill) {
    const color = getColor(fill);
    if (color === "red") return "Critical";
    if (color === "yellow") return "Warning";
    return "Normal";
}

// Main MapView component
function MapView({ bins, routeBins, driverLocation }) {
    const [roadRoute, setRoadRoute] = useState([]);
    const driverIcon = createDriverIcon();
    const binIcon = createBinIcon();

    // Build route points (array of [lat, lng])
    const routePoints = routeBins.map((bin) => [bin.lat, bin.lng]);
    const driverLat = driverLocation?.lat;
    const driverLng = driverLocation?.lng;
    // Memoize routeWithDriver to avoid infinite useEffect loop
    const routeWithDriver = React.useMemo(() => {
        return (driverLat != null && driverLng != null)
            ? [[driverLat, driverLng], ...routePoints]
            : routePoints;
    }, [driverLat, driverLng, routePoints]);

    // Fetch road route from OSRM API
    useEffect(() => {
        let isMounted = true;

        const fetchRoadRoute = async () => {
            if (routeWithDriver.length < 2) {
                setRoadRoute([]);
                return;
            }

            try {
                const coordinates = routeWithDriver
                    .map(([lat, lng]) => `${lng},${lat}`)
                    .join(";");

                const response = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
                );

                if (!response.ok) throw new Error();

                const data = await response.json();

                if (!data.routes?.length) throw new Error();

                if (!isMounted) return;

                const roadPoints = data.routes[0].geometry.coordinates.map(
                    ([lng, lat]) => [lat, lng]
                );

                setRoadRoute(roadPoints);
            } catch {
                if (isMounted) setRoadRoute(routeWithDriver);
            }
        };

        const timeout = setTimeout(fetchRoadRoute, 500); // ✅ debounce

        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, [routeWithDriver]);

    return (
        <MapContainer center={[20.2961, 85.8245]} zoom={14} style={{ height: "100%", width: "100%" }}>
            <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Show driver location */}
            {driverLocation && (
                <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
                    <Popup>🚛 Driver Location</Popup>
                </Marker>
            )}

            {/* Show bins */}
            {bins.map((bin) => (
                <Marker key={bin.id} position={[bin.lat, bin.lng]} icon={binIcon}>
                    <Popup>
                        <b>{bin.id}</b><br />
                        Fill: {bin.fill}%<br />
                        Status: {bin.pickedUp ? "Picked Up" : getStatusLabel(bin.fill)}
                    </Popup>
                </Marker>
            ))}

            {/* Show route polyline */}
            {roadRoute.length > 1 && (
                <Polyline positions={roadRoute} pathOptions={{ color: "#00FF55", weight: 4 }} />
            )}
        </MapContainer>
    );
}

export default MapView;