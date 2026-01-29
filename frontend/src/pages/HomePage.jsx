import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Eye, Map, Bell, Users, Zap, 
    ArrowRight, CheckCircle, Globe, 
    Smartphone, Lock, Activity,
    Heart, BarChart3, Radio
} from 'lucide-react';
import { getRole, isAuthenticated } from '../utils/auth';

const HomePage = () => {
    const navigate = useNavigate();
    const isAuth = isAuthenticated();
    const role = getRole();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
        nav: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: scrolled ? '15px 80px' : '25px 80px',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: scrolled ? 'rgba(2, 6, 23, 0.85)' : 'transparent',
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
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
            padding: '120px 20px 60px',
            position: 'relative'
        },
        badge: {
            padding: '10px 24px',
            borderRadius: 100,
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            color: '#a5b4fc',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: 32,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
            animation: 'fadeIn 1s ease-out'
        },
        title: {
            fontSize: 'clamp(56px, 8vw, 100px)',
            fontWeight: 900,
            lineHeight: 0.95,
            marginBottom: 32,
            maxWidth: 1200,
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
            padding: '160px 80px',
            maxWidth: 1500,
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
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap');
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes heroReveal { 
                    from { opacity: 0; transform: translateY(60px) scale(0.95) rotateX(10deg); filter: blur(10px); } 
                    to { opacity: 1; transform: translateY(0) scale(1) rotateX(0); filter: blur(0); } 
                }
                @keyframes slideUpText { 
                    from { opacity: 0; transform: translateY(40px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                @keyframes floatImg { 
                    0%, 100% { transform: translateY(0) rotateX(5deg) rotateY(2deg); }
                    50% { transform: translateY(-30px) rotateX(8deg) rotateY(-2deg); }
                }
                @keyframes pulse-ring {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(1.5); opacity: 0; }
                }

                .glow-btn:hover {
                    box-shadow: 0 0 50px rgba(99, 102, 241, 0.6);
                    transform: scale(1.02) translateY(-2px);
                }
                
                .modern-card {
                    background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%);
                    box-shadow: 0 40px 100px -20px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);
                    border-radius: 40px;
                    border: 1px solid rgba(255,255,255,0.05);
                    padding: 48px;
                    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .modern-card:hover {
                    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
                    border-color: rgba(99, 102, 241, 0.3);
                    transform: translateY(-20px) scale(1.02);
                }

                .stat-num {
                    font-size: 64px;
                    font-weight: 900;
                    letter-spacing: -3px;
                    background: linear-gradient(135deg, #fff 0%, #6366f1 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .floating-dashboard {
                    animation: floatImg 8s ease-in-out infinite;
                    perspective: 2000px;
                }

                .nav-item { color: #94a3b8; font-weight: 600; text-decoration: none; transition: all 0.3s; position: relative; }
                .nav-item:hover { color: #fff; }
                .nav-item:after {
                    content: ''; position: absolute; bottom: -5px; left: 0; width: 0; height: 2px;
                    background: #6366f1; transition: width 0.3s;
                }
                .nav-item:hover:after { width: 100%; }
            `}</style>

            <nav style={s.nav}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 0 30px rgba(79, 70, 229, 0.5)' }}>
                        <Eye color="#fff" size={24} />
                    </div>
                    <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1.5 }}>OwlEye</span>
                </div>
                
                <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
                    <a href="#" className="nav-item">Platform</a>
                    <a href="#" className="nav-item">Safety Network</a>
                    <a href="#" className="nav-item">Enterprise</a>
                    <button 
                        onClick={() => navigate('/login')}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', padding: '10px 20px' }}
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={handleCTA}
                        className="glow-btn"
                        style={{ padding: '14px 32px', borderRadius: 100, background: '#fff', color: '#000', border: 'none', fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s' }}
                    >
                        Join Now
                    </button>
                </div>
            </nav>

            <header style={s.hero}>
                <div style={s.badge}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '50%', border: '4px solid #6366f1', animation: 'pulse-ring 1.5s infinite' }} />
                        <Radio size={16} />
                    </div>
                    Omnipresent Safety Oversight
                </div>
                
                <h1 style={s.title}>One Hub for All<br />Event Intelligence.</h1>
                <p style={s.subtitle}>
                    Experience the next evolution of venue safety. Real-time SOS maps, crowdsourced intelligence, and professional responder coordination—unified.
                </p>
                
                <div style={{ display: 'flex', gap: 24 }}>
                    <button onClick={handleCTA} style={s.btnPrimary} className="glow-btn">
                        {isAuth ? 'Go to HQ' : 'Start Securely'} <ArrowRight size={22} />
                    </button>
                    <button style={s.btnSecondary} onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
                        System Overview
                    </button>
                </div>

                <div style={{ marginTop: 100, maxWidth: 1200, width: '95%' }}>
                    <div className="floating-dashboard">
                        <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 32, padding: 10, boxShadow: '0 100px 150px -50px rgba(0,0,0,0.8)' }}>
                             <div style={{ padding: '12px 24px', display: 'flex', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ width: 12, height: 12, borderRadius: 50, background: '#ff5f56' }} />
                                <div style={{ width: 12, height: 12, borderRadius: 50, background: '#ffbd2e' }} />
                                <div style={{ width: 12, height: 12, borderRadius: 50, background: '#27c93f' }} />
                             </div>
                             <div style={{ 
                                width: '100%', height: 600, borderRadius: 24, 
                                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden', position: 'relative'
                            }}>
                                <div style={{ textAlign: 'center', opacity: 0.1, transform: 'scale(1.5)' }}>
                                    <Shield size={400} />
                                </div>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <p style={{ fontSize: 24, fontWeight: 300, color: '#6366f1', letterSpacing: 4, textTransform: 'uppercase' }}>System Ready</p>
                                </div>
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
                        <div style={{ color: '#818cf8', marginBottom: 24 }}><Eye size={40} /></div>
                        <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Live 360 Oversight</h3>
                        <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 17 }}>Real-time spatial visualization of every SOS, incident, and staff location on one map.</p>
                    </div>
                    <div className="modern-card">
                        <div style={{ color: '#10b981', marginBottom: 24 }}><Users size={40} /></div>
                        <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Volunteer Mesh</h3>
                        <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 17 }}>Instantly deploy crowdsourced safety personnel through our trust-mapped network.</p>
                    </div>
                    <div className="modern-card">
                        <div style={{ color: '#f59e0b', marginBottom: 24 }}><Bell size={40} /></div>
                        <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Dynamic Radius</h3>
                        <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 17 }}>Geo-fenced broadcasting ensures the right people get the right alerts at exactly the right time.</p>
                    </div>
                    <div className="modern-card">
                        <div style={{ color: '#ef4444', marginBottom: 24 }}><Lock size={40} /></div>
                        <h3 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>Protocol Zero</h3>
                        <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 17 }}>Encrypted data pipelines ensure mission-critical communication remains tamper-proof.</p>
                    </div>
                </div>
            </section>

            <footer style={{ padding: '120px 80px 60px', background: '#010409', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 80 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <Eye color="#4F46E5" size={32} />
                            <span style={{ fontSize: 28, fontWeight: 900 }}>OwlEye</span>
                        </div>
                        <p style={{ color: '#475569', fontSize: 16, maxWidth: 350 }}>Redefining event safety architecture through intelligence and empathy.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 100 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <b style={{ color: '#94a3b8' }}>Solutions</b>
                            <span style={{ color: '#475569', fontSize: 15 }}>Festivals</span>
                            <span style={{ color: '#475569', fontSize: 15 }}>Conferences</span>
                            <span style={{ color: '#475569', fontSize: 15 }}>Public Venues</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <b style={{ color: '#94a3b8' }}>Organization</b>
                            <span style={{ color: '#475569', fontSize: 15 }}>About Us</span>
                            <span style={{ color: '#475569', fontSize: 15 }}>Safety Standards</span>
                            <span style={{ color: '#475569', fontSize: 15 }}>Contact</span>
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: 40, color: '#334155', fontSize: 13 }}>
                    © 2026 OwlEye Global Systems.
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
