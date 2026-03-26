import { getColor } from "../../utils/utils";

const Sidebar = ({ bins, routeBins, stats, onPickup }) => {
    const getStatusLabel = (fill) => {
        const color = getColor(fill);
        if (color === "red") return "Critical";
        if (color === "yellow") return "Warning";
        return "Normal";
    };

    return (
        <div style={{ width: "300px", padding: "20px", background: "#393E46", borderRight: "1px solid rgba(0, 173, 181, 0.3)", color: "#EAEAEA", overflowY: "auto" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#00Adb5" }}>Smart Dustbin Dashboard</h2>

            <div style={{ marginBottom: "16px", padding: "12px", borderRadius: "8px", background: "rgba(0, 173, 181, 0.15)", border: "1px solid rgba(0, 173, 181, 0.3)" }}>
                <p style={{ marginBottom: "6px", fontSize: "13px", color: "#EAEAEA" }}>Total Bins: {stats.total}</p>
                <p style={{ marginBottom: "6px", fontSize: "13px", color: "#EAEAEA" }}>Pending Pickup: {stats.active}</p>
                <p style={{ marginBottom: "6px", fontSize: "13px", color: "#EAEAEA" }}>Critical Bins: {stats.critical}</p>
                <p style={{ fontSize: "13px", color: "#EAEAEA" }}>Avg Fill Level: {stats.average}%</p>
            </div>

            <h3 style={{ fontSize: "16px", marginBottom: "10px", color: "#00FF55" }}>Pickup Route (High to Low Fill)</h3>
            {routeBins.length === 0 && (
                <p style={{ marginBottom: "16px", fontSize: "13px", color: "#EAEAEA" }}>
                    All bins are already picked up.
                </p>
            )}

            {routeBins.map((bin, index) => (
                <div
                    key={`${bin.id}-route`}
                    style={{
                        marginBottom: "10px",
                        padding: "10px",
                        borderRadius: "8px",
                        background: "rgba(0, 173, 181, 0.15)",
                        border: "1px solid rgba(0, 173, 181, 0.3)",
                    }}
                >
                    <p style={{ fontSize: "13px", color: "#00FF55", marginBottom: "4px" }}>Stop {index + 1}: {bin.id}</p>
                    <p style={{ fontSize: "12px", color: "#EAEAEA", marginBottom: "8px" }}>Fill {bin.fill}%</p>
                    <button
                        type="button"
                        onClick={() => onPickup(bin.id)}
                        style={{
                            width: "100%",
                            border: "none",
                            borderRadius: "6px",
                            padding: "8px",
                            background: "#00Adb5",
                            color: "#222831",
                            fontWeight: "700",
                            cursor: "pointer",
                        }}
                    >
                        Mark Picked Up
                    </button>
                </div>
            ))}

            <h3 style={{ fontSize: "16px", marginTop: "18px", marginBottom: "10px", color: "#00FF55" }}>All Bins</h3>

            {bins.map((bin) => (
                <div
                    key={bin.id}
                    style={{
                        marginBottom: "12px",
                        padding: "12px",
                        borderRadius: "8px",
                        background: "rgba(0, 173, 181, 0.15)",
                        border: "1px solid rgba(0, 173, 181, 0.3)",
                        opacity: bin.pickedUp ? 0.6 : 1,
                    }}
                >
                    <h4 style={{ color: "#00FF55", fontWeight: "600", marginBottom: "6px" }}>{bin.id}</h4>
                    <p style={{ color: "#EAEAEA", fontSize: "14px", marginBottom: "6px" }}>
                        Fill: {bin.fill}%
                    </p>
                    <p style={{ color: getColor(bin.fill), fontWeight: "bold", fontSize: "12px" }}>
                        {bin.pickedUp ? "PICKED UP" : getStatusLabel(bin.fill).toUpperCase()}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default Sidebar;