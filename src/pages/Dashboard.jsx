import { Navigate } from "react-router-dom";

const Dashboard = () => {
    const role = String(localStorage.getItem("smartbin-role") || "driver").toLowerCase();
    return <Navigate to={role === "admin" ? "/dashboard/admin" : "/dashboard/driver"} replace />;
};

export default Dashboard;