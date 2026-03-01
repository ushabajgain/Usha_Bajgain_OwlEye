import React from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';

const HomeFooter = () => {
    return (
        <footer style={{ 
            padding: '120px 20px 60px', 
            background: '#000', 
            borderTop: '1px solid rgba(255,255,255,0.05)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <style>{`
                .footer-link {
                    color: #475569;
                    font-size: 15px;
                    text-decoration: none;
                    transition: color 0.3s ease;
                }
                .footer-link:hover {
                    color: #fff;
                }
            `}</style>

            <div style={{ 
                position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
                width: '100%', height: 200, background: 'radial-gradient(ellipse at center, rgba(79, 70, 229, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />

            <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 80 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <img src="/assets/OwlEye_LOGO.jpeg" alt="OwlEye Logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
                            <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>OwlEye</span>
                        </div>
                        <p style={{ color: '#64748b', fontSize: 16, lineHeight: 1.6, maxWidth: 300 }}>
                            Helping you keep everyone safe at your event with smart, reliable technology.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 120 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <b style={{ color: '#fff', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Solutions</b>
                            <Link to="/platform" className="footer-link">Platform</Link>
                            <Link to="/safety-network" className="footer-link">Safety Network</Link>
                            <Link to="/enterprise" className="footer-link">Enterprise</Link>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <b style={{ color: '#fff', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Company</b>
                            <Link to="/about" className="footer-link">About Us</Link>
                            <Link to="/contact" className="footer-link">Contact</Link>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 40, color: '#475569', fontSize: 13, letterSpacing: '0.02em' }}>
                    © 2026 OwlEye Global Systems. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

export default HomeFooter;
