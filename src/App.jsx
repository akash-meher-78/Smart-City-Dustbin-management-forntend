import { Route, Routes } from 'react-router-dom';
import './App.css'
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import DriverDashboard from './pages/DriverDashboard';

function App() {

    return (
        <>
            <Routes>
                <Route path="/" element={<AuthPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/admin" element={<AdminDashboard />} />
                <Route path="/dashboard/driver" element={<DriverDashboard />} />
            </Routes>
        </>
    )
}

export default App
