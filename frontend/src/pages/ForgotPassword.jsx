import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ChevronRight, ArrowLeft, Eye, AlertTriangle } from 'lucide-react';
import api from '../utils/api';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        if (!email) {
            setErrors({ email: 'Email address is required.' });
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/accounts/forgot-password/', { email });
            setIsSent(true);
            setIsLoading(false);
        } catch (err) {
            const msg = err.response?.data?.detail || 'Something went wrong. Please try again.';
            setErrors({ general: msg });
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
            position: 'absolute', width: '500px', height: '500px',
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
            filter: 'blur(80px)', borderRadius: '50%', zIndex: 0,
            animation: 'float 20s infinite alternate ease-in-out',
        },
        card: {
            width: '100%', maxWidth: 450,
            background: 'rgba(255, 255, 255, 0.98)', borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            padding: '40px', zIndex: 1, border: '1px solid rgba(255,255,255,0.1)',
            animation: 'fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'center',
        },
        logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' },
        logoIcon: {
            width: 38, height: 38, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.4)',
        },
        logoText: { fontSize: 20, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em' },
        title: { fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 12, letterSpacing: '-0.03em' },
        subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 32, lineHeight: 1.6 },
        label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, textAlign: 'left', marginLeft: 2 },
        inputWrap: { position: 'relative', marginBottom: 24 },
        input: {
            width: '100%', boxSizing: 'border-box', padding: '12px 16px 12px 42px',
            borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
            background: '#f9fafb', color: '#111827', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: 'inherit',
        },
        submitBtn: {
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
        },
    };

    if (isSent) {
        return (
            <div style={s.page}>
                <div style={s.card}>
                    <div style={{ ...s.logoIcon, margin: '0 auto 24px', width: 60, height: 60, borderRadius: 20 }}>
                        <Mail size={30} color="#fff" />
                    </div>
                    <h1 style={s.title}>Check your email</h1>
                    <p style={s.subtitle}>
                        We've sent a password reset link to <br /> <strong>{email}</strong>
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        style={{ ...s.submitBtn, background: '#f3f4f6', color: '#1e293b', boxShadow: 'none' }}
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={s.page}>
            <div style={s.blob} />
            <div style={s.card}>
                <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', textDecoration: 'none', fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
                    <ArrowLeft size={16} />
                    Back to login
                </Link>

                <div style={s.logo}>
                    <div style={s.logoIcon}><Eye size={22} color="#fff" /></div>
                    <span style={s.logoText}>OwlEye</span>
                </div>

                <h1 style={s.title}>Reset Password</h1>
                <p style={s.subtitle}>Enter your email address and we'll send you a link to reset your password.</p>

                {errors.general && (
                    <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={16} color="#dc2626" />
                        <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{errors.general}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <label style={s.label}>Email Address</label>
                    <div style={s.inputWrap}>
                        <Mail size={18} style={{ ...s.inputIcon, position: 'absolute', left: 14, top: 12, color: errors.email ? '#ef4444' : '#9ca3af' }} />
                        <input
                            type="email" style={{ ...s.input, borderColor: errors.email ? '#ef4444' : '#e5e7eb' }} value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="name@company.com"
                        />
                        {errors.email && <p style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginTop: 4, textAlign: 'left', marginLeft: 2 }}>{errors.email}</p>}
                    </div>

                    <button type="submit" disabled={isLoading} style={s.submitBtn}>
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                        {!isLoading && <ChevronRight size={18} />}
                    </button>
                </form>
            </div>
            <style>{`
                @keyframes float { from { transform: translate(0, 0); } to { transform: translate(20px, 20px); } }
                @keyframes fadeInScale { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
};

export default ForgotPassword;
