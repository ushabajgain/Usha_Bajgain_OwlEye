import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { Pagination, usePagination } from '../components/Pagination';
import { 
    History, ShieldAlert, Database, 
    User, AlertTriangle, Search, Filter, 
    AlertCircle, CheckCircle, Clock, Zap 
} from 'lucide-react';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const GlobalAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [stats, setStats] = useState({ security: 0, access: 0, changes: 0, failures: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterModule, setFilterModule] = useState('all');
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // ✅ Pagination: Use hook on filtered logs
    const { page, setPage, slicedItems: paginatedLogs } = usePagination(filteredLogs, itemsPerPage);

    useEffect(() => {
        fetchLogs();
        
        const pollInterval = setInterval(() => {
            fetchLogs();
        }, 30000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchLogs();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(pollInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // ✅ Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [searchTerm, filterType, filterModule]);

    // Apply filters and search
    useMemo(() => {
        let result = [...logs];

        // Filter by action type
        if (filterType !== 'all') {
            result = result.filter(log => log.action_type === filterType);
        }

        // Filter by module
        if (filterModule !== 'all') {
            result = result.filter(log => log.module === filterModule);
        }

        // Search by user, action, or notes
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(log => 
                (log.user?.toLowerCase().includes(term)) ||
                (log.action_display?.toLowerCase().includes(term)) ||
                (log.notes?.toLowerCase().includes(term))
            );
        }

        setFilteredLogs(result);
    }, [logs, searchTerm, filterType, filterModule]);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const [incidentRes, sosRes] = await Promise.all([
                api.get('/monitoring/incident-logs/'),
                api.get('/monitoring/sos-logs/')
            ]);
            
            const incidentLogs = Array.isArray(incidentRes.data) ? incidentRes.data : [];
            const sosLogs = Array.isArray(sosRes.data) ? sosRes.data : [];
            
            // Transform incident logs to audit format
            const transformedIncidentLogs = incidentLogs.map((log, idx) => ({
                id: `incident-${log.id}`,
                user: log.performed_by_name || 'System',
                action_type: log.action_type,
                action_display: log.action_display || formatActionType(log.action_type),
                module: 'Incidents',
                module_icon: ShieldAlert,
                timestamp: log.timestamp,
                created_at: log.timestamp,
                severity: getSeverityForAction(log.action_type, 'incident'),
                notes: log.notes,
                previous_status: log.previous_status,
                new_status: log.new_status,
                icon: getActionIcon(log.action_type)
            }));

            // Transform SOS logs to audit format
            const transformedSOSLogs = sosLogs.map((log, idx) => ({
                id: `sos-${log.id}`,
                user: log.performed_by_name || 'System',
                action_type: log.action_type,
                action_display: log.action_display || formatActionType(log.action_type),
                module: 'SOS Alerts',
                module_icon: AlertTriangle,
                timestamp: log.timestamp,
                created_at: log.timestamp,
                severity: 'high',
                notes: log.notes,
                previous_status: log.previous_status,
                new_status: log.new_status,
                icon: getActionIcon(log.action_type)
            }));

            const combinedLogs = [...transformedIncidentLogs, ...transformedSOSLogs]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            setLogs(combinedLogs);
            
            // Calculate comprehensive stats
            const allLogs = [...incidentLogs, ...sosLogs];
            const securityCount = allLogs.filter(l => 
                l.action_type === 'escalated' || l.action_type === 'reported'
            ).length;
            const accessCount = combinedLogs.length;
            const changesCount = incidentLogs.filter(l => 
                l.action_type === 'status_change' || l.action_type === 'priority_change'
            ).length;
            const failureCount = incidentLogs.filter(l => 
                l.action_type === 'marked_false'
            ).length;
            
            setStats({
                security: securityCount,
                access: accessCount,
                changes: changesCount,
                failures: failureCount
            });
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            setError('Failed to load audit logs');
            setLogs([]);
            setStats({ security: 0, access: 0, changes: 0, failures: 0 });
        } finally {
            setLoading(false);
        }
    };

    const formatActionType = (actionType) => {
        return actionType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const getSeverityForAction = (actionType, logType) => {
        if (actionType === 'escalated' || actionType === 'reported') return 'high';
        if (actionType === 'marked_false') return 'low';
        return 'medium';
    };

    const getActionIcon = (actionType) => {
        switch(actionType) {
            case 'reported':
            case 'acknowledged':
                return AlertCircle;
            case 'resolved':
            case 'verified':
                return CheckCircle;
            case 'assigned':
            case 'status_change':
            case 'priority_change':
                return Clock;
            case 'escalated':
                return Zap;
            default:
                return History;
        }
    };

    const getSeverityColor = (s) => {
        switch(s) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            default: return '#10b981';
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    };

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        card: { background: CARD_BG, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' },
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', background: '#f8fafc', borderBottom: `1px solid ${BORDER}` },
        td: { padding: '16px 24px', fontSize: 13, color: TEXT_DARK, borderBottom: `1px solid ${BORDER}` },
        input: { padding: '8px 12px 8px 36px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12, outline: 'none', width: '100%', background: '#fff' },
        select: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12, outline: 'none', background: '#fff', cursor: 'pointer' }
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Audit Logs" breadcrumb="Dashboard" />

                <div style={s.content}>
                    {error && (
                        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                        {[
                            { label: 'Security Events', value: stats.security, icon: ShieldAlert, color: '#ef4444' },
                            { label: 'Access Logs', value: stats.access > 1000 ? `${(stats.access/1000).toFixed(1)}k` : stats.access, icon: User, color: ACCENT },
                            { label: 'System Changes', value: stats.changes, icon: Database, color: '#6366f1' },
                            { label: 'Failures', value: stats.failures, icon: AlertTriangle, color: '#f59e0b' }
                        ].map((stat, i) => (
                            <div key={i} style={{ ...s.card, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                                    <stat.icon size={20} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: TEXT_MID, textTransform: 'uppercase' }}>{stat.label}</p>
                                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={s.card}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                                <input 
                                    type="text"
                                    placeholder="Search by user, action, or notes..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={s.input}
                                />
                            </div>
                            <select 
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                style={s.select}
                            >
                                <option value="all">All Actions</option>
                                <option value="reported">Reported</option>
                                <option value="verified">Verified</option>
                                <option value="assigned">Assigned</option>
                                <option value="status_change">Status Changed</option>
                                <option value="priority_change">Priority Changed</option>
                                <option value="escalated">Escalated</option>
                                <option value="resolved">Resolved</option>
                                <option value="marked_false">Marked False</option>
                                <option value="acknowledged">Acknowledged</option>
                            </select>
                            <select 
                                value={filterModule}
                                onChange={(e) => setFilterModule(e.target.value)}
                                style={s.select}
                            >
                                <option value="all">All Modules</option>
                                <option value="Incidents">Incidents</option>
                                <option value="SOS Alerts">SOS Alerts</option>
                            </select>
                        </div>
                        <table style={s.table}>
                            <thead>
                                <tr>
                                    {['User', 'Action', 'Module', 'Time', 'Notes', 'Severity'].map(h => <th key={h} style={s.th}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" style={{ ...s.td, textAlign: 'center', padding: '40px 24px' }}>Loading audit logs...</td></tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr><td colSpan="6" style={{ ...s.td, textAlign: 'center', padding: '40px 24px', color: TEXT_MID }}>
                                        {logs.length === 0 ? 'No audit logs available yet' : 'No logs match your filters'}
                                    </td></tr>
                                ) : (
                                    paginatedLogs.map(log => {
                                        const ActionIcon = log.icon || History;
                                        return (
                                            <tr key={log.id} style={{ hover: { background: '#f9fafb' } }}>
                                                <td style={s.td}>
                                                    <b style={{ color: TEXT_DARK }}>{log.user}</b>
                                                </td>
                                                <td style={s.td}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <ActionIcon size={14} color={getSeverityColor(log.severity)} />
                                                        <span>{log.action_display}</span>
                                                    </div>
                                                </td>
                                                <td style={s.td}>
                                                    <span style={{ padding: '2px 8px', borderRadius: 6, background: log.module === 'Incidents' ? '#e0e7ff' : '#fee2e2', color: log.module === 'Incidents' ? '#4f46e5' : '#991b1b', fontSize: 11, fontWeight: 700 }}>
                                                        {log.module}
                                                    </span>
                                                </td>
                                                <td style={s.td}>
                                                    <span title={new Date(log.created_at).toLocaleString()}>
                                                        {formatTime(log.created_at)}
                                                    </span>
                                                </td>
                                                <td style={s.td}>
                                                    {log.notes ? (
                                                        <span title={log.notes} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', fontSize: 12, color: TEXT_MID }}>
                                                            {log.notes}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: TEXT_MID, fontSize: 12 }}>-</span>
                                                    )}
                                                </td>
                                                <td style={s.td}>
                                                    <span style={{ padding: '4px 10px', borderRadius: 20, background: getSeverityColor(log.severity) + '15', color: getSeverityColor(log.severity), fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                                                        {log.severity}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        {filteredLogs.length > 0 && (
                            <Pagination 
                                page={page}
                                totalItems={filteredLogs.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setPage}
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GlobalAuditLogs;
