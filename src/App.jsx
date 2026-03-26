import { Route, Routes } from 'react-router-dom';
import './App.css'
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

function App() {

    return (
        <>
            <Routes>
                <Route path="/" element={<AuthPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </>
    )
}

export default App
