import L from "leaflet";
import { Trash2, Truck } from "lucide-react";
import { renderToString } from "react-dom/server";

export const createBinIcon = () => {
    const iconHTML = renderToString(
        <Trash2 color="red"  size={32} />
    );

    return L.divIcon({
        html: iconHTML,
        className: "",
        iconSize: [32, 32],
    });
};