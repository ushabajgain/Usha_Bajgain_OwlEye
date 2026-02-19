import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Search, Calendar, AlertTriangle, Eye, Shield, History } from 'lucide-react';
import C from '../utils/colors';
import PageHeader from '../components/PageHeader';
import { getRole, getToken } from '../utils/auth';
import { usePagination, Pagination } from '../components/Pagination';

const HEADER_BG = C.navy;
const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

    const statusStyle = (status) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
    background: status === 'resolved' ? '#dcfce7' : status === 'false_alarm' ? '#f1f5f9' : '#eff6ff',
    color: status === 'resolved' ? '#16a34a' : status === 'false_alarm' ? TEXT_MID : ACCENT,
});

const IncidentHistory = () => {
    const navigate = useNavigate();
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', priority: '', search: '' });
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        const userRole = getRole();
        if (userRole !== 'organizer' && userRole !== 'admin') { navigate('/events'); return; }
        const fetchIncidents = async () => {
            try {
                const res = await axios.get('http://127.0.0.1:8000/api/monitoring/incidents/', {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                setIncidents(res.data);
            } catch (err) {
                console.error('Failed to fetch incidents', err);
            } finally {
                setLoading(false);
            }
        };
        fetchIncidents();
    }, []);

    const filteredIncidents = incidents.filter(inc => {
        const matchesStatus = filter.status ? inc.status === filter.status : true;
        const matchesPriority = filter.priority ? inc.priority === filter.priority : true;
        const matchesSearch = filter.search
            ? inc.title.toLowerCase().includes(filter.search.toLowerCase()) ||
            inc.description.toLowerCase().includes(filter.search.toLowerCase())
            : true;
        return matchesStatus && matchesPriority && matchesSearch;
    });

    const { page, setPage, slicedItems: paginatedIncidents } = usePagination(filteredIncidents, itemsPerPage);

    // Reset to first page when filters change
    useEffect(() => {
        setPage(1);
    }, [filter, setPage]);

    const s = {
        shell: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif" },
        main: { flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column' },
        topBar: {
            background: HEADER_BG, color: '#fff', padding: '0 28px', height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 100,
        },
        topTitle: { fontSize: 17, fontWeight: 700, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 10 },
        exportBtn: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
        filtersBar: { background: CARD_BG, borderBottom: `1px solid ${BORDER}`, padding: '14px 28px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
        searchInput: { padding: '8px 14px 8px 36px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, outline: 'none', background: '#f8fafc', flex: 1, minWidth: 200 },
        select: { padding: '8px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, outline: 'none', background: '#f8fafc', cursor: 'pointer' },
        content: { padding: '24px 28px' },
        tableCard: { background: CARD_BG, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${BORDER}`, overflow: 'hidden' },
        th: { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.08em', background: '#f8fafc', textAlign: 'left', borderBottom: `1px solid ${BORDER}` },
        td: { padding: '13px 16px', fontSize: 13, color: TEXT_DARK, borderBottom: `1px solid #f1f5f9` },
        actionBtn: { padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, background: '#f8fafc', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
    };

    return (
        <div style={s.shell}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Incident History" breadcrumb="Dashboard" />

                {/* Filters */}
                <div style={s.filtersBar}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                        <input style={s.searchInput} placeholder="Search incidents…" value={filter.search}
                            onChange={e => setFilter({ ...filter, search: e.target.value })} />
                    </div>
                    <select style={s.select} value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="resolved">Resolved</option>
                        <option value="false_alarm">False Alarm</option>
                    </select>
                    <select style={s.select} value={filter.priority} onChange={e => setFilter({ ...filter, priority: e.target.value })}>
                        <option value="">All Priorities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                <div style={s.content}>
                    <div style={s.tableCard}>
                        {loading ? (
                            <div style={{ padding: 60, textAlign: 'center' }}>
                                <div style={{ width: 28, height: 28, border: `3px solid ${BORDER}`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                            </div>
                        ) : filteredIncidents.length === 0 ? (
                            <div style={{ padding: 60, textAlign: 'center', color: TEXT_MID }}>
                                <AlertTriangle size={36} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                                <p style={{ fontSize: 15 }}>No incidents found.</p>
                                <p style={{ fontSize: 13 }}>All events are safe.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {['ID', 'Type & Title', 'Date', 'Assigned To', 'Status', 'Actions'].map(h => (
                                            <th key={h} style={s.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedIncidents.map(inc => (
                                        <tr key={inc.id}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                                            <td style={s.td}>
                                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: TEXT_MID }}>#{inc.id.toString().padStart(5, '0')}</span>
                                            </td>
                                            <td style={s.td}>
                                                <p style={{ fontWeight: 600, color: TEXT_DARK, marginBottom: 2 }}>{inc.category_display}: {inc.title}</p>
                                                <p style={{ fontSize: 12, color: TEXT_MID, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{inc.description}</p>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEXT_MID, fontSize: 12 }}>
                                                    <Calendar size={12} /> {new Date(inc.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEXT_MID, fontSize: 12 }}>
                                                    <Shield size={12} /> {inc.volunteer_name || 'Unassigned'}
                                                </div>
                                            </td>
                                            <td style={s.td}>
                                                <span style={statusStyle(inc.status)}>{inc.status_display}</span>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <Link to={`/organizer/incident/${inc.id}`} style={{ ...s.actionBtn, color: ACCENT, textDecoration: 'none' }}>
                                                        <Eye size={14} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <Pagination 
                        page={page}
                        totalItems={filteredIncidents.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setPage}
                    />
                </div>
            </main>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default IncidentHistory;
