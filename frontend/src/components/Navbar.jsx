import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, ArrowRight } from 'lucide-react';
import { isAuthenticated, getRole } from '../utils/auth';

const Navbar = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const isAuth = isAuthenticated();
    
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleCTA = () => {
        if (isAuth) {
            const role = getRole();
            navigate(`/${role}/dashboard`);
        } else {
            navigate('/register');
        }
    };

    const s = {
        nav: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: scrolled ? '15px 40px' : '25px 40px',
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
        inner: {
            maxWidth: 1200,
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        logo: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            color: '#fff',
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            transition: 'transform 0.3s ease'
        },
        btnNavPrimary: {
            padding: '14px 34px',
            borderRadius: 100,
            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.5)',
        }
    };

    return (
        <>
            <style>{`
                .nav-item { 
                    color: #94a3b8; 
                    font-weight: 600; 
                    text-decoration: none; 
                    transition: all 0.3s; 
                    position: relative;
                    font-size: 15px;
                }
                .nav-item:hover { color: #fff; }
                .nav-item:after {
                    content: ''; position: absolute; bottom: -5px; left: 0; width: 0; height: 2px;
                    background: #6366f1; transition: width 0.3s;
                }
                .nav-item:hover:after { width: 100%; }

                .glow-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 30px -5px rgba(79, 70, 229, 0.6) !important;
                }
            `}</style>
            
            <nav style={s.nav}>
                <div style={s.inner}>
                    <Link to="/" style={s.logo} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        <img src="/assets/OwlEye_LOGO.jpeg" alt="OwlEye Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
                        OwlEye
                    </Link>
                    
                    <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
                        <Link to="/platform" className="nav-item">Platform</Link>
                        <Link to="/safety-network" className="nav-item">Safety Network</Link>
                        <Link to="/enterprise" className="nav-item">Enterprise</Link>
                        <button 
                            onClick={() => navigate('/login')}
                            className="glow-btn"
                            style={s.btnNavPrimary}
                        >
                            Sign In
                        </button>
                        <button 
                            onClick={handleCTA}
                            className="glow-btn"
                            style={{ padding: '14px 34px', borderRadius: 100, background: '#fff', color: '#000', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', transition: 'all 0.3s' }}
                        >
                            Join Now
                        </button>
                    </div>
                </div>
            </nav>
        </>
    );
};

export default Navbar;
