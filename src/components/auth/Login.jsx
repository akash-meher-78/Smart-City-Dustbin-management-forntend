import { useState } from "react";
import { ShieldCheck, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../utils/api";

const Login = ({ onRegister }) => {
    const navigate = useNavigate();

    const [role, setRole] = useState('admin');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formMessage, setFormMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'username') {
            setUsername(value);
        } else if (name === 'password') {
            setPassword(value);
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        if (isLoading) return;
        
        if (!username.includes('@')) {
            setFormMessage('Please enter a valid email address');
            return;
        }

        setFormMessage('');
        
        (async () => {
            try {
                setIsLoading(true);
                const payload = { email: username, password };
                const res = await authApi.login(payload);

                if (res.ok) {
                    const userData = res.data?.user || res.data?.data?.user || res.data?.userData || {};
                    const apiRole = userData?.role || role;
                    const authToken =
                        res.data?.token ||
                        res.data?.accessToken ||
                        res.data?.data?.token ||
                        res.data?.data?.accessToken;

                    localStorage.setItem('smartbin-email', username.trim());
                    localStorage.setItem('smartbin-role', apiRole);
                    localStorage.setItem('smartbin-user-name', userData?.name || username.trim() || (apiRole === 'admin' ? 'Admin' : 'Driver'));
                    if (userData?._id || userData?.id) {
                        localStorage.setItem('smartbin-driver-id', userData?._id || userData?.id);
                    }
                    if (authToken) localStorage.setItem('auth-token', authToken);

                    navigate(apiRole === 'admin' ? '/dashboard/admin' : '/dashboard/driver');
                } else {
                    const errorMsg = res.data?.message || res.data?.error || res.data?.details || 'Login failed';
                    setFormMessage(`Login failed: ${errorMsg}`);
                }
            } catch (error) {
                setFormMessage(`Login failed: ${error?.message || 'Unexpected error occurred'}`);
            } finally {
                setIsLoading(false);
                setUsername('');
                setPassword('');
            }
        })();
    }

    const handleRoleChange = (newRole) => {
        setRole(newRole);
        localStorage.setItem('smartbin-role', newRole);
    }

    return (
        <div className="w-full flex items-center justify-center p-4 sm:p-6 relative">

            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 relative z-10 border-2 border-(--color-accent-35) bg-(--color-card-90) backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl">

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-(--color-text) mb-2">Welcome Back</h1>
                    <p className="text-(--color-text-muted)">
                        Sign in to access your dashboard
                    </p>
                </div>

                {/* Role Selection */}
                <div className="grid grid-cols-2 gap-4 w-full">
                    {/* Admin Card */}
                    <div
                        onClick={() => handleRoleChange('admin')}
                        className={`flex flex-col items-center justify-center h-20 sm:h-24 rounded-2xl cursor-pointer transition-all duration-300 ${
                            role === 'admin'
                                ? 'bg-(--color-primary-20) border-2 border-(--color-primary)'
                                : 'bg-(--color-card) border-2 border-transparent hover:border-(--color-accent-35)'
                        }`}
                    >
                        <ShieldCheck
                            size={24}
                            className={`mb-2 ${role === 'admin' ? 'text-(--color-primary)' : 'text-(--color-text-muted)'}`}
                        />
                        <span className="text-(--color-text) font-semibold text-xs">Admin</span>
                    </div>

                    {/* Driver Card */}
                    <div
                        onClick={() => handleRoleChange('driver')}
                        className={`flex flex-col items-center justify-center h-20 sm:h-24 rounded-2xl cursor-pointer transition-all duration-300 ${
                            role === 'driver'
                                ? 'bg-(--color-primary-20) border-2 border-(--color-primary)'
                                : 'bg-(--color-card) border-2 border-transparent hover:border-(--color-accent-35)'
                        }`}
                    >
                        <Truck
                            size={24}
                            className={`mb-2 ${role === 'driver' ? 'text-(--color-primary)' : 'text-(--color-text-muted)'}`}
                        />
                        <span className="text-(--color-text) font-semibold text-xs">Driver</span>
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label className="block text-(--color-text-muted) text-sm font-medium mb-2 uppercase tracking-wide">
                        Email
                    </label>
                    <input
                        name="username"
                        type="text"
                        value={username}
                        onChange={handleChange}
                        className="w-full bg-(--color-card) border border-(--color-accent-35) rounded-lg px-4 py-3 text-(--color-text) placeholder:text-(--color-text-soft) focus:outline-none focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-25) transition-all"
                        placeholder="Enter email"
                    />
                </div>

                {/* Password */}
                <div>
                    <label className="block text-(--color-text-muted) text-sm font-medium mb-2 uppercase tracking-wide">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={handleChange}
                            className="login-password-input w-full bg-(--color-card) border border-(--color-accent-35) rounded-lg px-4 py-3 pr-12 text-(--color-text) placeholder:text-(--color-text-soft) focus:outline-none focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-25) transition-all"
                            placeholder="Enter your password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-soft) hover:text-(--color-text) transition-colors"
                        >
                            {showPassword ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-5.68 1.915l-1.613-1.622zm2.16 2.16a9 9 0 0110.771 10.771l-1.577-1.577a7 7 0 00-9.488-9.488l-1.706-1.706z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Sign In Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full text-(--color-text) font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg uppercase tracking-wide ${
                        role === 'admin'
                            ? 'bg-(--color-primary) hover:brightness-110'
                            : 'bg-(--color-primary) hover:brightness-110'
                    }`}
                >
                    {isLoading ? (
                        <span className="btn-loading">
                            <span className="loader-circle" aria-hidden="true"></span>
                            Signing In
                            <span className="loading-dots" aria-hidden="true">
                                <span>.</span><span>.</span><span>.</span>
                            </span>
                        </span>
                    ) : (
                        'Sign In'
                    )}
                </button>

                {formMessage ? (
                    <p className="text-sm text-red-400 text-center font-medium">{formMessage}</p>
                ) : null}

                {/* Register Link */}
                <p className="text-center text-(--color-text-muted) text-sm">
                    Don't have an account?
                    <span
                        className="text-(--color-text) cursor-pointer ml-1 hover:text-(--color-primary) transition-colors"
                        onClick={onRegister}
                    >
                        Register here
                    </span>
                </p>
            </form>

        </div>
    );
}

export default Login;