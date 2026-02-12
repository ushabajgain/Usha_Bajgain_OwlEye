import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Bell, Settings, Search, Megaphone,
    FileText, LayoutDashboard, BookOpen,
    MoreHorizontal
} from 'lucide-react';
import C from '../utils/colors';
import { getFullName, getRole, getProfileImage } from '../utils/auth';

/**
 * PageHeader — reusable top navbar for all pages.
 */
const PageHeader = ({ title, subtitle, breadcrumb, breadcrumbPath = '/organizer/dashboard', actions, notificationBadge = 0 }) => {
    const navigate = useNavigate();
    const fullName = getFullName() || 'User';
    const userRole = getRole() || 'Admin';
    const initials = (fullName || 'User')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    const [showNotif, setShowNotif] = useState(false);
    const notifRef = useRef(null);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotif(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Placeholder for real notification fetching
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                // In a real scenario, we would call our API here
                // const res = await api.get('/monitoring/alerts/');
                // setNotifications(res.data);
                setNotifications([]); // Starting empty as requested (no mockup)
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };
        fetchNotifications();
    }, []);



    const s = {
        header: {
            background: '#F8FAFC',
            borderBottom: `1px solid ${C.border}`,
            padding: '0 32px',
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            fontFamily: "'Inter','Segoe UI',sans-serif",
        },
        titlePart: { display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: 0 },
        titleText: {
            fontSize: 22,
            fontWeight: 800,
            color: C.textPrimary,
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: '-0.02em'
        },
        subtitleText: {
            fontSize: 12,
            color: C.textSecondary,
            margin: 0,
            marginBottom: 4,
            fontWeight: 600,
            letterSpacing: '0.01em'
        },
        breadcrumb: {
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 4,
            fontSize: 11,
            fontWeight: 600,
            color: C.primary,
            textDecoration: 'none'
        },
        actionsRight: {
            display: 'flex',
            alignItems: 'center',
            gap: 12
        },
        circleBtn: {
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: C.navy,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: 'transform 0.1s, opacity 0.1s',
        },
        badge: {
            position: 'absolute',
            top: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#0EA5E9', // Sky blue like the picture
            border: '1.5px solid #F8FAFC',
        },
        divider: {
            width: 1,
            height: 32,
            background: C.border,
            margin: '0 8px'
        },
        profile: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingLeft: 4
        },
        avatar: {
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: C.navy,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.05em'
        },
        userInfo: {
            display: 'flex',
            flexDirection: 'column'
        },
        userName: {
            fontSize: 14,
            fontWeight: 800,
            color: C.textPrimary,
            margin: 0,
            textTransform: 'uppercase',
            lineHeight: 1.2
        },
        userRole: {
            fontSize: 11,
            color: C.textSecondary,
            margin: 0,
            fontWeight: 500,
            textTransform: 'capitalize'
        },
        notifPop: {
            position: 'absolute',
            top: 52,
            right: 0,
            width: 320,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            border: `1px solid ${C.border}`,
            zIndex: 1000,
            overflow: 'hidden'
        },
        notifHeader: {
            padding: '12px 16px',
            borderBottom: `1px solid ${C.border}`,
            background: '#F8FAFC',
            fontWeight: 700,
            fontSize: 13,
            color: C.textPrimary
        },
        notifEmpty: {
            padding: '30px 20px',
            textAlign: 'center',
            color: C.textSecondary,
            fontSize: 13
        },
        seeAll: {
            padding: '10px',
            textAlign: 'center',
            borderTop: `1px solid ${C.border}`,
            fontSize: 12,
            fontWeight: 700,
            color: C.primary,
            display: 'block',
            textDecoration: 'none',
            background: '#F8FAFC'
        }
    };

    const hasNewNotifs = notificationBadge > 0;

    return (
        <header style={s.header}>
        <div style={s.titlePart}>
                {title.toLowerCase() === 'dashboard' && (
                    <p style={s.subtitleText}>
                        {subtitle || `Hello ${fullName.split(' ')[0]}, welcome back!`}
                    </p>
                )}
                <h1 style={s.titleText}>{title}</h1>
            </div>


            
            <div style={{ flex: 1 }} />

            <div style={s.actionsRight}>
                {/* Bell */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <button
                        style={s.circleBtn}
                        onClick={() => setShowNotif(!showNotif)}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                        <Bell size={18} color="#fff" />
                        {hasNewNotifs && (
                            <div style={{
                                ...s.badge,
                                width: notificationBadge > 9 ? 18 : 16,
                                height: notificationBadge > 9 ? 18 : 16,
                                minWidth: notificationBadge > 9 ? 18 : 16,
                                borderRadius: notificationBadge > 9 ? 8 : '50%',
                                fontSize: notificationBadge > 9 ? 9 : 10,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                border: '1.5px solid #F8FAFC',
                                padding: notificationBadge > 9 ? '2px 4px' : 0
                            }}>
                                {notificationBadge > 9 ? '9+' : notificationBadge}
                            </div>
                        )}
                    </button>

                    {showNotif && (
                        <div style={s.notifPop}>
                            <div style={s.notifHeader}>Recent Notifications</div>
                            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                {notifications.length > 0 ? (
                                    notifications.map(n => (
                                        <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                                            <p style={{ fontSize: 12, margin: 0, fontWeight: 600 }}>{n.title}</p>
                                            <p style={{ fontSize: 11, margin: '4px 0 0', color: C.textSecondary }}>{n.message}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div style={s.notifEmpty}>
                                        <Bell size={24} style={{ opacity: 0.2, marginBottom: 8 }} />
                                        <p style={{ margin: 0 }}>No new notifications</p>
                                    </div>
                                )}
                            </div>
                            <Link to="/notifications" style={s.seeAll} onClick={() => setShowNotif(false)}>
                                See all
                            </Link>
                        </div>
                    )}
                </div>

                {/* Settings */}
                <button
                    style={s.circleBtn}
                    onClick={() => navigate('/settings')}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                    <Settings size={18} color="#fff" />
                </button>

                <div style={s.divider} />

                {/* Profile */}
                <div style={s.profile}>
                    <div style={s.avatar}>
                        {(() => {
                            const img = getProfileImage();
                            if (!img) return initials;
                            const src = img.startsWith('http') ? img : `http://localhost:8000${img}`;
                            return <img src={src} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />;
                        })()}
                    </div>
                    <div style={s.userInfo}>
                        <p style={s.userName}>{fullName}</p>
                        <p style={s.userRole}>{userRole}</p>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes header-pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
                }
            `}</style>
        </header>
    );
};

export default PageHeader;
