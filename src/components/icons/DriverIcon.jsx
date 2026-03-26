import L from "leaflet";
import { Truck } from "lucide-react";
import { renderToString } from "react-dom/server";

export const createDriverIcon = () => {
    const iconHTML = renderToString(
        <Truck color="red" fill='red' size={32} />
    );

    return L.divIcon({
        html: iconHTML,
        className: "",
        iconSize: [32, 32],
    });
};