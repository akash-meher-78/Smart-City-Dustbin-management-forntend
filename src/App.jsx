
// Beginner-friendly App component
import React from "react";
import { Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DriverDashboard from "./pages/DriverDashboard";

// This is the main component that handles page routing
function App() {
    return (
        <div>
            {/* Define routes for different pages */}
            <Routes>
                <Route path="/" element={<AuthPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/admin" element={<AdminDashboard />} />
                <Route path="/dashboard/driver" element={<DriverDashboard />} />
            </Routes>
        </div>
    );
}

export default App;
