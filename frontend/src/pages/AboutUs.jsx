import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import HomeFooter from '../components/HomeFooter';
import { Eye, Shield, Users, Globe, Target } from 'lucide-react';

const AboutUs = () => {
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
            position: 'relative'
        },
        section: {
            padding: '120px 20px',
            maxWidth: 1200,
            margin: '0 auto'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 40,
            marginTop: 80
        },
        card: {
            padding: 48,
            borderRadius: 32,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            transition: 'all 0.3s ease'
        }
    };

    return (
        <div style={s.container}>
            <Navbar />
            
            <header style={s.hero}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: 100, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 32, position: 'relative' }}>
                    Corporate Profile
                </div>
                <h1 style={{ fontSize: 'clamp(48px, 8vw, 84px)', fontWeight: 900, marginBottom: 24, letterSpacing: '-0.04em', lineHeight: 1 }}>Our Mission.</h1>
                <p style={{ fontSize: 24, color: '#94a3b8', maxWidth: 850, margin: '0 auto', lineHeight: 1.6, position: 'relative' }}>
                    To provide infrastructure for event safety, assisting organizers in managing on-site security and communication.
                </p>
            </header>

            <section style={s.section}>
                <div style={{ display: 'flex', gap: 80, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 42, fontWeight: 800, marginBottom: 32 }}>The OwlEye Story</h2>
                        <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.8, marginBottom: 24 }}>
                            OwlEye was established to address communication gaps in event security management. We identified opportunities to use technology, such as real-time mapping and personnel coordination, to assist with event safety. By unifying separate tools into a single interface, we provide security teams with a clear overview of their operations.
                        </p>
                        <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.8, marginBottom: 24 }}>
                            Our vision is to provide tools that assist venue operators and event groups in their safety operations. We focus on assisting with situational awareness through data and connectivity, allowing organizers to better understand on-site dynamics as they happen.
                        </p>
                        <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.8 }}>
                            OwlEye is currently used by organizers to coordinate personnel and manage incidents. We continue to develop the platform based on feedback from security professionals in the field.
                        </p>
                    </div>
                    <div style={{ flex: 1, height: 500, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 48, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Eye size={200} color="#6366f1" style={{ opacity: 0.1 }} />
                         <div style={{ position: 'absolute', width: 300, textAlign: 'center' }}>
                            <p style={{ fontSize: 12, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', color: '#6366f1', marginBottom: 8 }}>Established</p>
                            <p style={{ fontSize: 64, fontWeight: 900 }}>2024</p>
                         </div>
                    </div>
                </div>

                <div style={s.grid}>
                    <div style={s.card}>
                        <Shield color="#6366f1" size={40} style={{ marginBottom: 24 }} />
                        <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Safety First</h3>
                        <p style={{ color: '#64748b', fontSize: 16, lineHeight: 1.6 }}>We believe safety is a fundamental right. Every feature we build is designed to protect lives.</p>
                    </div>
                    <div style={s.card}>
                        <Users color="#6366f1" size={40} style={{ marginBottom: 24 }} />
                        <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Community</h3>
                        <p style={{ color: '#64748b', fontSize: 16, lineHeight: 1.6 }}>Our network is powered by people. We empower volunteers and staff to act as guardians.</p>
                    </div>
                    <div style={s.card}>
                        <Globe color="#6366f1" size={40} style={{ marginBottom: 24 }} />
                        <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Global Reach</h3>
                        <p style={{ color: '#64748b', fontSize: 16, lineHeight: 1.6 }}>From local festivals to global summits, we are built to scale to any size, anywhere.</p>
                    </div>
                </div>
            </section>

            <HomeFooter />
        </div>
    );
};

export default AboutUs;
