import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ChevronRight, AlertTriangle, CheckCircle2, Zap, Shield, Users, Globe } from 'lucide-react';
import api from '../utils/api';
import C from '../utils/colors';
import { isAuthenticated, getRole } from '../utils/auth';

const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const successMsg = location.state?.successMessage;

    // Auto-redirect if already logged in (Remember Me)
    useEffect(() => {
        if (isAuthenticated()) {
            const role = getRole();
            if (role === 'admin') navigate('/admin/dashboard');
            else if (role === 'organizer') navigate('/organizer/dashboard');
            else if (role === 'volunteer') navigate('/volunteer/dashboard');
            else if (role === 'attendee') navigate('/attendee/dashboard');
            else navigate('/events');
        }
    }, [navigate]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrors({});

        // Local validation for missing fields
        const newErrors = {};
        if (!email) {
            newErrors.email = 'Email address is required.';
        } else if (email.length > 255) {
            newErrors.email = 'Email too long (max 255).';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Invalid email format (e.g. user@mail.com).';
        }

        if (!password) {
            newErrors.password = 'Password is required.';
        } else if (password.length > 128) {
            newErrors.password = 'Password too long (max 128).';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/accounts/login/', { email: email.toLowerCase(), password });

            // Clear any stale tokens/data from both storages
            localStorage.clear();
            sessionStorage.clear();
            
            const storage = rememberMe ? localStorage : sessionStorage;

            storage.setItem('role', response.data.role);
            storage.setItem('token', response.data.access);
            storage.setItem('refresh_token', response.data.refresh);
            storage.setItem('userId', response.data.id);
            storage.setItem('full_name', response.data.full_name || '');
            storage.setItem('profile_image', response.data.profile_image || '');

            if (response.data.role === 'admin') {
                navigate('/admin/dashboard');
            } else if (response.data.role === 'organizer') {
                navigate('/organizer/dashboard');
            } else if (response.data.role === 'volunteer') {
                navigate('/volunteer/dashboard');
            } else if (response.data.role === 'attendee') {
                navigate('/attendee/dashboard');
            } else {
                navigate('/events');
            }
        } catch (err) {
            const serverErrors = {};
            const data = err.response?.data;
            if (data) {
                if (data.email) serverErrors.email = Array.isArray(data.email) ? data.email[0] : data.email;
                if (data.password) serverErrors.password = Array.isArray(data.password) ? data.password[0] : data.password;
                if (data.non_field_errors) serverErrors.general = data.non_field_errors[0];
                if (data.detail) serverErrors.general = data.detail;
            } else {
                serverErrors.general = 'Login failed. Connection error.';
            }
            setErrors(serverErrors);
        } finally {
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
        blob: {
            position: 'absolute', width: '600px', height: '600px',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
            filter: 'blur(100px)', borderRadius: '50%', zIndex: 0,
            animation: 'float 20s infinite alternate ease-in-out',
        },
        card: {
            width: '100%', maxWidth: 820, display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: 'rgba(255, 255, 255, 0.98)', borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            overflow: 'hidden', zIndex: 1, border: '1px solid rgba(255,255,255,0.1)',
            animation: 'fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        },
        left: { padding: '32px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#fff' },
        right: {
            position: 'relative', overflow: 'hidden', padding: '32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: '#1a2a4a',
        },
        rightImg: {
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.6, mixBlendMode: 'overlay',
        },
        rightOverlay: {
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
        },
        rightContent: { position: 'relative', zIndex: 2, textAlign: 'center', color: '#fff' },
        logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
        logoIcon: {
            width: 32, height: 32, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.4)',
        },
        logoText: { fontSize: 18, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em' },
        title: { fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 4, letterSpacing: '-0.03em' },
        subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 1.4 },
        label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, marginLeft: 2 },
        inputWrap: { position: 'relative', marginBottom: 12 },
        input: {
            width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 42px',
            borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
            background: '#f9fafb', color: '#111827', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: 'inherit',
        },
        submitBtn: {
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)', marginTop: 4,
        },
        divider: { height: 1, background: '#f3f4f6', margin: '24px 0', position: 'relative' },
        statCard: {
            background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)',
            borderRadius: 16, padding: '16px', border: '1px solid rgba(255, 255, 255, 0.08)',
            transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
            textAlign: 'left', position: 'relative', overflow: 'hidden'
        },
        statIcon: {
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(79, 70, 229, 0.15)', border: '1px solid rgba(79, 70, 229, 0.2)', color: '#818cf8'
        },
        statValue: { fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 },
        statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: 0 },
    };

    return (
        <div style={s.page}>
            <div style={{ ...s.blob, top: '-10%', left: '-10%' }} />
            <div style={{ ...s.blob, bottom: '-10%', right: '-10%', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(79, 70, 229, 0.15) 100%)' }} />

            <div style={s.card}>
                {/* Left: form */}
                <div style={s.left}>
                    <div style={s.logo}>
                        <div style={s.logoIcon}><Eye size={22} color="#fff" /></div>
                        <span style={s.logoText}>OwlEye</span>
                    </div>

                    <div style={{ animation: 'slideUp 0.6s ease-out 0.1s both' }}>
                        <h1 style={s.title}>Welcome Back</h1>
                        <p style={s.subtitle}>Precise & easy event management.</p>

                        {successMsg && (
                            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle2 size={16} color="#16a34a" />
                                <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{successMsg}</span>
                            </div>
                        )}

                        {errors.general && (
                            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertTriangle size={16} color="#dc2626" />
                                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{errors.general}</span>
                            </div>
                        )}

                        <form onSubmit={handleLogin}>
                            <label style={s.label}>Email Address</label>
                            <div style={s.inputWrap}>
                                <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', transition: 'color 0.2s' }} />
                                <input type="email" style={{ ...s.input, borderColor: errors.email ? '#ef4444' : '#e5e7eb' }} value={email} onChange={e => setEmail(e.target.value.substring(0, 255))}
                                    placeholder="name@company.com"
                                    maxLength={255}
                                    onFocus={e => {
                                        e.target.style.borderColor = '#4F46E5';
                                        e.target.style.background = '#fff';
                                        e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
                                        e.target.previousSibling.style.color = '#4F46E5';
                                    }}
                                    onBlur={e => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.background = '#f9fafb';
                                        e.target.style.boxShadow = 'none';
                                        e.target.previousSibling.style.color = '#9ca3af';
                                    }} />
                            </div>
                            {errors.email && <p style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginTop: 4, marginLeft: 2, marginBottom: 12 }}>{errors.email}</p>}

                            <label style={s.label}>Password</label>
                            <div style={{ ...s.inputWrap }}>
                                <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', transition: 'color 0.2s' }} />
                                <input type={showPassword ? 'text' : 'password'} style={{ ...s.input, paddingRight: 50, borderColor: errors.password ? '#ef4444' : '#e5e7eb' }}
                                    value={password} onChange={e => setPassword(e.target.value.substring(0, 128))}
                                    placeholder="••••••••"
                                    maxLength={128}
                                    onFocus={e => {
                                        e.target.style.borderColor = '#4F46E5';
                                        e.target.style.background = '#fff';
                                        e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
                                        e.target.previousSibling.style.color = '#4F46E5';
                                    }}
                                    onBlur={e => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.background = '#f9fafb';
                                        e.target.style.boxShadow = 'none';
                                        e.target.previousSibling.style.color = '#9ca3af';
                                    }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && <p style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginTop: 4, marginLeft: 2, marginBottom: 12 }}>{errors.password}</p>}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={e => setRememberMe(e.target.checked)}
                                            style={{
                                                width: 18, height: 18, cursor: 'pointer', appearance: 'none',
                                                border: '1.5px solid #e5e7eb', borderRadius: 5, background: rememberMe ? '#4F46E5' : '#f9fafb',
                                                transition: 'all 0.2s',
                                            }}
                                        />
                                        {rememberMe && (
                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', display: 'flex' }}>
                                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Remember me</span>
                                </label>
                                <Link to="/forgot-password" style={{ fontSize: 13, color: '#4F46E5', textDecoration: 'none', fontWeight: 600 }}>Forgot password?</Link>
                            </div>

                            <button type="submit" disabled={isLoading} style={s.submitBtn}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(79, 70, 229, 0.4)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(79, 70, 229, 0.3)';
                                }}>
                                {isLoading
                                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                        Signing In...
                                      </span>
                                    : <><span style={{ marginLeft: 16 }}>Sign In</span><ChevronRight size={20} /></>
                                }
                            </button>
                        </form>

                        <div style={s.divider} />

                        <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280' }}>
                            Don't have an account?&nbsp;
                            <Link to="/register" style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>Start for free</Link>
                        </p>
                    </div>
                </div>

                {/* Right: branding panel */}
                <div style={s.right}>
                    <img src="/assets/auth_bg.png" style={s.rightImg} alt="branding background" />
                    <div style={s.rightOverlay} />

                    <div style={s.rightContent}>
                        <div style={{
                            width: 60, height: 60, background: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(12px)', borderRadius: 20,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 20, border: '1px solid rgba(255,255,255,0.2)',
                            margin: '0 auto 20px',
                            animation: 'pulse 3s infinite ease-in-out'
                        }}>
                            <Eye size={32} color="#fff" />
                        </div>
                        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 12, letterSpacing: '-0.02em' }}>OwlEye Intelligence</h2>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto 32px' }}>
                            The next generation of event safety and crowd management.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
                            {[
                                { label: 'Detection', icon: Zap },
                                { label: 'Security', icon: Shield },
                                { label: 'Protected', icon: Users },
                                { label: 'Emergency', icon: Globe },
                            ].map((stat, i) => (
                                <div key={i} style={s.statCard}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-5px)';
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                                        e.currentTarget.querySelector('.stat-glow').style.opacity = '1';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                        e.currentTarget.querySelector('.stat-glow').style.opacity = '0';
                                    }}>
                                    <div className="stat-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #4F46E5, transparent)', opacity: 0, transition: 'opacity 0.3s' }} />
                                    <div style={s.statIcon}><stat.icon size={16} /></div>
                                    <div>
                                        <p style={s.statValue}>{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes float { from { transform: translate(0, 0); } to { transform: translate(30px, 30px); } }
                @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }
                @keyframes fadeInScale { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default Login;
