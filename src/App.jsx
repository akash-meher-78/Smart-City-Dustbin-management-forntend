
// Beginner-friendly App component
import React, { createContext, useContext, useState } from "react";
import GlobalLoader from "./components/ui/GlobalLoader";
import { Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DriverDashboard from "./pages/DriverDashboard";

// This is the main component that handles page routing

// Global loading context
export const GlobalLoadingContext = createContext({ loading: false, setLoading: () => {} });

export function useGlobalLoading() {
    return useContext(GlobalLoadingContext);
}

function App() {
    const [loading, setLoading] = useState(false);
    return (
        <GlobalLoadingContext.Provider value={{ loading, setLoading }}>
            <GlobalLoader loading={loading} />
            <div>
                {/* Define routes for different pages */}
                <Routes>
                    <Route path="/" element={<AuthPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard/admin" element={<AdminDashboard />} />
                    <Route path="/dashboard/driver" element={<DriverDashboard />} />
                </Routes>
            </div>
        </GlobalLoadingContext.Provider>
    );
}

export default App;
