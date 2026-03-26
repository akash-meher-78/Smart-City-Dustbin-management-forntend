import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../utils/api';

const VerifyOtp = ({ setIsVerifying }) => {
    const [otp, setOtp] = useState(new Array(4).fill(""));
    const [seconds, setSeconds] = useState(59);
    const [formMessage, setFormMessage] = useState('');
    const inputRefs = useRef([]);
    const navigate = useNavigate();
    const email = localStorage.getItem('smartbin-email') || '';

   
    useEffect(() => {
        const timer = seconds > 0 && setInterval(() => setSeconds(seconds - 1), 1000);
        return () => clearInterval(timer);
    }, [seconds]);

    const handleChange = (element, index) => {
        if (isNaN(element.value)) return false;

        const newOtp = [...otp];
        newOtp[index] = element.value.substring(element.value.length - 1);
        setOtp(newOtp);

        if (element.value && index < 3) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    return (
        <div className="w-full flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Header Section */}
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-(--color-text) mb-3 lock-heading">
                        We just sent a verification code
                    </h2>
                    <p className="text-(--color-text-muted)">
                        Enter the security code we sent to <br />
                        <span className="text-(--color-text) font-medium">{email || 'your email'}</span>
                        <button
                            onClick={() => setIsVerifying(false)}
                            className="ml-2 text-(--color-text) hover:text-(--color-primary) transition-colors"
                        >
                            ✎
                        </button>
                    </p>
                </div>

                {/* OTP Input Fields */}
                <div className="flex gap-2 sm:gap-4 justify-center">
                    {otp.map((data, index) => (
                        <input
                            key={index}
                            type="text"
                            inputMode="numeric"
                            maxLength="1"
                            ref={(el) => (inputRefs.current[index] = el)}
                            value={data}
                            onChange={(e) => handleChange(e.target, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                                     className="w-12 h-12 sm:w-16 sm:h-16 text-xl sm:text-2xl text-center font-semibold bg-(--color-card) border-2 border-(--color-accent-35) rounded-xl text-(--color-text)
                                 focus:border-(--color-primary) focus:ring-2 focus:ring-(--color-primary-25) outline-none transition-all hover:border-(--color-accent)"
                        />
                    ))}
                </div>

                {/* Submit Button */}
                <button
                    onClick={() => {
                        (async () => {
                            const enteredOtp = otp.join("");
                            if (!email) {
                                setFormMessage('Email not found. Please register again.');
                                setIsVerifying(false);
                                return;
                            }

                            const payload = { email, otp: enteredOtp };
                            const res = await authApi.verifyOtp(payload);
                            
                            if (res.ok) {
                                setFormMessage('');
                                const selectedRole = localStorage.getItem('smartbin-role') || 'driver';
                                const authToken =
                                    res.data?.token ||
                                    res.data?.accessToken ||
                                    res.data?.data?.token ||
                                    res.data?.data?.accessToken;
                                localStorage.setItem('smartbin-role', selectedRole);
                                if (authToken) localStorage.setItem('auth-token', authToken);
                                navigate('/dashboard');
                            } else {
                                const errorMsg = res.data?.message || res.data?.error || res.data?.details || 'OTP verification failed';
                                setFormMessage(`OTP verification failed: ${errorMsg}`);
                            }
                        })();
                    }}
                          className="w-full py-4 bg-(--color-primary) hover:brightness-110 text-(--color-text) font-bold rounded-lg shadow-lg 
                           active:scale-[0.98] transition-all uppercase tracking-wide"
                >
                    Verify
                </button>

                {/* Footer / Resend */}
                <div className="text-sm text-(--color-text-muted) space-y-2">
                    <p className="text-(--color-text-muted)">Didn't receive code?</p>
                    <button
                        disabled={seconds > 0}
                        onClick={() => {
                            (async () => {
                                if (!email) {
                                    setFormMessage('Email not found. Please register again.');
                                    setIsVerifying(false);
                                    return;
                                }

                                const payload = { email };
                                const resendRes = await authApi.sendOtp(payload);
                                
                                if (resendRes.ok) {
                                    setSeconds(59);
                                    setFormMessage('OTP resent successfully!');
                                } else {
                                    const errorMsg = resendRes.data?.message || resendRes.data?.error || resendRes.data?.details || 'Failed to resend OTP';
                                    setFormMessage(`Resend failed: ${errorMsg}`);
                                }
                            })();
                        }}
                        className={`font-semibold transition-colors ${
                            seconds > 0
                                ? 'text-(--color-text-muted) opacity-50 cursor-not-allowed'
                                : 'text-(--color-text) hover:text-(--color-primary) cursor-pointer'
                        }`}
                    >
                        Resend
                    </button>
                    <div className="text-(--color-text-soft)">
                        00:{seconds < 10 ? `0${seconds}` : seconds}
                    </div>
                </div>

                {formMessage ? (
                    <p className="text-sm text-red-400 text-center font-medium">{formMessage}</p>
                ) : null}
            </div>
        </div>
    );
}

export default VerifyOtp