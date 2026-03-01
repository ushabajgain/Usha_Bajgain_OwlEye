import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Eye, Map, Bell, Users, Zap, 
    ArrowRight, CheckCircle, Globe, 
    Smartphone, Lock, Activity,
    Heart, BarChart3, Radio, Shield
} from 'lucide-react';
import { getRole, isAuthenticated } from '../utils/auth';
import Navbar from '../components/Navbar';
import HomeFooter from '../components/HomeFooter';
const HomePage = () => {
    const navigate = useNavigate();
    const isAuth = isAuthenticated();
    const role = getRole();
    const dashboardRef = useRef(null);

    const handleCTA = () => {
        if (!isAuth) {
            navigate('/register');
        } else {
            const path = role === 'admin' ? '/admin/dashboard' : 
                         role === 'organizer' ? '/organizer/dashboard' : 
                         '/attendee/dashboard';
            navigate(path);
        }
    };

    const s = {
        container: {
            fontFamily: "'Outfit', 'Inter', sans-serif",
            color: '#fff',
            background: '#020617',
            minHeight: '100vh',
            overflowX: 'hidden'
        },

        hero: {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            background: "linear-gradient(rgba(2, 6, 23, 0.4), rgba(2, 6, 23, 0.98)), url('/assets/hero-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            padding: '160px 20px 60px',
            position: 'relative'
        },

        title: {
            fontSize: 'clamp(56px, 8vw, 100px)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 32,
            padding: '0.1em 0',
            maxWidth: 1100,
            background: 'linear-gradient(to bottom, #fff 40%, rgba(255,255,255,0.6) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-4px',
            animation: 'heroReveal 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
        },
        subtitle: {
            fontSize: 'clamp(20px, 1.8vw, 24px)',
            color: '#cbd5e1',
            maxWidth: 850,
            lineHeight: 1.5,
            fontWeight: 400,
            marginBottom: 56,
            animation: 'slideUpText 1.4s cubic-bezier(0.16, 1, 0.3, 1)'
        },
        btnPrimary: {
            padding: '20px 48px',
            borderRadius: 100,
            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
            color: '#fff',
            fontSize: 18,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 20px 40px -10px rgba(79, 70, 229, 0.5)',
            animation: 'slideUpText 1.6s cubic-bezier(0.16, 1, 0.3, 1)'
        },
        btnSecondary: {
            padding: '20px 48px',
            borderRadius: 100,
            background: 'rgba(255,255,255,0.03)',
            color: '#fff',
            fontSize: 18,
            border: '1px solid rgba(255,255,255,0.1)',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.4s ease',
            animation: 'slideUpText 1.6s cubic-bezier(0.16, 1, 0.3, 1)'
        },
        section: {
            padding: '160px 20px',
            maxWidth: 1200,
            margin: '0 auto'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 24,
            marginTop: 80
        }
    };

    return (
        <div style={s.container}>
            <style>{`
                @keyframes heroReveal { 
                    from { opacity: 0; transform: translateY(60px) scale(0.95); filter: blur(10px); } 
                    to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } 
                }
                @keyframes slideUpText { 
                    from { opacity: 0; transform: translateY(40px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                @keyframes floatImg { 
                    0%, 100% { transform: translateY(0) rotateX(5deg); }
                    50% { transform: translateY(-20px) rotateX(8deg); }
                }

                .glow-btn:hover {
                    box-shadow: 0 0 50px rgba(99, 102, 241, 0.6);
                    transform: scale(1.02) translateY(-2px);
                }

                .modern-card {
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 32px;
                    padding: 48px;
                    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                    cursor: default;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
                }
                .modern-card:hover {
                    background: rgba(255, 255, 255, 0.07);
                    border-color: rgba(99, 102, 241, 0.5);
                    transform: translateY(-16px) scale(1.02);
                    box-shadow: 0 50px 100px -30px rgba(0,0,0,0.7);
                }

                .floating-dashboard {
                    animation: floatImg 8s ease-in-out infinite;
                }
            `}</style>
            <Navbar />

            <header style={s.hero}>

                
                <h1 style={s.title}>One Hub for All<br />Event Intelligence</h1>
                <p style={s.subtitle}>
                    Experience the next evolution of venue safety. Real-time SOS maps, crowdsourced intelligence, and professional responder coordination. All unified in one hub.
                </p>
                
                <div style={{ display: 'flex', gap: 24 }}>
                    <button onClick={handleCTA} style={s.btnPrimary} className="glow-btn">
                        {isAuth ? 'Go to HQ' : 'Start Securely'} <ArrowRight size={22} />
                    </button>
                    <button style={s.btnSecondary} onClick={() => dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                        System Overview
                    </button>
                </div>

                <div ref={dashboardRef} style={{ marginTop: 80, maxWidth: 950, width: '90%' }}>
                    <div className="floating-dashboard">
                        <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 32, padding: 10, boxShadow: '0 100px 150px -50px rgba(0,0,0,0.8)' }}>
                             <div style={{ padding: '12px 24px', display: 'flex', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ width: 12, height: 12, borderRadius: 50, background: '#ff5f56' }} />
                                <div style={{ width: 12, height: 12, borderRadius: 50, background: '#ffbd2e' }} />
                                <div style={{ width: 12, height: 12, borderRadius: 50, background: '#27c93f' }} />
                             </div>
                             <div style={{ 
                                width: '100%', height: 480, borderRadius: 24, 
                                backgroundImage: 'url("/assets/tactical_map.png")',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                overflow: 'hidden', position: 'relative'
                            }}>
                             </div>
                        </div>
                    </div>
                </div>
            </header>

            <section style={s.section}>
                <div style={{ textAlign: 'center', marginBottom: 100 }}>
                    <h2 style={{ fontSize: 56, fontWeight: 900, marginBottom: 20 }}>Engineered for Crisis.</h2>
                    <p style={{ fontSize: 22, color: '#94a3b8', maxWidth: 800, margin: '0 auto' }}>Developed with security experts to handle thousands of concurrent data points in the most high-pressure environments.</p>
                </div>

                <div style={s.grid}>
                    <div className="modern-card">
                        <div style={{ color: '#818cf8', marginBottom: 24 }}><Map size={40} /></div>
                        <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Tactical Live Map</h3>
                        <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 17 }}>Track every emergency, incident, and responder location in real-time on one unified grid.</p>
                    </div>
                    <div className="modern-card">
                        <div style={{ color: '#10b981', marginBottom: 24 }}><Users size={40} /></div>
                        <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Team Coordination</h3>
                        <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 17 }}>Seamlessly manage volunteers and staff with instant task assignments and status tracking.</p>
                    </div>
                    <div className="modern-card">
                        <div style={{ color: '#f59e0b', marginBottom: 24 }}><Bell size={40} /></div>
                        <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Instant SOS Alerts</h3>
                        <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 17 }}>Mission-critical emergency notifications delivered to specialized responders when every second counts.</p>
                    </div>
                    <div className="modern-card">
                        <div style={{ color: '#ef4444', marginBottom: 24 }}><Shield size={40} /></div>
                        <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Secure Architecture</h3>
                        <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 17 }}>Bank-grade encryption and secure data pipelines protect all mission-critical communications.</p>
                    </div>
                </div>
            </section>

            <HomeFooter />
        </div>
    );
};

export default HomePage;
