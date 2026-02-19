import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import C from '../utils/colors';
import { useSafety } from '../context/SafetySocketContext';
import { getRole, getUserId } from '../utils/auth';
import api from '../utils/api';
import { 
    AlertCircle, Clock, MapPin, Navigation, 
    CheckCircle, Play, Loader2, Siren, Activity,
    Phone, AlertTriangle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// COLOR SCHEME
// ═══════════════════════════════════════════════════════════════════════════
const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const DANGER = '#EF4444';
const WARNING = '#F59E0B';
const SUCCESS = '#10B981';
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = {
    container: { 
        display: 'flex', 
        minHeight: '100vh', 
        background: CONTENT_BG 
    },
    main: { 
        flex: 1, 
        marginLeft: 230, 
        display: 'flex', 
        flexDirection: 'column' 
    },
    content: { 
        padding: '24px 32px', 
        flex: 1,
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%'
    },
    
    sosCard: (status) => {
        let borderColor = BORDER;
        let bgColor = CARD_BG;
        
        if (status === 'reported') {
            borderColor = DANGER;
            bgColor = '#FEF2F2';
        } else if (status === 'assigned') {
            borderColor = WARNING;
            bgColor = '#FFFBEB';
        }
        
        return {
            background: bgColor,
            border: `2px solid ${borderColor}`,
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            transition: '0.2s ease'
        };
    },
    
    sosHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottom: `1px solid ${BORDER}`
    },
    
    sosTitle: {
        fontSize: 18,
        fontWeight: 700,
        color: TEXT_DARK,
        display: 'flex',
        alignItems: 'center',
        gap: 8
    },
    
    sosDetails: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginBottom: 16
    },
    
    detailRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12
    },
    
    detailIcon: {
        width: 20,
        height: 20,
        flexShrink: 0,
        color: TEXT_MID,
        marginTop: 2
    },
    
    detailLabel: {
        fontSize: 12,
        fontWeight: 600,
        color: TEXT_MID,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    
    detailValue: {
        fontSize: 14,
        fontWeight: 500,
        color: TEXT_DARK,
        marginTop: 4
    },
    
    actionBar: {
        display: 'flex',
        gap: 12,
        alignItems: 'center'
    },
    
    button: (variant = 'primary') => {
        const baseStyle = {
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: '0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 8
        };
        
        if (variant === 'primary') {
            return {
                ...baseStyle,
                background: ACCENT,
                color: 'white',
                '&:hover': { background: '#5B5BFF' }
            };
        } else if (variant === 'success') {
            return {
                ...baseStyle,
                background: SUCCESS,
                color: 'white'
            };
        } else if (variant === 'danger') {
            return {
                ...baseStyle,
                background: DANGER,
                color: 'white'
            };
        } else if (variant === 'secondary') {
            return {
                ...baseStyle,
                background: 'transparent',
                border: `1px solid ${BORDER}`,
                color: TEXT_MID
            };
        }
    },
    
    statusBadge: (status) => {
        let bg, text;
        if (status === 'reported') {
            bg = DANGER;
            text = 'white';
        } else if (status === 'assigned') {
            bg = WARNING;
            text = 'white';
        } else if (status === 'in-progress' || status === 'acknowledged') {
            bg = '#3B82F6';
            text = 'white';
        } else if (status === 'resolved') {
            bg = SUCCESS;
            text = 'white';
        }
        
        return {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            background: bg,
            color: text
        };
    },
    
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 40px',
        textAlign: 'center',
        background: CARD_BG,
        borderRadius: 16,
        border: `2px dashed ${BORDER}`,
        marginTop: 40
    },
    
    loadingState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 40px',
        textAlign: 'center'
    },
    
    errorState: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        padding: '20px 24px',
        background: '#FEF2F2',
        border: `2px solid ${DANGER}`,
        borderRadius: 12,
        marginBottom: 24
    }
};

