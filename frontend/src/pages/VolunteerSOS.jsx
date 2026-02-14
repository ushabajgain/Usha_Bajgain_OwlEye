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

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: VOLUNTEER SOS ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════
const VolunteerSOS = () => {
    const navigate = useNavigate();
    const { sosAlerts, loading: contextLoading } = useSafety();
    
    const userId = parseInt(getUserId());
    const role = getRole();
    
    // UI state
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState(null);
    const [actionMessage, setActionMessage] = useState({});

    // ───────────────────────────────────────────────────────────────────────
    // ✅ CRITICAL: Filter SOS assigned to THIS volunteer + active status
    // ───────────────────────────────────────────────────────────────────────
    const assignedSOS = useMemo(() => {
        const active = Object.values(sosAlerts || {})
            .filter(sos => {
                // Must be assigned to current volunteer
                const isAssignedToMe = sos.assigned_volunteer_id === userId;
                
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
            const res = await api.post(`/monitoring/sos/${sosId}/accept/`);
            setActionMessage(prev => ({
                ...prev,
                [sosId]: { text: 'SOS Accepted! Proceed to location.', type: 'success' }
            }));
            
            // Context will auto-update via WebSocket
            setTimeout(() => {
                setActionMessage(prev => ({
                    ...prev,
                    [sosId]: null
                }));
            }, 3000);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to accept SOS';
            setActionMessage(prev => ({
                ...prev,
                [sosId]: { text: msg, type: 'error' }
            }));
        } finally {
            setProcessingId(null);
        }
    }, []);

    const handleMarkInProgress = useCallback(async (sosId) => {
        setProcessingId(sosId);
        setError(null);
        
        try {
            await api.patch(`/monitoring/sos/${sosId}/`, {
                status: 'in-progress'
            });
            setActionMessage(prev => ({
                ...prev,
                [sosId]: { text: 'SOS marked as in-progress.', type: 'success' }
            }));
            
            setTimeout(() => {
                setActionMessage(prev => ({
                    ...prev,
                    [sosId]: null
                }));
            }, 3000);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update status';
            setActionMessage(prev => ({
                ...prev,
                [sosId]: { text: msg, type: 'error' }
            }));
        } finally {
            setProcessingId(null);
        }
    }, []);

    const handleResolve = useCallback(async (sosId) => {
        if (!window.confirm('Mark this SOS as resolved?')) return;
        
        setProcessingId(sosId);
        setError(null);
        
        try {
            await api.patch(`/monitoring/sos/${sosId}/`, {
                status: 'resolved',
                resolved_at: new Date().toISOString()
            });
            setActionMessage(prev => ({
                ...prev,
                [sosId]: { text: 'SOS resolved. Good job!', type: 'success' }
            }));
            
            // Context will auto-remove via WebSocket
            setTimeout(() => {
                setActionMessage(prev => ({
                    ...prev,
                    [sosId]: null
                }));
            }, 3000);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to resolve SOS';
            setActionMessage(prev => ({
                ...prev,
                [sosId]: { text: msg, type: 'error' }
            }));
        } finally {
            setProcessingId(null);
        }
    }, []);

    // ───────────────────────────────────────────────────────────────────────
    // RENDER
    // ───────────────────────────────────────────────────────────────────────
    
    return (
        <div style={styles.container}>
            <Sidebar />
            <div style={styles.main}>
                <PageHeader 
                    title="My SOS Assignments" 
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
                        <div>
                            {assignedSOS.map(sos => {
                                const isProcessing = processingId === sos.id;
                                const message = actionMessage[sos.id];
                                const statusIsReported = sos.status === 'reported';
                                const statusIsAssigned = sos.status === 'assigned';
                                const statusIsInProgress = sos.status === 'in-progress' || sos.status === 'acknowledged';

                                return (
                                    <div key={sos.id} style={styles.sosCard(sos.status)}>
                                        {/* Header */}
                                        <div style={styles.sosHeader}>
                                            <Siren size={24} color={DANGER} />
                                            <div>
                                                <div style={styles.sosTitle}>
                                                    SOS from {sos.user_name || 'Unknown Attendee'}
                                                </div>
                                                <div style={{ ...styles.statusBadge(sos.status), marginTop: 8 }}>
                                                    {sos.status === 'reported' ? '🔴 Reported' :
                                                     sos.status === 'assigned' ? '🟡 Assigned to You' :
                                                     sos.status === 'in-progress' ? '🔵 In Progress' :
                                                     'Resolved'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Details Grid */}
                                        <div style={styles.sosDetails}>
                                            {/* Attendee Info */}
                                            <div style={styles.detailRow}>
                                                <Phone size={16} style={styles.detailIcon} />
                                                <div>
                                                    <div style={styles.detailLabel}>Contact</div>
                                                    <div style={styles.detailValue}>
                                                        {sos.user_phone || 'No phone provided'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Location */}
                                            <div style={styles.detailRow}>
                                                <MapPin size={16} style={styles.detailIcon} />
                                                <div>
                                                    <div style={styles.detailLabel}>Location</div>
                                                    <div style={styles.detailValue}>
                                                        {sos.location_name || `${sos.lat}, ${sos.lng}`}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Time */}
                                            <div style={styles.detailRow}>
                                                <Clock size={16} style={styles.detailIcon} />
                                                <div>
                                                    <div style={styles.detailLabel}>Reported</div>
                                                    <div style={styles.detailValue}>
                                                        {new Date(sos.created_at).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Distance */}
                                            {sos.distance_text && (
                                                <div style={styles.detailRow}>
                                                    <Navigation size={16} style={styles.detailIcon} />
                                                    <div>
                                                        <div style={styles.detailLabel}>Distance</div>
                                                        <div style={styles.detailValue}>
                                                            {sos.distance_text}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Priority */}
                                            {sos.priority && (
                                                <div style={styles.detailRow}>
                                                    <AlertTriangle size={16} style={styles.detailIcon} />
                                                    <div>
                                                        <div style={styles.detailLabel}>Priority</div>
                                                        <div style={styles.detailValue}>
                                                            {sos.priority === 'high' ? '🔴 High' :
                                                             sos.priority === 'medium' ? '🟡 Medium' :
                                                             '🟢 Low'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Message */}
                                            {sos.message && (
                                                <div style={{ ...styles.detailRow, gridColumn: '1 / -1' }}>
                                                    <AlertCircle size={16} style={styles.detailIcon} />
                                                    <div>
                                                        <div style={styles.detailLabel}>Message</div>
                                                        <div style={styles.detailValue}>{sos.message}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Messages */}
                                        {message && (
                                            <div style={{
                                                padding: '12px',
                                                borderRadius: 8,
                                                marginBottom: 16,
                                                background: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                                                color: message.type === 'success' ? SUCCESS : DANGER,
                                                fontSize: 13,
                                                fontWeight: 500
                                            }}>
                                                {message.text}
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div style={styles.actionBar}>
                                            {statusIsReported && (
                                                <button 
                                                    onClick={() => handleAccept(sos.id)}
                                                    disabled={isProcessing}
                                                    style={{
                                                        ...styles.button('primary'),
                                                        opacity: isProcessing ? 0.6 : 1,
                                                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    {isProcessing ? (
                                                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                    ) : (
                                                        <CheckCircle size={16} />
                                                    )}
                                                    {isProcessing ? 'Accepting...' : 'Accept SOS'}
                                                </button>
                                            )}

                                            {(statusIsReported || statusIsAssigned) && (
                                                <button 
                                                    onClick={() => handleMarkInProgress(sos.id)}
                                                    disabled={isProcessing}
                                                    style={{
                                                        ...styles.button('success'),
                                                        opacity: isProcessing ? 0.6 : 1,
                                                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    {isProcessing ? (
                                                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                    ) : (
                                                        <Play size={16} />
                                                    )}
                                                    {isProcessing ? 'Updating...' : 'In Progress'}
                                                </button>
                                            )}

                                            {statusIsInProgress && (
                                                <button 
                                                    onClick={() => handleResolve(sos.id)}
                                                    disabled={isProcessing}
                                                    style={{
                                                        ...styles.button('danger'),
                                                        opacity: isProcessing ? 0.6 : 1,
                                                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                                                    }}
                                                >
                                                    {isProcessing ? (
                                                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                    ) : (
                                                        <CheckCircle size={16} />
                                                    )}
                                                    {isProcessing ? 'Resolving...' : 'Mark Resolved'}
                                                </button>
                                            )}

                                            <button 
                                                onClick={() => navigate(`/organizer/live-map/${sos.event_id || ''}`)}
                                                style={styles.button('secondary')}
                                            >
                                                <Navigation size={16} />
                                                View Map
                                            </button>
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
