import { useState } from "react";
import { ShieldCheck, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi, driverApi } from "../../utils/api";

const Register = ({ onLogin, setIsVerifying}) => {
    const navigate = useNavigate();
    const [role, setRole] = useState('driver');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formMessage, setFormMessage] = useState('');
    const bypassOtp = String(import.meta.env.VITE_BYPASS_OTP || '').toLowerCase() === 'true';

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'name') {
            setName(value);
        } else if (name === 'email') {
            setEmail(value);
        } else if (name === 'password') {
            setPassword(value);
        } else if (name === 'vehicleNumber') {
            setVehicleNumber(value);
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        if (isLoading) return;
        
        // Validation
        if (!name.trim()) {
            setFormMessage('Please enter your name');
            return;
        }
        if (!email.includes('@')) {
            setFormMessage('Please enter a valid email address');
            return;
        }
        if (password.length < 6) {
            setFormMessage('Password must be at least 6 characters');
            return;
        }
        if (role === 'driver' && !vehicleNumber.trim()) {
            setFormMessage('Please enter vehicle number for driver registration');
            return;
        }

        setFormMessage('');
        
        // Send OTP first, then register only after OTP verification succeeds.
        (async () => {
            try {
                setIsLoading(true);
                const payload = {
                    name: name.trim(),
                    email: email.trim(),
                    password,
                    role,
                    ...(role === 'driver' ? { vehicleNumber: vehicleNumber.trim() } : {}),
                };

                if (bypassOtp) {
                    const registerRes = await authApi.register(payload);
                    if (!registerRes.ok) {
                        const registerErr = registerRes.data?.message || registerRes.data?.error || registerRes.data?.details || 'Registration failed';
                        setFormMessage(`Registration failed: ${registerErr}`);
                        return;
                    }

                    const userData = registerRes.data?.user || registerRes.data?.data?.user || registerRes.data?.userData || {};
                    const selectedRole = userData?.role || payload?.role || 'driver';
                    const authToken =
                        registerRes.data?.token ||
                        registerRes.data?.accessToken ||
                        registerRes.data?.data?.token ||
                        registerRes.data?.data?.accessToken;

                    localStorage.setItem('smartbin-email', payload.email);
                    localStorage.setItem('smartbin-role', selectedRole);
                    localStorage.setItem('smartbin-user-name', userData?.name || payload.name || 'User');
                    if (authToken) localStorage.setItem('access-token', authToken);

                    if (selectedRole === 'driver') {
                        const createdUserId = userData?._id || userData?.id;
                        if (createdUserId) {
                            const createDriverRes = await driverApi.create({
                                userId: createdUserId,
                                vehicleNumber: payload.vehicleNumber,
                            });

                            if (!createDriverRes.ok) {
                                const createErr =
                                    createDriverRes.data?.message ||
                                    createDriverRes.data?.error ||
                                    createDriverRes.data?.details ||
                                    'Driver profile creation failed';
                                setFormMessage(`Driver profile setup failed: ${createErr}`);
                                return;
                            }

                            const createdDriver =
                                createDriverRes.data?.driver ||
                                createDriverRes.data?.data?.driver ||
                                createDriverRes.data?.data ||
                                createDriverRes.data;
                            const driverId = createdDriver?._id || createdDriver?.id;
                            if (driverId) localStorage.setItem('smartbin-driver-id', driverId);
                        }
                    }

                    navigate(selectedRole === 'admin' ? '/dashboard/admin' : '/dashboard/driver');
                    return;
                }

                localStorage.setItem('smartbin-email', email);
                localStorage.setItem('smartbin-role', role);
                localStorage.setItem('smartbin-user-name', name.trim());
                localStorage.setItem('smartbin-pending-registration', JSON.stringify(payload));

                const otpRes = await authApi.sendOtp({ email });
                if (!otpRes.ok) {
                    const errorMsg = otpRes.data?.message || otpRes.data?.error || otpRes.data?.details || 'OTP sending failed';
                    setFormMessage(`OTP sending failed: ${errorMsg}`);
                    return;
                }

                setIsVerifying(true);
                setName('');
                setEmail('');
                setPassword('');
                setVehicleNumber('');
            } finally {
                setIsLoading(false);
            }
        })();
    }

    return (
        <div className="w-full flex items-center justify-center p-4 sm:p-6 relative">

            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 relative z-10 border-2 border-(--color-accent-35) bg-(--color-card-90) backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl">

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-(--color-text) mb-2">Create Account</h1>
                    <p className="text-(--color-text-muted)">
                        Register to start using SmartBin
                    </p>
                </div>

                {/* Role Selection */}
                <div className="grid grid-cols-2 gap-4 w-full">
                    <div
                        onClick={() => setRole('admin')}
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

                    <div
                        onClick={() => setRole('driver')}
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

                <div className="space-y-4">
                    <div className={`grid gap-4 ${role === 'driver' ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                        <div>
                            <label className="block text-(--color-text-muted) text-sm font-medium mb-2 uppercase tracking-wide">
                                Full Name
                            </label>
                            <input
                                name="name"
                                type="text"
                                value={name}
                                onChange={handleChange}
                                className="w-full bg-(--color-card) border border-(--color-accent-35) rounded-lg px-4 py-3 text-(--color-text) placeholder:text-(--color-text-soft) focus:outline-none focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-25) transition-all"
                                placeholder="Full Name"
                            />
                        </div>

                        {role === 'driver' ? (
                            <div>
                                <label className="block text-(--color-text-muted) text-sm font-medium mb-2 uppercase tracking-wide">
                                    Vehicle Number
                                </label>
                                <input
                                    name="vehicleNumber"
                                    type="text"
                                    value={vehicleNumber}
                                    onChange={handleChange}
                                    className="w-full bg-(--color-card) border border-(--color-accent-35) rounded-lg px-4 py-3 text-(--color-text) placeholder:text-(--color-text-soft) focus:outline-none focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-25) transition-all"
                                    placeholder="OD-02-AB-1234"
                                />
                            </div>
                        ) : null}
                    </div>

                    <div>
                        <label className="block text-(--color-text-muted) text-sm font-medium mb-2 uppercase tracking-wide">
                            Email
                        </label>
                        <input
                            name="email"
                            type="email"
                            value={email}
                            onChange={handleChange}
                            className="w-full bg-(--color-card) border border-(--color-accent-35) rounded-lg px-4 py-3 text-(--color-text) placeholder:text-(--color-text-soft) focus:outline-none focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-25) transition-all"
                            placeholder="Email"
                        />
                    </div>
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
                            className="w-full bg-(--color-card) border border-(--color-accent-35) rounded-lg px-4 py-3 pr-12 text-(--color-text) placeholder:text-(--color-text-soft) focus:outline-none focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-25) transition-all"
                            placeholder="Password"
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

                {/* Register Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-(--color-primary) hover:brightness-110 text-(--color-text) font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg uppercase tracking-wide"
                >
                    {isLoading ? (
                        <span className="btn-loading">
                            <span className="loader-circle" aria-hidden="true"></span>
                            Registering
                            <span className="loading-dots" aria-hidden="true">
                                <span>.</span><span>.</span><span>.</span>
                            </span>
                        </span>
                    ) : (
                        'Register'
                    )}
                </button>

                {formMessage ? (
                    <p className="text-sm text-red-400 text-center font-medium">{formMessage}</p>
                ) : null}

                {/* Login Link */}
                <p className="text-center text-(--color-text-muted) text-sm">
                    Already have an account?
                    <span
                        className="text-(--color-text) cursor-pointer ml-1 hover:text-(--color-primary) transition-colors"
                        onClick={onLogin}
                    >
                        Login
                    </span>
                </p>
            </form>

        </div>
    );
}

export default Register;