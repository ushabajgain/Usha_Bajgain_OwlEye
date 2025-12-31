import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import C from '../utils/colors';
import { Bell, Info, AlertTriangle, Shield, CheckCircle, Clock } from 'lucide-react';
import { useSafety } from '../context/SafetySocketContext';
import { getRole, getUserId } from '../utils/auth';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const NotificationsPage = () => {
    const { 
        incidents, sosAlerts, safetyAlerts, 
        notifications, unreadCount, markAsRead 
    } = useSafety();

    const [displayList, setDisplayList] = useState([]);

    useEffect(() => {
        const list = [];
        const role = getRole();
        const userId = getUserId();

        // 1. SOS Alerts from WebSocket (Real-time live context)
        Object.values(sosAlerts).forEach(s => {
            const isMine = Number(s.user_id) === Number(userId);
            const isAssignedToMe = Number(s.assigned_volunteer_id) === Number(userId);

            if (role === 'organizer' || role === 'admin' || isMine || isAssignedToMe) {
                list.push({
                    id: `active-sos-${s.id}`,
                    type: 'sos',
                    isLive: true,
                    title: isMine ? '🆘 YOUR SOS STATUS' : '🆘 SOS SIGNAL DETECTED',
                    body: isMine 
                        ? (s.status === 'responder_acknowledged' 
                            ? `Help is on the way! ${s.assigned_volunteer_name || 'A responder'} is coming.` 
                            : "Your SOS has been broadcast to all safety staff.")
                        : `${s.user_name} is in emergency at ${s.location_name || 'Unknown Location'}.`,
                    time: 'active',
                    read: false
                });
            }
        });

        // 2. Persistent Notifications from DB
        notifications.forEach(n => {
            list.push({
                id: n.id,
                dbId: n.id,
                type: n.notification_type,
                isLive: false,
                title: n.title,
                body: n.message,
                time: n.created_at_display || 'Recently',
                read: n.is_read
            });
        });

        setDisplayList(list);
    }, [incidents, sosAlerts, safetyAlerts, notifications]);

    const handleMarkAll = async () => {
        try {
            await api.post('/monitoring/notifications/mark_all_read/');
            // No need to set state manually, context will refresh or we can refresh it
            window.location.reload();
        } catch (err) { }
    };

    const getIcon = (type) => {
        switch(type) {
            case 'sos': return <AlertTriangle size={18} color="#ef4444" />;
            case 'incident': return <Info size={18} color="#f59e0b" />;
            case 'assignment': return <Shield size={18} color={ACCENT} />;
            case 'broadcast': return <Zap size={18} color="#4f46e5" />;
            default: return <Bell size={18} color={TEXT_MID} />;
        }
    };

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px', maxWidth: 800 },
        card: (read, isLive) => ({
            background: isLive ? '#fff1f2' : CARD_BG, 
            borderRadius: 12, padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
            border: isLive ? '1.5px solid #fda4af' : `1px solid ${read ? BORDER : ACCENT}`,
            marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center',
            cursor: !read ? 'pointer' : 'default', transition: '0.2s transform'
        }),
        unreadDot: { width: 8, height: 8, borderRadius: '50%', background: ACCENT },
        emptyState: {
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '80px 40px', textAlign: 'center', background: '#fff', borderRadius: 16,
            border: `1px dashed ${BORDER}`, marginTop: 24
        }
    };

    return (
        <div style={s.container}>
            <Sidebar active="notifications" />
            <main style={s.main}>
                <PageHeader title="All Notifications" breadcrumb="User" />

                <div style={s.content}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h3 style={{ margin: 0, color: TEXT_DARK, fontSize: 20 }}>Your Alert Feed</h3>
                            <p style={{ margin: '4px 0 0', color: TEXT_MID, fontSize: 13 }}>You have {unreadCount} unread messages.</p>
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAll}
                                style={{ background: 'transparent', border: 'none', color: ACCENT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {displayList.length > 0 ? (
                        displayList.map(n => (
                            <div 
                                key={n.id} 
                                style={s.card(n.read, n.isLive)}
                                onClick={() => !n.read && n.dbId && markAsRead(n.dbId)}
                            >
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {getIcon(n.type)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <b style={{ fontSize: 14, color: TEXT_DARK }}>{n.title}</b>
                                        <span style={{ fontSize: 11, color: TEXT_MID }}>{n.time}</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: 13, color: TEXT_MID, lineHeight: 1.4 }}>{n.body}</p>
                                </div>
                                {!n.read && <div style={s.unreadDot}></div>}
                            </div>
                        ))
                    ) : (
                        <div style={s.emptyState}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                <Bell size={32} color="#94A3B8" />
                            </div>
                            <h4 style={{ margin: '0 0 8px', color: TEXT_DARK }}>All Caught Up!</h4>
                            <p style={{ margin: 0, color: TEXT_MID, fontSize: 14 }}>
                                You don't have any notifications right now.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default NotificationsPage;
