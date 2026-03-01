import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ChevronRight, ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const uid = searchParams.get('uid');
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [isSuccess, setIsSuccess] = useState(false);

    // Password strength indicator
    const getPasswordStrength = (pwd) => {
        if (!pwd) return { score: 0, label: '', color: '#e5e7eb' };
        let score = 0;
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
        if (/\d/.test(pwd)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
        
        if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
        if (score <= 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
        if (score <= 3) return { score: 3, label: 'Good', color: '#3b82f6' };
        return { score: 4, label: 'Strong', color: '#22c55e' };
    };

    const strength = getPasswordStrength(password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        const newErrors = {};
        if (!password) newErrors.password = 'New password is required.';
        else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters.';

        if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password.';
        if (password && confirmPassword && password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match.';
        }

        if (!uid || !token) {
            newErrors.general = 'Invalid reset link. Please request a new password reset.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/accounts/reset-password/', { uid, token, password });
            setIsSuccess(true);
        } catch (err) {
            const data = err.response?.data;
            const msg = data?.detail || 'Something went wrong. Please try again.';
            // Map specific backend errors to field-level errors
            if (typeof msg === 'string' && msg.toLowerCase().includes('same as')) {
                setErrors({ password: msg });
            } else if (typeof msg === 'string' && (msg.toLowerCase().includes('too short') || msg.toLowerCase().includes('too common') || msg.toLowerCase().includes('numeric'))) {
                setErrors({ password: msg });
            } else {
                setErrors({ general: Array.isArray(msg) ? msg[0] : msg });
            }
            setIsLoading(false);
        }
    };

    const s = {
        page: {
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at top left, #1e293b, #0f172a)',
            fontFamily: "'Inter','Segoe UI',sans-serif", padding: 20,
            overflow: 'hidden', position: 'relative',
        },
        card: {
            width: '100%', maxWidth: 450,
            background: 'rgba(255, 255, 255, 0.98)', borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            padding: '40px', zIndex: 1, border: '1px solid rgba(255,255,255,0.1)',
            animation: 'fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        },
        logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' },
        logoIcon: {
            width: 38, height: 38, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.4)',
        },
        logoText: { fontSize: 20, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em' },
        title: { fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 12, textAlign: 'center' },
        subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 32, lineHeight: 1.6, textAlign: 'center' },
        label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, marginLeft: 2 },
        inputWrap: { position: 'relative', marginBottom: 20 },
        input: {
            width: '100%', boxSizing: 'border-box', padding: '12px 16px 12px 42px',
            borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
            background: '#f9fafb', color: '#111827', transition: 'all 0.2s',
            fontFamily: 'inherit',
        },
        submitBtn: {
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.3s',
            boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
            marginTop: 8,
        },
    };

    // Success state - show a beautiful confirmation instead of browser alert
    if (isSuccess) {
        return (
            <div style={s.page}>
                <div style={{ ...s.card, textAlign: 'center' }}>
                    <div style={{
                        width: 72, height: 72,
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px',
                        boxShadow: '0 12px 24px -6px rgba(34, 197, 94, 0.4)',
                        animation: 'successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}>
                        <CheckCircle2 size={36} color="#fff" />
                    </div>
                    <h1 style={{ ...s.title, color: '#111827' }}>Password Reset Complete</h1>
                    <p style={{ ...s.subtitle, marginBottom: 28 }}>
                        Your password has been successfully updated.
                        <br />You can now sign in with your new password.
                    </p>
                    <button
                        onClick={() => navigate('/login', { state: { successMessage: 'Password reset successfully. Please sign in.' } })}
                        style={s.submitBtn}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(79, 70, 229, 0.4)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(79, 70, 229, 0.3)';
                        }}
                    >
                        <span>Go to Login</span>
                        <ChevronRight size={18} />
                    </button>
                </div>
                <style>{`
                    @keyframes fadeInScale { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                    @keyframes successPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
                `}</style>
            </div>
        );
    }

    return (
        <div style={s.page}>
            <div style={s.card}>
                <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', textDecoration: 'none', fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
                    <ArrowLeft size={16} />
                    Back to login
                </Link>

                <div style={s.logo}>
                    <img src="/assets/OwlEye_LOGO.jpeg" alt="OwlEye Logo" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover' }} />
                    <span style={s.logoText}>OwlEye</span>
                </div>

                <h1 style={s.title}>Set New Password</h1>
                <p style={s.subtitle}>Please enter your new password below to regain access to your account.</p>

                {errors.general && (
                    <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{errors.general}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <label style={s.label}>New Password</label>
                    <div style={s.inputWrap}>
                        <Lock size={18} style={{ position: 'absolute', left: 14, top: 12, color: errors.password ? '#ef4444' : '#9ca3af' }} />
                        <input
                            type={showPass ? 'text' : 'password'} style={{ ...s.input, paddingRight: 46, borderColor: errors.password ? '#ef4444' : '#e5e7eb' }}
                            value={password} onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            onFocus={e => {
                                e.target.style.borderColor = '#4F46E5';
                                e.target.style.background = '#fff';
                                e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
                            }}
                            onBlur={e => {
                                e.target.style.borderColor = errors.password ? '#ef4444' : '#e5e7eb';
                                e.target.style.background = '#f9fafb';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                            style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        {errors.password && <p style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginTop: 4, marginLeft: 2 }}>{errors.password}</p>}
                    </div>

                    {/* Password strength indicator */}
                    {password && (
                        <div style={{ marginBottom: 20, marginTop: -12 }}>
                            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} style={{
                                        flex: 1, height: 4, borderRadius: 2,
                                        background: i <= strength.score ? strength.color : '#e5e7eb',
                                        transition: 'background 0.3s ease',
                                    }} />
                                ))}
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: strength.color }}>{strength.label}</span>
                        </div>
                    )}

                    <label style={s.label}>Confirm New Password</label>
                    <div style={s.inputWrap}>
                        <ShieldCheck size={18} style={{ position: 'absolute', left: 14, top: 12, color: errors.confirmPassword ? '#ef4444' : '#9ca3af' }} />
                        <input
                            type={showConfirm ? 'text' : 'password'} style={{ ...s.input, paddingRight: 46, borderColor: errors.confirmPassword ? '#ef4444' : '#e5e7eb' }}
                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            onFocus={e => {
                                e.target.style.borderColor = '#4F46E5';
                                e.target.style.background = '#fff';
                                e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
                            }}
                            onBlur={e => {
                                e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#e5e7eb';
                                e.target.style.background = '#f9fafb';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                            style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        {errors.confirmPassword && <p style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginTop: 4, marginLeft: 2 }}>{errors.confirmPassword}</p>}
                    </div>

                    {/* Password match indicator */}
                    {confirmPassword && password && (
                        <div style={{ marginTop: -12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {password === confirmPassword ? (
                                <>
                                    <CheckCircle2 size={14} color="#22c55e" />
                                    <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Passwords match</span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={14} color="#ef4444" />
                                    <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Passwords don't match</span>
                                </>
                            )}
                        </div>
                    )}

                    <button type="submit" disabled={isLoading} style={{
                        ...s.submitBtn,
                        opacity: isLoading ? 0.7 : 1,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                        onMouseEnter={e => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(79, 70, 229, 0.4)';
                            }
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(79, 70, 229, 0.3)';
                        }}
                    >
                        {isLoading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                Updating Password...
                            </span>
                        ) : (
                            <>Update Password <ChevronRight size={18} /></>
                        )}
                    </button>
                </form>
            </div>
            <style>{`
                @keyframes fadeInScale { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ResetPassword;
