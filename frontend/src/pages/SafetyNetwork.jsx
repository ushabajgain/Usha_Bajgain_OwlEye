import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HomeFooter from '../components/HomeFooter';
import { Users, ShieldCheck, Share2, Network, MessageSquare, Activity, UserPlus, Heart, Sparkles, Plus } from 'lucide-react';

const SafetyNetwork = () => {
    const navigate = useNavigate();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const s = {
        container: {
            fontFamily: "'Outfit', 'Inter', sans-serif",
            color: '#fff',
            background: '#020617',
            minHeight: '100vh',
        },
        hero: {
            padding: '240px 20px 160px',
            textAlign: 'center',
            background: 'linear-gradient(to bottom, #020617, #0a0f1e)',
            position: 'relative',
            overflow: 'hidden'
        },
        glow: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 800,
            height: 800,
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
        },
        processSection: {
            padding: '120px 20px',
            maxWidth: 1000,
            margin: '0 auto',
            position: 'relative'
        },
        step: {
            display: 'flex',
            gap: 60,
            marginBottom: 100,
            alignItems: 'center'
        },
        stepNumber: {
            fontSize: 120,
            fontWeight: 900,
            lineHeight: 0.8,
            color: 'rgba(16, 185, 129, 0.15)',
            WebkitTextStroke: '1px rgba(16, 185, 129, 0.2)',
            userSelect: 'none'
        }
    };

    return (
        <div style={s.container}>
            <Navbar />
            
            <header style={s.hero}>
                <div style={s.glow} />
                <div style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: 100, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 32, position: 'relative' }}>
                    Network Operations
                </div>
                <h1 style={{ fontSize: 'clamp(48px, 8vw, 84px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 24, position: 'relative', lineHeight: 1 }}>Safety Network.</h1>
                <p style={{ fontSize: 'clamp(18px, 2vw, 24px)', color: '#94a3b8', maxWidth: 850, margin: '0 auto', position: 'relative', lineHeight: 1.6 }}>
                    A system for connecting on-site personnel and safety teams. Our platform assists in managing personnel to provide coverage across event venues.
                </p>
            </header>

            <section style={s.processSection}>
                <div style={s.step}>
                    <div style={s.stepNumber}>01</div>
                    <div>
                        <h3 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20 }}>Verification</h3>
                        <p style={{ fontSize: 18, color: '#64748b', lineHeight: 1.7 }}>
                            Personnel can be verified and managed within the system. We provide tools to map skills and roles to ensure appropriate coverage for various event needs.
                        </p>
                    </div>
                </div>

                <div style={s.step}>
                    <div style={s.stepNumber}>02</div>
                    <div>
                        <h3 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20 }}>Situational Awareness</h3>
                        <p style={{ fontSize: 18, color: '#64748b', lineHeight: 1.7 }}>
                            Our network assists in providing venue coverage through personnel who can report observations and environmental changes in real-time.
                        </p>
                    </div>
                </div>

                <div style={s.step}>
                    <div style={s.stepNumber}>03</div>
                    <div>
                        <h3 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20 }}>Issue Reporting</h3>
                        <p style={{ fontSize: 18, color: '#64748b', lineHeight: 1.7 }}>
                            When personnel identify a potential risk, the system provides a channel for reporting to the command center, assisting with situational awareness for event organizers.
                        </p>
                    </div>
                </div>
            </section>

            <div style={{ paddingBottom: 160, textAlign: 'center' }}>
                <div style={{ 
                    display: 'inline-flex', padding: '80px 100px', borderRadius: 48, 
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)', 
                    border: '1px solid rgba(16, 185, 129, 0.15)', 
                    flexDirection: 'column', alignItems: 'center',
                    boxShadow: '0 40px 100px -20px rgba(0,0,0,0.4)'
                }}>
                    <div style={{ 
                        width: 100, height: 100, borderRadius: 24, 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 32,
                        boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.3)'
                    }}>
                        <Plus color="#10b981" size={48} strokeWidth={2.5} />
                    </div>
                    <h2 style={{ fontSize: 42, fontWeight: 900, marginBottom: 16, letterSpacing: '-0.02em' }}>Involved in safety?</h2>
                    <p style={{ color: '#94a3b8', fontSize: 20, marginBottom: 40, maxWidth: 450 }}>Join our network of safety personnel and assist in making events a safer space for attendees.</p>
                    <button 
                        onClick={() => navigate('/register')}
                        style={{ padding: '20px 56px', borderRadius: 100, background: '#10b981', color: '#fff', border: 'none', fontWeight: 800, fontSize: 18, cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.4)' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 30px 60px -10px rgba(16, 185, 129, 0.6)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(16, 185, 129, 0.4)'; }}
                    >
                        Register Here
                    </button>
                </div>
            </div>

            <HomeFooter />
        </div>
    );
};

export default SafetyNetwork;
