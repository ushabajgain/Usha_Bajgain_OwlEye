import React from 'react';
import C from '../utils/colors';

const Footer = () => {
    return (
        <footer style={{ 
            padding: '24px 32px', 
            borderTop: `1px solid ${C.border}`, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: 12, 
            color: C.textSecondary, 
            fontWeight: 600,
            background: 'transparent',
            marginTop: 'auto'
        }}>
            <span>Copyright © 2026 OwlEye Events</span>
            <div style={{ display: 'flex', gap: 24 }}>
                <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = C.primary} onMouseOut={e => e.target.style.color = C.textSecondary}>Privacy Policy</span>
                <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = C.primary} onMouseOut={e => e.target.style.color = C.textSecondary}>Term and conditions</span>
                <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = C.primary} onMouseOut={e => e.target.style.color = C.textSecondary}>Contact</span>
            </div>
        </footer>
    );
};

export default Footer;
