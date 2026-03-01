import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HomeFooter from '../components/HomeFooter';
import { Building2, ShieldCheck, Zap, BarChart3, Database, Globe, Lock, Cpu, Check } from 'lucide-react';

const Enterprise = () => {
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
            padding: '220px 20px 100px',
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 60
        },
        bentoGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gridTemplateRows: 'repeat(2, 350px)',
            gap: 24,
            maxWidth: 1200,
            margin: '0 auto 160px',
            padding: '0 20px'
        },
        bentoCard: {
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 32,
            padding: 40,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            transition: 'all 0.3s ease',
            cursor: 'default'
        }
    };

    return (
        <div style={s.container}>
            <Navbar />
            
            <header style={{ 
                display: 'flex', 
                gap: 100, 
                alignItems: 'center', 
                padding: '240px 20px 160px', 
                maxWidth: 1200, 
                margin: '0 auto',
                position: 'relative'
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: 100, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 32 }}>
                        Venue Solutions
                    </div>
                    <h1 style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 900, marginBottom: 24, lineHeight: 1.1, letterSpacing: '-0.02em' }}>Scalability for venue ecosystems.</h1>
                    <p style={{ fontSize: 20, color: '#94a3b8', lineHeight: 1.6, marginBottom: 40 }}>OwlEye providing security, scalability, and integration capabilities for venue operators and event management groups.</p>
                    <button 
                        onClick={() => navigate('/contact')}
                        style={{ padding: '18px 40px', borderRadius: 100, background: '#fff', color: '#000', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        Contact Us
                    </button>
                </div>
                <div style={{ flex: 1.2, height: 500, borderRadius: 48, overflow: 'hidden', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.6)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                    <div style={{ width: '100%', height: '100%', backgroundImage: 'url("/assets/venue ecosystem.png")', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                </div>
            </header>

            <div style={s.bentoGrid}>
                {/* Security - 4 columns */}
                <div style={{ ...s.bentoCard, gridColumn: 'span 4', background: 'linear-gradient(to top right, rgba(99, 102, 241, 0.05), transparent)' }}>
                    <Lock color="#6366f1" size={40} style={{ marginBottom: 24 }} />
                    <h3 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Security Infrastructure</h3>
                    <p style={{ color: '#64748b', fontSize: 16 }}>Provides compliance tools, SSO integration (Okta/Azure), and private cloud instances for enterprise needs.</p>
                </div>
                
                {/* Integration - 2 columns */}
                <div style={{ ...s.bentoCard, gridColumn: 'span 2' }}>
                    <Cpu color="#f59e0b" size={40} style={{ marginBottom: 24 }} />
                    <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Platform APIs</h3>
                    <p style={{ color: '#64748b', fontSize: 16 }}>REST and WebSocket APIs for platform connectivity.</p>
                </div>

                {/* Data - 2 columns */}
                <div style={{ ...s.bentoCard, gridColumn: 'span 2', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <Database color="#10b981" size={60} style={{ marginBottom: 24 }} />
                    <h3 style={{ fontSize: 24, fontWeight: 800 }}>Data Residency</h3>
                    <p style={{ color: '#64748b', fontSize: 16 }}>Regional data storage options.</p>
                </div>

                {/* Analytics - 4 columns */}
                <div style={{ ...s.bentoCard, gridColumn: 'span 4', background: 'linear-gradient(to top left, rgba(245, 158, 11, 0.05), transparent)' }}>
                    <BarChart3 color="#f59e0b" size={40} style={{ marginBottom: 24 }} />
                    <h3 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Event Analytics</h3>
                    <p style={{ color: '#64748b', fontSize: 16 }}>Provides metrics into response times, incident density, and staff performance to assist with venue management.</p>
                </div>
            </div>

            <HomeFooter />
        </div>
    );
};

export default Enterprise;
