import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { usePagination, Pagination } from '../components/Pagination';
import { 
    Globe, Search, Filter, Trash2, 
    CheckCircle, XCircle, AlertTriangle, Eye,
    Calendar, MapPin, Users, Loader2
} from 'lucide-react';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

import { useFeedback } from '../context/FeedbackContext';
import Footer from '../components/Footer';

const EventManagement = () => {
    const { showToast, confirmAction } = useFeedback();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/events/');
            setEvents(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        if (action === 'view') {
            navigate(`/events/${id}`);
            return;
        }
        
        if (action === 'delete') {
            confirmAction({
                title: "Permanently Delete Event?",
                message: "Are you sure you want to delete this event? All tickets and associated data will be lost forever. This action is irreversible.",
                type: 'danger',
                onConfirm: () => performDelete(id)
            });
        }
    };

    const performDelete = async (id) => {
        try {
            await api.delete(`/events/${id}/`);
            setEvents(events.filter(e => e.id !== id));
            showToast("Event permanently deleted.", 'success');
        } catch (err) {
            console.error("Action failed:", err);
            showToast("Failed to delete event. Check your permissions.", 'error');
        }
    };

    const filtered = useMemo(() => {
        return events.filter(e => {
            const matchesSearch = (e.name || "").toLowerCase().includes(search.toLowerCase()) || 
                                  (e.organizer_name || "").toLowerCase().includes(search.toLowerCase());
            const matchesFilter = filter === 'all' || e.status === filter;
            return matchesSearch && matchesFilter;
        });
    }, [events, search, filter]);

    const { page, setPage, slicedItems: paginatedEvents } = usePagination(filtered, itemsPerPage);

    // Reset to first page when filters change
    useEffect(() => {
        setPage(1);
    }, [search, filter, setPage]);

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        tableCard: { background: CARD_BG, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
        th: { padding: '14px 20px', background: '#f8fafc', textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: TEXT_MID, textAlign: 'left', borderBottom: `1px solid ${BORDER}` },
        td: { padding: '16px 20px', fontSize: 13, color: TEXT_DARK, borderBottom: `1px solid ${BORDER}` },
        badge: (status) => ({
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: status === 'active' ? '#f0fdf4' : status === 'draft' ? '#fffbeb' : '#fef2f2',
            color: status === 'active' ? '#16a34a' : status === 'draft' ? '#b45309' : '#dc2626'
        })
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Event Management" breadcrumb="Dashboard" />
                
                <div style={s.content}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                                <input 
                                    placeholder="Search events or organizers..." 
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ padding: '10px 12px 10px 36px', borderRadius: 10, border: `1px solid ${BORDER}`, outline: 'none', width: 280 }} 
                                />
                            </div>
                            <select 
                                value={filter} 
                                onChange={e => setFilter(e.target.value)}
                                style={{ padding: '0 12px', borderRadius: 10, border: `1px solid ${BORDER}`, outline: 'none', background: '#fff' }}
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="draft">Draft/Pending</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    <div style={s.tableCard}>
                        {loading ? (
                            <div style={{ padding: 100, textAlign: 'center' }}><Loader2 size={32} className="animate-spin" color={ACCENT} /></div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {['Event Details', 'Organizer', 'Location', 'Capacity', 'Status', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedEvents.map(e => (
                                        <tr key={e.id}>
                                            <td style={s.td}>
                                                <div style={{ fontWeight: 700 }}>{e.name}</div>
                                                <div style={{ fontSize: 11, color: TEXT_MID }}>{new Date(e.start_datetime).toLocaleDateString()}</div>
                                            </td>
                                            <td style={s.td}>{e.organizer_name || 'N/A'}</td>
                                            <td style={s.td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <MapPin size={12} color={ACCENT} /> {e.venue_address || 'TBD'}
                                                </div>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Users size={12} color={TEXT_MID} /> {e.capacity || 'Unlim.'}
                                                </div>
                                            </td>
                                            <td style={s.td}>
                                                <span style={s.badge(e.status)}>{e.status}</span>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => handleAction(e.id, 'view')} title="View Live" style={{ padding: 6, borderRadius: 6, border: 'none', background: '#eff6ff', color: '#3b82f6', cursor: 'pointer' }}><Eye size={14} /></button>
                                                    <button onClick={() => handleAction(e.id, 'delete')} title="Delete Event" style={{ padding: 6, borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
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
                        totalItems={filtered.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setPage}
                    />
                </div>
                            <Footer />
            </main>
            <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default EventManagement;
