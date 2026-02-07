import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import {
    User, Lock, Camera, Eye, EyeOff,
    CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import C from '../utils/colors';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { clearAuth } from '../utils/auth';

const Settings = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'password', 'privacy'
    const [loading, setLoading] = useState(false);
    const [isTrackingEnabled, setIsTrackingEnabled] = useState(localStorage.getItem('is_tracking_enabled') !== 'false');
    const [fetching, setFetching] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef(null);

    // Profile State
    const [profile, setProfile] = useState({
        fullName: '',
        email: '',
        phone: '',
        location: '',
        profileImage: null
    });

    const [previewUrl, setPreviewUrl] = useState(null);

    // Password State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const [showPass, setShowPass] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // Load initial data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/accounts/profile/');
                const data = res.data;
                setProfile({
                    fullName: data.full_name || '',
                    email: data.email || '',
                    phone: data.phone_number || '',
                    location: data.location || '',
                    profileImage: data.profile_image || null
                });
                if (data.profile_image) {
                    const imageUrl = data.profile_image.startsWith('http') 
                        ? data.profile_image 
                        : `http://localhost:8000${data.profile_image}`;
                    setPreviewUrl(imageUrl);
                }
            } catch (err) {
                console.error("Failed to fetch profile", err);
                setProfile(prev => ({
                    ...prev,
                    fullName: getFullName() || '',
                    email: getEmail() || ''
                }));
            } finally {
                setFetching(false);
            }
        };
        fetchProfile();
    }, []);

    const handleAvatarClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfile({ ...profile, profileImage: file });
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('full_name', profile.fullName);
            formData.append('phone_number', profile.phone);
            formData.append('location', profile.location);
            
            if (profile.profileImage instanceof File) {
                formData.append('profile_image', profile.profileImage);
            }

            const res = await api.patch('/accounts/profile/update/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.full_name) {
                localStorage.setItem('full_name', res.data.full_name);
            }
            if (res.data.profile_image) {
                localStorage.setItem('profile_image', res.data.profile_image);
            }

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'danger', text: 'Failed to update profile.' });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        
        // 1. Password mismatch
        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'danger', text: 'Passwords do not match!' });
            return;
        }

        // 2. New password same as old (Frontend check)
        if (passwords.new === passwords.current) {
            setMessage({ type: 'danger', text: 'New password must be different from your current password.' });
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/accounts/change-password/', {
                old_password: passwords.current,
                new_password: passwords.new
            });
            
            // Show successful message from backend
            setMessage({ 
                type: 'success', 
                text: res.data.message || 'Password changed! Logging you out...' 
            });

            // CLEAR AND REDIRECT after a short moment for visibility
            setTimeout(() => {
                clearAuth();
                navigate('/login', { 
                    state: { 
                        successMessage: "Password updated successfully. You've been logged out for security reasons." 
                    } 
                });
            }, 2000);

        } catch (err) {
            setMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to change password.' });
            setLoading(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        }
    };

    const s = {
        main: { flex: 1, marginLeft: 230, background: C.background, display: 'flex', flexDirection: 'column', minHeight: '100vh' },
        container: { padding: '32px', maxWidth: 1100, margin: '0 auto', width: '100%' },
        card: { background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: '280px 1fr', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.03)' },
        tabs: { background: '#fcfdfe', borderRight: `1px solid ${C.border}`, padding: '24px 0' },
        tabBtn: (active) => ({
            width: '100%', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', borderLeft: active ? `4px solid ${C.primary}` : '4px solid transparent', background: active ? C.primary + '08' : 'transparent', color: active ? C.primary : C.textSecondary, fontSize: 14, fontWeight: active ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
        }),
        content: { padding: '40px 60px' },
        formTitle: { fontSize: 20, fontWeight: 800, color: C.textPrimary, marginBottom: 24 },
        grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: 60 },
        field: { marginBottom: 20 },
        label: { fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 8, display: 'block' },
        inputGroup: { position: 'relative' },
        input: { width: '100%', padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, background: '#fff', color: C.textPrimary, outline: 'none', transition: 'border-color 0.2s' },
        inputDisabled: { background: '#f8fafc', color: C.textSecondary, cursor: 'not-allowed' },
        passToggle: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: C.primary, cursor: 'pointer' },
        avatarSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
        avatarCircle: { width: 120, height: 120, borderRadius: '50%', background: C.primaryTint, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: `4px solid #fff`, boxShadow: '0 8px 20px rgba(0,0,0,0.08)', overflow: 'hidden', cursor: 'pointer' },
        avatarImage: { width: '100%', height: '100%', objectFit: 'cover' },
        avatarEdit: { position: 'absolute', bottom: 4, right: 4, width: 32, height: 32, borderRadius: '50%', background: '#fff', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10 },
        btnSave: { padding: '12px 32px', borderRadius: 12, background: C.primary, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', marginTop: 12, boxShadow: '0 4px 12px rgba(79,70,229,0.3)', opacity: loading ? 0.7 : 1 },
        alert: (type) => ({ padding: '12px 20px', borderRadius: 12, background: type === 'success' ? C.successTint : C.dangerTint, color: type === 'success' ? C.success : C.danger, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 })
    };

    if (fetching) return (
        <div style={{ display: 'flex', minHeight: '100vh', background: C.background }}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Settings" breadcrumb="Dashboard" />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 className="animate-spin" size={40} color={C.primary} />
                </div>
            </main>
        </div>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: C.background }}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Settings" breadcrumb="Dashboard" />
                <div style={s.container}>
                    <div style={s.card}>
                        <div style={s.tabs}>
                            <button style={s.tabBtn(activeTab === 'basic')} onClick={() => setActiveTab('basic')}><User size={18} /> Basic Information</button>
                            <button style={s.tabBtn(activeTab === 'password')} onClick={() => setActiveTab('password')}><Lock size={18} /> Password</button>
                            <button style={s.tabBtn(activeTab === 'privacy')} onClick={() => setActiveTab('privacy')}><Eye size={18} /> Privacy & Tracking</button>
                        </div>
                        <div style={s.content}>
                            {message.text && (
                                <div style={s.alert(message.type)}>
                                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    {message.text}
                                </div>
                            )}
                            {activeTab === 'privacy' ? (
                                <div style={{ maxWidth: 600 }}>
                                    <h2 style={s.formTitle}>Privacy & Location Tracking</h2>
                                    <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
                                        OwlEye utilizes background location services to keep you safe during the event, enabling organizers to spot crowd crushes and dispatch medical volunteers instantly. Your location data is fully anonymized to other regular attendees.
                                    </p>
                                    
                                    <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, background: isTrackingEnabled ? '#f0fdf4' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s' }}>
                                        <div>
                                            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 4px 0' }}>Real-time Safety Telemetry</h3>
                                            <p style={{ fontSize: 12, color: C.textSecondary, margin: 0 }}>
                                                {isTrackingEnabled ? "Satellite tracking is active. You are visible to safety personnel." : "Tracking is paused. You cannot be located during an SOS."}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newVal = !isTrackingEnabled;
                                                setIsTrackingEnabled(newVal);
                                                localStorage.setItem('is_tracking_enabled', newVal ? 'true' : 'false');
                                                window.dispatchEvent(new CustomEvent('tracking_preference_changed', { detail: newVal }));
                                                setMessage({ type: 'success', text: newVal ? 'Location tracking enabled.' : 'Location tracking paused completely.' });
                                                setTimeout(() => setMessage({ type: '', text: '' }), 4000);
                                            }}
                                            style={{
                                                padding: '10px 20px', borderRadius: 30, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                                                background: isTrackingEnabled ? C.danger : C.primary, color: '#fff', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            {isTrackingEnabled ? "Pause Tracking" : "Start Sharing Location"}
                                        </button>
                                    </div>
                                </div>
                            ) : activeTab === 'basic' ? (
                                <form onSubmit={handleProfileSubmit}>
                                    <div style={s.grid}>
                                        <div>
                                            <div style={s.field}>
                                                <label style={s.label}>Full Name</label>
                                                <input id="profile-fullname" name="fullName" style={s.input} value={profile.fullName} onChange={e => setProfile({ ...profile, fullName: e.target.value })} placeholder="Full Name" required />
                                            </div>
                                            <div style={s.field}>
                                                <label style={s.label}>Email Address</label>
                                                <input id="profile-email" name="email" style={{ ...s.input, ...s.inputDisabled }} value={profile.email} readOnly />
                                                <button type="button" style={{ color: C.primary, fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>Change Email Address</button>
                                            </div>
                                            <div style={s.field}>
                                                <label style={s.label}>Phone Number</label>
                                                <input id="profile-phone" name="phone" style={s.input} value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone Number" />
                                            </div>
                                            <div style={s.field}>
                                                <label style={s.label}>Location</label>
                                                <input style={s.input} value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })} placeholder="Location" />
                                            </div>
                                            <button type="submit" style={s.btnSave} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
                                        </div>
                                        <div style={s.avatarSection}>
                                            <div style={s.avatarCircle} onClick={handleAvatarClick}>
                                                {previewUrl ? (
                                                    <img src={previewUrl} alt="Avatar" style={s.avatarImage} />
                                                ) : (
                                                    <User size={60} color={C.primary} />
                                                )}
                                                <div style={s.avatarEdit}>
                                                    <Camera size={16} color={C.textSecondary} />
                                                </div>
                                            </div>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                onChange={handleFileChange} 
                                                accept="image/*" 
                                                style={{ display: 'none' }} 
                                            />
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handlePasswordSubmit} style={{ maxWidth: 500 }}>
                                    <h2 style={s.formTitle}>Change Password</h2>
                                    <div style={s.field}>
                                        <label style={s.label}>Password</label>
                                        <div style={s.inputGroup}>
                                            <input type={showPass.current ? "text" : "password"} style={s.input} value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} placeholder="Enter Current Password" />
                                            <button type="button" onClick={() => setShowPass({ ...showPass, current: !showPass.current })} style={s.passToggle}>{showPass.current ? "HIDE" : "SHOW"}</button>
                                        </div>
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>New Password</label>
                                        <div style={s.inputGroup}>
                                            <input type={showPass.new ? "text" : "password"} style={s.input} value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} placeholder="Enter New Password" />
                                            <button type="button" onClick={() => setShowPass({ ...showPass, new: !showPass.new })} style={s.passToggle}>{showPass.new ? "HIDE" : "SHOW"}</button>
                                        </div>
                                    </div>
                                    <div style={s.field}>
                                        <label style={s.label}>Confirm Password</label>
                                        <div style={s.inputGroup}>
                                            <input type={showPass.confirm ? "text" : "password"} style={s.input} value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Re-enter New Password" />
                                            <button type="button" onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })} style={s.passToggle}>{showPass.confirm ? "HIDE" : "SHOW"}</button>
                                        </div>
                                    </div>
                                    <div style={{ padding: '12px 16px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fef3c7', fontSize: 11, color: '#92400e', marginBottom: 24 }}>
                                        <strong>Please note:</strong> After you change your password, you will be automatically logged out of all devices for security reasons.
                                    </div>
                                    <button type="submit" style={s.btnSave} disabled={loading}>{loading ? 'Updating...' : 'Save Changes'}</button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Settings;
