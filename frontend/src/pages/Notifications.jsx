import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import C from '../utils/colors';
import { useSafety } from '../context/SafetySocketContext';
import { getRole, getUserId } from '../utils/auth';
import { 
    getIntentStyle,
    NOTIFICATION_INTENT 
} from '../utils/notificationHelper';
import { Loader2, AlertCircle } from 'lucide-react';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const styles = {
    container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
    main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
    content: { padding: '24px 32px', maxWidth: 800 },
    card: (intent) => {
        const style = getIntentStyle(intent);
        return {
            background: style.backgroundColor, 
            borderRadius: 12, padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
            border: `1.5px solid ${style.borderColor}`,
            marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center',
            cursor: 'pointer', transition: '0.2s transform'
        };
    },
    unreadDot: (intent) => {
        const style = getIntentStyle(intent);
        return { width: 8, height: 8, borderRadius: '50%', background: style.dotColor };
    },
    title: (intent) => {
        const style = getIntentStyle(intent);
        return { fontSize: 14, fontWeight: 700, color: style.titleColor };
    },
    emptyState: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 40px', textAlign: 'center', background: '#fff', borderRadius: 16,
        border: `1px dashed ${BORDER}`, marginTop: 24
    },
    loadingState: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 40px', textAlign: 'center', background: '#fff', borderRadius: 16,
        marginTop: 24
    },
    errorState: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 40px', textAlign: 'center', background: '#fff', borderRadius: 16,
        border: '1px solid #fecaca', marginTop: 24
    }
};

const NotificationsPage = () => {
    const navigate = useNavigate();
    const { 
        displayNotifications, unreadCount, 
        markAsRead, markSOSAsRead, markAllAsRead, loading: contextLoading, 
        loadMoreNotifications, hasMoreNotifs 
    } = useSafety();

    const role = getRole();
    const userId = getUserId();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');

    // ✅ FIX: Use displayNotifications from context (single source of truth)
    // Context already runs the pipeline once, no need to duplicate here
    const displayList = useMemo(() => {
        try {
            console.log('[Notifications] displayNotifications input:', displayNotifications.length, displayNotifications);
            const mapped = (displayNotifications || []).map(n => ({
                compositeId: n.compositeId || `${n.type}-${n.id}`,
                dbId: n.dbId,
                type: n.type,
                title: n.displayTitle || n.title,
                body: n.displayMessage || n.message,
                time: n.type === 'sos' ? 'active' : (n.created_at_display || 'Recently'),
                isLive: n.isLive || false,
                isRead: n.is_read,
                intent: n.intent
            }));
            console.log('[Notifications] displayList mapped:', mapped.length, mapped);
            return mapped;
        } catch (err) {
            console.error('[Notifications] Pipeline error:', err);
            setError('Failed to load notifications');
            return [];
        }
    }, [displayNotifications]);

    const filteredList = useMemo(() => {
        switch (filter) {
            case 'unread':
                return displayList.filter(n => !n.isRead);
            case 'sos':
                return displayList.filter(n => n.type === 'sos' || String(n.intent) === 'alert');
            case 'notifications':
                return displayList.filter(n => n.type === 'notification' && String(n.intent) !== 'alert');
            default:
                return displayList;
        }
    }, [displayList, filter]);

    const hasUnreadItems = unreadCount > 0;

    // ✅ FIX: Show button if there are any notifications (regardless of filter)
    // Button only hides when there are truly no items
    const hasItems = displayList.length > 0;

    // Handle initial loading and error state
    useEffect(() => {
        if (!contextLoading) {
            setLoading(false);
        }
    }, [contextLoading]);

    const handleMarkAll = async () => {
        try {
            await markAllAsRead();
        } catch (err) {
            setError('Failed to mark all as read');
        }
    };

    const handleNotificationClick = async (item) => {
        if (item.isRead) return; // Do nothing if already read

        try {
            if (item.type === 'sos') {
                await markSOSAsRead(item.dbId);
            } else if (item.type === 'notification') {
                await markAsRead(item.dbId);
            }
        } catch (err) {
            setError('Failed to mark notification as read');
        }
    };

    return (
        <div style={styles.container}>
            <Sidebar active="notifications" />
            <main style={styles.main}>
                <PageHeader title="All Notifications" breadcrumb="User" />

                <div style={styles.content}>
                    {/* Header with counter and mark all button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h3 style={{ margin: 0, color: TEXT_DARK, fontSize: 20 }}>Your Alert Feed</h3>
                            <p style={{ margin: '4px 0 0', color: TEXT_MID, fontSize: 13 }}>
                                You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}.
                            </p>
                        </div>
                        {hasItems && (
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

                    {/* Filter Tabs */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
                        {[
                            { id: 'all', label: 'All Alerts' },
                            { id: 'unread', label: 'Unread' },
                            { id: 'sos', label: 'SOS', color: '#ef4444' }, // Red for SOS
                            { id: 'notifications', label: 'Incidents', color: '#3b82f6' } // Blue for plain incidents
                        ].map(f => {
                            const isActive = filter === f.id;
                            const activeColor = f.color || ACCENT;
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id)}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: 20,
                                        border: `1.5px solid ${isActive ? activeColor : BORDER}`,
                                        background: isActive ? activeColor : 'transparent',
                                        color: isActive ? '#fff' : TEXT_MID,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        transition: 'all 0.2s ease',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {!isActive && f.color && (
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.color }} />
                                    )}
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div style={styles.loadingState}>
                            <Loader2 size={40} color={ACCENT} style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                            <p style={{ margin: 0, color: TEXT_MID }}>Loading notifications...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div style={styles.errorState}>
                            <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 16 }} />
                            <h4 style={{ margin: '0 0 8px', color: TEXT_DARK }}>Error Loading Notifications</h4>
                            <p style={{ margin: 0, color: TEXT_MID, fontSize: 14 }}>{error}</p>
                            <button 
                                onClick={() => window.location.reload()}
                                style={{ 
                                    marginTop: 16, 
                                    padding: '10px 20px', 
                                    background: ACCENT, 
                                    color: '#fff', 
                                    border: 'none', 
                                    borderRadius: 8, 
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    fontWeight: 600
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Notification items or empty state */}
                    {!loading && !error && (
                        <>
                            {filteredList.length > 0 ? (
                                <>
                                    {filteredList.map(item => (
                                        <div 
                                            key={item.compositeId} 
                                            style={styles.card(item.intent)}
                                            onClick={() => handleNotificationClick(item)}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                    <b style={styles.title(item.intent)}>{item.title}</b>
                                                    <span style={{ fontSize: 11, color: TEXT_MID }}>{item.time}</span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: 13, color: TEXT_MID, lineHeight: 1.4 }}>{item.body}</p>
                                            </div>
                                            {!item.isRead && <div style={styles.unreadDot(item.intent)}></div>}
                                        </div>
                                    ))}
                                    {hasMoreNotifs && (
                                        <button 
                                            onClick={loadMoreNotifications}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: ACCENT + '10',
                                                color: ACCENT,
                                                border: 'none',
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                fontSize: 14,
                                                fontWeight: 600,
                                                marginTop: 8
                                            }}
                                        >
                                            Load More
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div style={styles.emptyState}>
                                    <h4 style={{ margin: '0 0 8px', color: TEXT_DARK }}>All Caught Up!</h4>
                                    <p style={{ margin: 0, color: TEXT_MID, fontSize: 14 }}>
                                        You don't have any notifications right now.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default NotificationsPage;
