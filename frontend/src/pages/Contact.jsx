import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import HomeFooter from '../components/HomeFooter';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const Contact = () => {
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
            padding: '240px 20px 100px',
            textAlign: 'center',
            background: 'linear-gradient(to bottom, #020617, #0a0f1e)',
        },
        section: {
            padding: '40px 20px 160px',
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1.5fr',
            gap: 80
        },
        card: {
            padding: 40,
            borderRadius: 32,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: 24,
            display: 'flex',
            gap: 24,
            alignItems: 'center'
        },
        input: {
            width: '100%',
            padding: '20px 24px',
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#fff',
            fontSize: 16,
            outline: 'none',
            transition: 'border-color 0.3s ease',
            marginBottom: 24,
            fontFamily: 'inherit'
        },
        button: {
            width: '100%',
            padding: '20px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
            color: '#fff',
            border: 'none',
            fontSize: 18,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            transition: 'all 0.3s ease'
        }
    };

    return (
        <div style={s.container}>
            <Navbar />
            
            <header style={s.hero}>
                <div style={{ display: 'inline-flex', padding: '8px 24px', borderRadius: 100, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 32 }}>
                    We are here to help!
                </div>
                <h1 style={{ fontSize: 'clamp(48px, 8vw, 84px)', fontWeight: 900, marginBottom: 24, letterSpacing: '-0.04em', lineHeight: 1 }}>Contact Us.</h1>
                <p style={{ fontSize: 24, color: '#94a3b8', maxWidth: 750, margin: '0 auto', lineHeight: 1.6 }}>
                    Let us know how we can best serve you. Use the contact form to email us or select from the topics below that best fit your needs. It's an honor to support you in your journey towards better event safety.
                </p>
            </header>

            <section style={{ ...s.section, gridTemplateColumns: '1fr', maxWidth: 800 }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 60, borderRadius: 40, border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.4)' }}>
                    <input style={s.input} placeholder="Name" />
                    <input style={s.input} placeholder="Email" />
                    <input style={s.input} placeholder="Phone number" />
                    <textarea style={{ ...s.input, minHeight: 150, resize: 'none' }} placeholder="Comment" />
                    <button style={s.button}>
                        SEND MESSAGE <Send size={20} />
                    </button>
                </div>
            </section>

            <HomeFooter />
        </div>
    );
};

export default Contact;
