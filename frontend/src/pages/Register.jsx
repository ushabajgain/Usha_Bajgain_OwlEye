import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Mail, Lock, User, Phone, Briefcase, Eye, EyeOff,
    ChevronRight, ShieldCheck, Check, Activity, Siren, AlertTriangle,
    Zap, Ticket as TicketIcon, ChevronDown
} from 'lucide-react';
import api from '../utils/api';
import C from '../utils/colors';

const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone_number: '',
        password: '',
        confirmPassword: '',
        role: 'attendee'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        if (name === 'full_name') {
            // Rejects numbers and most special characters
            newValue = value.replace(/[^a-zA-Z\s.-]/g, '');
        } else if (name === 'phone_number') {
            // Rejects letters
            newValue = value.replace(/\D/g, '');
        }

        setFormData({ ...formData, [name]: newValue });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrors({});

        // Local validation
        const newErrors = {};
        if (!formData.full_name) {
            newErrors.full_name = 'Full name is required.';
        } else if (formData.full_name.trim().length < 2) {
            newErrors.full_name = 'Name must be at least 2 characters.';
        }

        if (!formData.email) {
            newErrors.email = 'Email address is required.';
        } else if (formData.email.length > 255) {
            newErrors.email = 'Email too long (max 255).';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format (e.g. user@mail.com).';
        }

        if (formData.phone_number && (formData.phone_number.length < 7 || formData.phone_number.length > 15)) {
            newErrors.phone_number = 'Enter a valid 7-15 digit phone number.';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required.';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters.';
        } else if (formData.password.length > 128) {
            newErrors.password = 'Password too long (max 128).';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match.';
        }

        const validRoles = ['attendee', 'organizer', 'volunteer'];
        if (!validRoles.includes(formData.role)) {
            newErrors.general = 'Invalid role selected.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/accounts/register/', {
                full_name: formData.full_name,
                email: formData.email.toLowerCase(),

                phone_number: formData.phone_number,
                password: formData.password,
                password_confirm: formData.confirmPassword,
                role: formData.role
            });
            navigate('/login');
        } catch (err) {
            const serverErrors = {};
            const data = err.response?.data;
            if (data) {
                if (typeof data === 'object') {
                    Object.keys(data).forEach(key => {
                        serverErrors[key] = Array.isArray(data[key]) ? data[key][0] : data[key];
                    });
                }
                if (data.non_field_errors) serverErrors.general = data.non_field_errors[0];
                if (!Object.keys(serverErrors).length) serverErrors.general = 'Registration failed. Please check your details.';
            } else {
                serverErrors.general = 'Registration failed. Connection error.';
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
            width: '100%', maxWidth: 860, display: 'grid', gridTemplateColumns: '1.1fr 0.9fr',
            background: '#fff', borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            maxHeight: '95vh', overflow: 'hidden', zIndex: 1, border: '1px solid rgba(255,255,255,0.1)',
            animation: 'fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        },
        left: { padding: '24px 40px', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', justifyContent: 'center' },
        right: {
            position: 'relative', overflow: 'hidden', padding: '24px 28px',
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
            width: 28, height: 28, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.4)',
        },
        logoText: { fontSize: 16, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em' },
        title: { fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 2, letterSpacing: '-0.03em' },
        subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.4 },
        label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, marginLeft: 2 },
        inputWrap: { position: 'relative', marginBottom: 12 },
        input: {
            width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 42px',
            borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
            background: '#f9fafb', color: '#111827', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: 'inherit',
        },
        select: {
            width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 42px',
            borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
            background: '#f9fafb', color: '#111827', transition: 'all 0.2s',
            fontFamily: 'inherit', appearance: 'none', cursor: 'pointer',
        },
        cols2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
        submitBtn: {
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)', marginTop: 8,
        },
        featureItem: {
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px',
            background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 8, width: '100%', maxWidth: 260, transition: 'all 0.3s ease',
            textAlign: 'left',
        }
    };

    const FieldIcon = ({ icon: Icon }) => (
        <Icon size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', transition: 'color 0.2s' }} />
    );

    const onFocus = (e) => {
        e.target.style.borderColor = '#4F46E5';
        e.target.style.background = '#fff';
        e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
        e.target.previousSibling.style.color = '#4F46E5';
    };

    const onBlur = (e) => {
        const name = e.target.name;
        e.target.style.borderColor = errors[name] ? '#ef4444' : '#e5e7eb';
        e.target.style.background = '#f9fafb';
        e.target.style.boxShadow = 'none';
        e.target.previousSibling.style.color = '#9ca3af';
    };

    const ErrorMsg = ({ msg }) => msg ? (
        <p style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginTop: 4, marginLeft: 2, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={12} /> {msg}
        </p>
    ) : null;

    return (
        <div style={s.page}>
            <div style={{ ...s.blob, top: '-10%', left: '-10%' }} />
            <div style={{ ...s.blob, bottom: '-10%', right: '-10%', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(79, 70, 229, 0.15) 100%)' }} />

            <div style={s.card}>
                {/* Left: form */}
                <div style={s.left}>
                    <div style={s.logo}>
                        <div style={s.logoIcon}><Eye size={20} color="#fff" /></div>
                        <span style={s.logoText}>OwlEye</span>
                    </div>

                    <div style={{ animation: 'slideUp 0.6s ease-out both' }}>
                        <h1 style={s.title}>Create Account</h1>
                        <p style={s.subtitle}>Experience the power of intelligent event safety and monitoring.</p>

                        {errors.general && (
                            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertTriangle size={16} color="#dc2626" />
                                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{errors.general}</span>
                            </div>
                        )}

                        <form onSubmit={handleRegister}>
                            <label style={s.label}>Full Name</label>
                            <div style={s.inputWrap}>
                                <FieldIcon icon={User} />
                                <input type="text" name="full_name" maxLength={100} style={{ ...s.input, borderColor: errors.full_name ? '#ef4444' : '#e5e7eb' }} value={formData.full_name} onChange={handleChange} placeholder="John Doe"
                                    onFocus={onFocus} onBlur={onBlur} />
                            </div>
                            <ErrorMsg msg={errors.full_name} />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={s.label}>Email Address</label>
                                    <div style={s.inputWrap}>
                                        <FieldIcon icon={Mail} />
                                        <input type="email" name="email" maxLength={255} style={{ ...s.input, borderColor: errors.email ? '#ef4444' : '#e5e7eb' }} value={formData.email} onChange={handleChange} placeholder="john@company.com"
                                            onFocus={onFocus} onBlur={onBlur} />
                                    </div>
                                    <ErrorMsg msg={errors.email} />
                                </div>
                                <div>
                                    <label style={s.label}>Phone Number</label>
                                    <div style={s.inputWrap}>
                                        <FieldIcon icon={Phone} />
                                        <input type="tel" name="phone_number" maxLength={20} style={{ ...s.input, borderColor: errors.phone_number ? '#ef4444' : '#e5e7eb' }} value={formData.phone_number} onChange={handleChange} placeholder="+977 98XXXXXXX"
                                            onFocus={onFocus} onBlur={onBlur} />
                                    </div>
                                    <ErrorMsg msg={errors.phone_number} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 12 }}>
                                <div>
                                    <label style={s.label}>User Role</label>
                                    <div style={s.inputWrap}>
                                        <FieldIcon icon={Briefcase} />
                                        <select name="role" style={s.select} value={formData.role} onChange={handleChange} onFocus={onFocus} onBlur={onBlur}>
                                            <option value="attendee">Attendee</option>
                                            <option value="organizer">Organizer</option>
                                            <option value="volunteer">Volunteer</option>
                                        </select>
                                        <ChevronDown size={14} style={{ position: 'absolute', right: 14, top: 12, color: '#9ca3af', pointerEvents: 'none' }} />
                                    </div>
                                </div>
                            </div>

                            <div style={s.cols2}>
                                <div>
                                    <label style={s.label}>Password</label>
                                    <div style={s.inputWrap}>
                                        <FieldIcon icon={Lock} />
                                        <input type={showPassword ? 'text' : 'password'} name="password" maxLength={128} style={{ ...s.input, paddingRight: 46, borderColor: errors.password ? '#ef4444' : '#e5e7eb' }} value={formData.password} onChange={handleChange} placeholder="••••••••"
                                            onFocus={onFocus} onBlur={onBlur} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: 11, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <ErrorMsg msg={errors.password} />
                                </div>
                                <div>
                                    <label style={s.label}>Repeat Password</label>
                                    <div style={s.inputWrap}>
                                        <FieldIcon icon={ShieldCheck} />
                                        <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" style={{ ...s.input, paddingRight: 46, borderColor: errors.confirmPassword ? '#ef4444' : '#e5e7eb' }} value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••"
                                            onFocus={onFocus} onBlur={onBlur} />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: 12, top: 11, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <ErrorMsg msg={errors.confirmPassword} />
                                </div>
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
                                        Creating Account...
                                      </span>
                                    : <><span style={{ marginLeft: 16 }}>Create Account</span><ChevronRight size={20} /></>
                                }
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', marginTop: 24 }}>
                            Already have an account?&nbsp;
                            <Link to="/login" style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>Log in</Link>
                        </p>
                    </div>
                </div>

                {/* Right: branding */}
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
                            animation: 'pulse 3s infinite'
                        }}>
                            <Eye size={30} color="#fff" />
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: 8 }}>Join the Ecosystem</h2>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.5, maxWidth: 260, marginBottom: 24 }}>
                            Manage events, secure attendees, and respond faster with OwlEye.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                            {[
                                { t: 'Real-time monitoring', i: Activity },
                                { t: 'SOS Emergency Hub', i: Siren },
                                { t: 'Live Presence Insight', i: Zap },
                                { t: 'Secure E-Vouchers', i: TicketIcon }
                            ].map((feat, i) => (
                                <div key={feat.t} style={s.featureItem}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <feat.i size={16} color="#60a5fa" />
                                    </div>
                                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{feat.t}</span>
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

export default Register;
