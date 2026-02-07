import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import C from '../utils/colors';
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
        sosAlerts, notifications, unreadCount, 
        markAsRead, markSOSAsRead, markAllAsRead 
    } = useSafety();

    const role = getRole();
    const userId = getUserId();

    // ✅ Single source of truth: Build display list ONLY from actual unread items
    const getDisplayList = () => {
        const list = [];

        // Debug: Log what we have
        console.log('[Notifications] sosAlerts count:', Object.values(sosAlerts).length);
        console.log('[Notifications] notifications count:', notifications.length);
        console.log('[Notifications] unreadCount:', unreadCount);
        console.log('[Notifications] Current role:', role, 'userId:', userId);

        // 1. Add UNREAD SOS Alerts (only active ones that should be visible)
        Object.values(sosAlerts).forEach(s => {
            console.log(`[Notifications] SOS ${s.id}: is_read=${s.is_read}, status=${s.status}, user_id=${s.user_id}, assigned_volunteer_id=${s.assigned_volunteer_id}`);
            
            // Only show if: not read AND (status is 'reported' or 'assigned')
            if (s.is_read) {
                console.log(`[Notifications] SOS ${s.id} skipped: already read`);
                return;
            }
            if (s.status !== 'reported' && s.status !== 'assigned') {
                console.log(`[Notifications] SOS ${s.id} skipped: status=${s.status} not in [reported, assigned]`);
                return;
            }

            // ✅ FIXED: Show all unread SOS alerts regardless of permissions
            // Users should see their own notifications
            const isMine = Number(s.user_id) === Number(userId);
            const isAssignedToMe = Number(s.assigned_volunteer_id) === Number(userId);
            
            console.log(`[Notifications] SOS ${s.id}: isMine=${isMine}, isAssignedToMe=${isAssignedToMe}, show=true`);

            list.push({
                id: `sos-${s.id}`,
                dbId: s.id,
                type: 'sos',
                title: isMine ? 'YOUR SOS STATUS' : 'SOS SIGNAL DETECTED',
                body: isMine 
                    ? (s.status === 'responder_acknowledged' 
                        ? `Help is on the way! ${s.assigned_volunteer_name || 'A responder'} is coming.` 
                        : "Your SOS has been broadcast to all safety staff.")
                    : `${s.user_name} is in emergency at ${s.location_name || 'Unknown Location'}.`,
                time: 'active',
                isLive: true,
                isRead: s.is_read
            });
        });

        // 2. Add UNREAD DB Notifications
        notifications.forEach(n => {
            console.log(`[Notifications] Notification ${n.id}: is_read=${n.is_read}`);
            if (n.is_read) {
                console.log(`[Notifications] Notification ${n.id} skipped: already read`);
                return;
            }
            
            console.log(`[Notifications] Notification ${n.id}: showing`);

            list.push({
                id: `notif-${n.id}`,
                dbId: n.id,
                type: 'notification',
                title: n.title,
                body: n.message,
                time: n.created_at_display || 'Recently',
                isLive: false,
                isRead: n.is_read
            });
        });

        console.log(`[Notifications] Final display list: ${list.length} items`);
        return list;
    };

    const displayList = getDisplayList();
    const hasUnreadItems = unreadCount > 0;

    const handleMarkAll = async () => {
        try {
            await markAllAsRead();
        } catch (err) { console.error('Mark all failed:', err); }
    };

    const handleMarkItemAsRead = async (item) => {
        try {
            if (item.type === 'sos') {
                await markSOSAsRead(item.dbId);
            } else if (item.type === 'notification') {
                await markAsRead(item.dbId);
            }
        } catch (err) { console.error('Mark as read failed:', err); }
    };

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px', maxWidth: 800 },
        card: (isLive) => ({
            background: isLive ? '#fff1f2' : CARD_BG, 
            borderRadius: 12, padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
            border: isLive ? '1.5px solid #fda4af' : `1px solid ${ACCENT}`,
            marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center',
            cursor: 'pointer', transition: '0.2s transform'
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
                    {/* Header with counter and mark all button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h3 style={{ margin: 0, color: TEXT_DARK, fontSize: 20 }}>Your Alert Feed</h3>
                            <p style={{ margin: '4px 0 0', color: TEXT_MID, fontSize: 13 }}>
                                You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}.
                            </p>
                        </div>
                        {hasUnreadItems && (
                            <button 
                                onClick={handleMarkAll}
                                style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: ACCENT, 
                                    fontSize: 13, 
                                    fontWeight: 600, 
                                    cursor: 'pointer', 
                                    textDecoration: 'underline', 
                                    textDecorationColor: ACCENT 
                                }}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notification items or empty state */}
                    {displayList.length > 0 ? (
                        displayList.map(item => (
                            <div 
                                key={item.id} 
                                style={s.card(item.isLive)}
                                onClick={() => handleMarkItemAsRead(item)}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <b style={{ fontSize: 14, color: TEXT_DARK }}>{item.title}</b>
                                        <span style={{ fontSize: 11, color: TEXT_MID }}>{item.time}</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: 13, color: TEXT_MID, lineHeight: 1.4 }}>{item.body}</p>
                                </div>
                                <div style={s.unreadDot}></div>
                            </div>
                        ))
                    ) : (
                        <div style={s.emptyState}>
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