import { useFeedback } from '../context/FeedbackContext';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: VOLUNTEER SOS ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════
const VolunteerSOS = () => {
    const { showToast, confirmAction } = useFeedback();
    const navigate = useNavigate();
    const { sosAlerts, loading: contextLoading } = useSafety();
    
    const userId = parseInt(getUserId());
    const role = getRole();
    
    // UI state
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState(null);

    // ───────────────────────────────────────────────────────────────────────
    // ✅ CRITICAL: Filter SOS assigned to THIS volunteer + active status
    // ───────────────────────────────────────────────────────────────────────
    const assignedSOS = useMemo(() => {
        const active = Object.values(sosAlerts || {})
            .filter(sos => {
                // Must be assigned to current volunteer
                // Handle both API field name (assigned_volunteer) and WS field name (assigned_volunteer_id)
                const volunteerId = sos.assigned_volunteer_id || sos.assigned_volunteer;
                const isAssignedToMe = parseInt(volunteerId) === userId;
                
                // Must be active (not resolved)
                const isActive = sos.status !== 'resolved' && sos.status !== 'cancelled';
                
                return isAssignedToMe && isActive;
            })
            .sort((a, b) => {
                // Sort by creation time (newest first)
                return new Date(b.created_at) - new Date(a.created_at);
            });

        console.log(`[VolunteerSOS] Filtered: ${Object.keys(sosAlerts || {}).length} total SOS → ${active.length} assigned to volunteer ${userId}`);
        return active;
    }, [sosAlerts, userId]);

    // ───────────────────────────────────────────────────────────────────────
    // HANDLERS
    // ───────────────────────────────────────────────────────────────────────
    
    const handleAccept = useCallback(async (sosId) => {
        setProcessingId(sosId);
        setError(null);
        
        try {
            await api.post(`/monitoring/sos/${sosId}/accept/`);
            showToast('SOS Accepted! Proceed to location.');
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to accept SOS';
            showToast(msg, 'error');
        } finally {
            setProcessingId(null);
        }
    }, []);

    const handleMarkInProgress = useCallback(async (sosId) => {
        setProcessingId(sosId);
        setError(null);
        
        try {
            await api.patch(`/monitoring/sos/${sosId}/`, {
                status: 'in_progress'
            });
            showToast('SOS marked as in-progress.');
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update status';
            showToast(msg, 'error');
        } finally {
            setProcessingId(null);
        }
    }, []);

    const handleResolve = useCallback(async (sosId) => {
        confirmAction({
            title: "Resolve SOS",
            message: "Mark this SOS as resolved? Ensure the attendee is safe.",
            onConfirm: async () => {
                setProcessingId(sosId);
                setError(null);
                
                try {
                    await api.patch(`/monitoring/sos/${sosId}/`, {
                        status: 'resolved',
                        resolved_at: new Date().toISOString()
                    });
                    showToast('SOS resolved. Good job!');
                } catch (err) {
                    const msg = err.response?.data?.message || 'Failed to resolve SOS';
                    showToast(msg, 'error');
                } finally {
                    setProcessingId(null);
                }
            }
        });
    }, []);

    // ───────────────────────────────────────────────────────────────────────
    // RENDER
    // ───────────────────────────────────────────────────────────────────────
    
    return (
        <div style={styles.container}>
            <Sidebar />
            <div style={styles.main}>
                <PageHeader 
                    title="SOS Alerts" 
                    subtitle={`${assignedSOS.length} active emergency alert${assignedSOS.length !== 1 ? 's' : ''}`}
                />
                
                <div style={styles.content}>
                    {/* Global Error State */}
                    {error && (
                        <div style={styles.errorState}>
                            <AlertCircle size={20} color={DANGER} style={{ flexShrink: 0 }} />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600, color: TEXT_DARK }}>{error}</div>
                                <button 
                                    onClick={() => setError(null)}
                                    style={{ 
                                        marginTop: 8,
                                        padding: '6px 12px',
                                        background: DANGER,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        fontWeight: 600
                                    }}
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {contextLoading && (
                        <div style={styles.loadingState}>
                            <Loader2 size={40} color={ACCENT} style={{ animation: 'spin 2s linear infinite' }} />
                            <div style={{ marginTop: 16, color: TEXT_MID, fontSize: 14 }}>
                                Loading your assignments...
                            </div>
                        </div>
                    )}

                    {/* SOS List */}
                    {!contextLoading && assignedSOS.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {assignedSOS.map(sos => {
                                const isProcessing = processingId === sos.id;
                                
                                return (
                                    <div key={sos.id} style={styles.sosCard(sos.status)}>
                                        {/* Header */}
                                        <div style={styles.sosHeader}>
                                            <Siren size={24} color={DANGER} />
                                            <div style={{ flex: 1 }}>
                                                <div style={styles.sosTitle}>
                                                    Emergency Alert from {sos.user_name || 'Attendee'}
                                                </div>
                                                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                                    <div style={styles.statusBadge(sos.status)}>
                                                        {sos.status.toUpperCase()}
                                                    </div>
                                                    <div style={{ fontSize: 11, padding: '4px 10px', background: '#fef2f2', color: DANGER, borderRadius: 20, fontWeight: 800 }}>
                                                        PRIORITY 1
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => navigate(`/organizer/live-map/${sos.event_id || ''}`)}
                                                style={styles.button('secondary')}
                                            >
                                                <Navigation size={14} /> Map
                                            </button>
                                        </div>

                                        {/* Details Grid */}
                                        <div style={{ ...styles.sosDetails, background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                                            {/* Attendee Info */}
                                            <div style={styles.detailRow}>
                                                <Phone size={14} color={TEXT_MID} />
                                                <div>
                                                    <div style={styles.detailLabel}>Attendee Contact</div>
                                                    <div style={styles.detailValue}>{sos.user_phone || 'N/A'}</div>
                                                </div>
                                            </div>

                                            {/* Location */}
                                            <div style={styles.detailRow}>
                                                <MapPin size={14} color={ACCENT} />
                                                <div>
                                                    <div style={styles.detailLabel}>Location Pin</div>
                                                    <div style={styles.detailValue}>{sos.location_name || `${Number(sos.latitude).toFixed(4)}, ${Number(sos.longitude).toFixed(4)}`}</div>
                                                </div>
                                            </div>
                                            
                                            {/* Time */}
                                            <div style={styles.detailRow}>
                                                <Clock size={14} color={TEXT_MID} />
                                                <div>
                                                    <div style={styles.detailLabel}>Time Reported</div>
                                                    <div style={styles.detailValue}>{new Date(sos.created_at).toLocaleTimeString()}</div>
                                                </div>
                                            </div>

                                            {/* Message */}
                                            {sos.message && (
                                                <div style={{ ...styles.detailRow, gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 8 }}>
                                                    <AlertCircle size={14} color={TEXT_MID} />
                                                    <div>
                                                        <div style={styles.detailLabel}>Emergency message</div>
                                                        <div style={{ ...styles.detailValue, fontStyle: 'italic', color: '#475569' }}>"{sos.message}"</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            {sos.status === 'reported' && (
                                                <button 
                                                    onClick={() => handleAccept(sos.id)}
                                                    disabled={isProcessing}
                                                    style={{ ...styles.button('success'), opacity: isProcessing ? 0.7 : 1 }}
                                                >
                                                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                    Acknowledge SOS
                                                </button>
                                            )}

                                            {(sos.status === 'assigned' || sos.status === 'in_progress' || sos.status === 'acknowledged') && (
                                                <button 
                                                    onClick={() => handleResolve(sos.id)}
                                                    disabled={isProcessing}
                                                    style={{ ...styles.button('success'), opacity: isProcessing ? 0.7 : 1 }}
                                                >
                                                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                    Resolve SOS
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty State */}
                    {!contextLoading && assignedSOS.length === 0 && (
                        <div style={styles.emptyState}>
                            <Activity size={48} color={TEXT_MID} />
                            <h3 style={{ marginTop: 16, color: TEXT_DARK, fontSize: 18, fontWeight: 600 }}>
                                You're All Clear
                            </h3>
                            <p style={{ marginTop: 8, color: TEXT_MID, fontSize: 14 }}>
                                No active SOS emergencies assigned to you right now.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* CSS for spinner animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default VolunteerSOS;
