import React, { useState, useMemo } from 'react';
import { Bell, Settings, ChevronDown, ShieldAlert, CheckCircle, Info, X } from 'lucide-react';
import { getFullName, getRole } from '../utils/auth';
import { useSafetySocket } from '../hooks/useSafetySocket';

const Header = ({ breadcrumb, title, actions }) => {
    const fullName = getFullName() || 'User';
    const userRole = getRole() || 'attendee';
    const { notifications, unreadCount, markAsRead, loadMoreNotifications, hasMoreNotifs } = useSafetySocket('1');
    const [showNotif, setShowNotif] = useState(false);
    const [tab, setTab] = useState('all'); // all, sos, tasks, system

    const filteredNotifs = useMemo(() => {
        if (!notifications) return [];
        if (tab === 'sos') return notifications.filter(n => n.notification_type === 'sos' || n.notification_type === 'incident' || n.priority === 'critical');
        if (tab === 'tasks') return notifications.filter(n => n.notification_type === 'assignment');
        if (tab === 'system') return notifications.filter(n => n.notification_type === 'system' || n.notification_type === 'broadcast');
        return notifications;
    }, [notifications, tab]);

    const HEADER_BG = '#1a2a4a';
    const TEXT = 'rgba(255,255,255,0.85)';

    return (
        <header style={{
            height: 56, padding: '0 28px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', background: HEADER_BG,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0,
            zIndex: 100, fontFamily: "'Inter','Segoe UI',sans-serif",
        }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.03em', margin: 0 }}>
                {title || breadcrumb}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {actions}

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

                <button 
                    onClick={() => setShowNotif(!showNotif)}
                    style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: showNotif ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)', color: TEXT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <Bell size={16} />
                    {unreadCount > 0 && (
                        <span style={{ 
                            position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, 
                            background: '#ef4444', borderRadius: 8, border: `2px solid ${HEADER_BG}`,
                            color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', padding: '0 4px'
                        }}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {showNotif && (
                    <div style={{ position: 'absolute', top: 60, right: 180, width: 380, background: '#fff', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 500 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Notifications</h3>
                            <button onClick={() => setShowNotif(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="#64748b" /></button>
                        </div>
                        
                        <div style={{ display: 'flex', padding: '10px 20px', gap: 12, borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'sos', label: 'Emergency' },
                                { id: 'tasks', label: 'Tasks' },
                                { id: 'system', label: 'System' }
                            ].map(t => (
                                <button key={t.id} onClick={() => setTab(t.id)} style={{ border: 'none', background: tab === t.id ? '#eff6ff' : 'transparent', color: tab === t.id ? '#2563eb' : '#64748b', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 20, cursor: 'pointer' }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
                            {filteredNotifs.length === 0 ? (
                                <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>No notifications found.</p>
                            ) : (
                                filteredNotifs.map(n => (
                                    <div key={n.id} 
                                        onClick={() => !n.is_read && markAsRead(n.id)}
                                        style={{ 
                                            padding: '12px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                                            background: n.is_read ? 'transparent' : '#f0fdf4',
                                            borderLeft: n.priority === 'critical' ? '4px solid #ef4444' : (n.is_read ? '4px solid transparent' : '4px solid #22c55e'),
                                            display: 'flex', gap: 12, alignItems: 'flex-start',
                                            transition: 'background 0.2s'
                                        }}>
                                        <div style={{ marginTop: 2 }}>
                                            {n.notification_type === 'sos' ? <ShieldAlert size={18} color="#ef4444" /> : 
                                             n.notification_type === 'assignment' ? <CheckCircle size={18} color="#2563eb" /> : 
                                             <Info size={18} color="#64748b" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: n.is_read ? 600 : 800, color: '#0f172a' }}>{n.title}</p>
                                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.4 }}>{n.message}</p>
                                            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{n.created_at_display || 'Just now'}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                            {hasMoreNotifs && (
                                <button
                                    onClick={loadMoreNotifications}
                                    style={{ width: '100%', padding: '12px', background: '#f8fafc', border: 'none', borderTop: '1px solid #e2e8f0', color: '#2563eb', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'block', textAlign: 'center' }}>
                                    Load more...
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <button style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: TEXT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Settings size={16} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', position: 'relative' }}>
                        {fullName.charAt(0).toUpperCase()}
                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, background: '#22c55e', borderRadius: '50%', border: '2px solid #1a2a4a' }} />
                    </div>
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>{fullName}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'capitalize' }}>{userRole}</p>
                    </div>
                    <ChevronDown size={12} color="rgba(255,255,255,0.4)" />
                </div>
            </div>
        </header>
    );
};

export default Header;
