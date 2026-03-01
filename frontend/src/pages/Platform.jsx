import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import HomeFooter from '../components/HomeFooter';
import { Map, Zap, Shield, Smartphone, ArrowRight, Layers, Layout, Eye } from 'lucide-react';

const Platform = () => {
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
            padding: '200px 20px 100px',
            textAlign: 'center',
            background: 'radial-gradient(circle at top, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
        },
        featureSection: {
            padding: '100px 20px',
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 80,
            flexDirection: 'row',
        },
        featureContent: {
            flex: 1
        },
        featureImage: {
            flex: 1.2,
            height: 450,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 40,
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)'
        }
    };

    const FeatureRow = ({ title, desc, icon: Icon, color, reverse, children }) => (
        <section style={{ ...s.featureSection, flexDirection: reverse ? 'row-reverse' : 'row' }}>
            <div style={s.featureContent}>
                <div style={{ background: color, width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, boxShadow: `0 20px 40px -10px ${color}66` }}>
                    <Icon color="#fff" size={28} />
                </div>
                <h2 style={{ fontSize: 44, fontWeight: 900, marginBottom: 24, letterSpacing: '-0.02em' }}>{title}</h2>
                <p style={{ fontSize: 19, color: '#94a3b8', lineHeight: 1.7, marginBottom: 32 }}>{desc}</p>
            </div>
            <div style={s.featureImage}>
                {children}
            </div>
        </section>
    );

    return (
        <div style={s.container}>
            <Navbar />
            
            <header style={s.hero}>
                <div style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: 100, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 32 }}>
                    Event Safety & Monitoring
                </div>
                <h1 style={{ fontSize: 'clamp(48px, 8vw, 90px)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 24, lineHeight: 1 }}>The Platform.</h1>
                <p style={{ fontSize: 'clamp(18px, 2vw, 24px)', color: '#94a3b8', maxWidth: 800, margin: '0 auto', lineHeight: 1.6 }}>
                    A unified safety architecture designed for event management. We combine spatial intelligence with communication tools to assist in on-site safety operations.
                </p>
            </header>

            <FeatureRow 
                title="Tactical Map" 
                desc="A map engine that provides situational awareness by displaying connected devices, incidents, and SOS reports. Designed for performance across modern web browsers."
                icon={Map}
                color="#6366f1"
            >
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("/assets/tactical_map.png")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            </FeatureRow>

            <FeatureRow 
                title="SOS Reporting" 
                desc="Attendees can access a secure emergency channel to provide their location to security teams. Designed for quick access without requiring external application downloads."
                icon={Smartphone}
                color="#10b981"
                reverse
            >
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("/assets/universal_sos_link.png")', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
            </FeatureRow>

            <FeatureRow 
                title="Real-Time Connectivity" 
                desc="Uses a WebSocket implementation to maintain stable connections for emergency alerts, assisting with reliability in various network environments."
                icon={Zap}
                color="#f59e0b"
            >
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("/assets/Mission Critical Pipes.png")', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
            </FeatureRow>

            <HomeFooter />
        </div>
    );
};

export default Platform;
