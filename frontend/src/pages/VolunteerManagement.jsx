import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { usePagination, Pagination } from '../components/Pagination';
import { 
    Users, ShieldCheck, MapPin, Activity, 
    Search, Filter, MoreVertical, Star,
    CheckCircle, XCircle, Loader2
} from 'lucide-react';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const VolunteerManagement = () => {
    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCertifyModal, setShowCertifyModal] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [candidateUsers, setCandidateUsers] = useState([]);
    const [certifyingId, setCertifyingId] = useState(null);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchVolunteers();
    }, []);

    const fetchVolunteers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/accounts/volunteers/'); 
            const data = Array.isArray(res.data) ? res.data : res.data.results || [];
            setVolunteers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async () => {
        if (!userSearchTerm) return;
        try {
            const res = await api.get(`/accounts/all-users/?search=${userSearchTerm}`);
            // Handle both paginated and non-paginated results
            const results = Array.isArray(res.data) ? res.data : res.data.results || [];
            setCandidateUsers(results);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCertify = async (userId) => {
        setCertifyingId(userId);
        try {
            await api.post(`/accounts/certify-volunteer/${userId}/`);
            setShowCertifyModal(false);
            setUserSearchTerm('');
            setCandidateUsers([]);
            fetchVolunteers(); // Refresh list
        } catch (err) {
            console.error(err);
            alert("Failed to certify volunteer");
        } finally {
            setCertifyingId(null);
        }
    };

    const filtered = useMemo(() => {
        return volunteers.filter(v => 
            v.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            v.email?.toLowerCase().includes(search.toLowerCase()) ||
            v.phone?.toLowerCase().includes(search.toLowerCase())
        );
    }, [volunteers, search]);

    const { page, setPage, slicedItems: paginatedVolunteers } = usePagination(filtered, itemsPerPage);

    // Reset to first page when search changes
    useEffect(() => {
        setPage(1);
    }, [search, setPage]);

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        card: { background: CARD_BG, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' },
        th: { padding: '14px 20px', background: '#f8fafc', fontSize: 11, fontWeight: 700, color: TEXT_MID, textAlign: 'left', borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase' },
        td: { padding: '16px 20px', fontSize: 13, color: TEXT_DARK, borderBottom: `1px solid ${BORDER}` },
        status: (status) => ({
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: status === 'available' ? '#f0fdf4' : status === 'responding' ? '#fff7ed' : '#f1f5f9',
            color: status === 'available' ? '#16a34a' : status === 'responding' ? '#ea580c' : TEXT_MID
        }),
        modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
        modal: { background: '#fff', padding: 32, borderRadius: 20, width: 500, maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Volunteers" breadcrumb="Dashboard" />
                
                <div style={s.content}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                         <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                                <input 
                                    id="volunteer-search"
                                    name="volunteer-search"
                                    placeholder="Search volunteers..." 
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ padding: '10px 12px 10px 36px', borderRadius: 10, border: `1px solid ${BORDER}`, outline: 'none', width: 280 }} 
                                />
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowCertifyModal(true)}
                            style={{ padding: '10px 20px', borderRadius: 10, background: ACCENT, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <ShieldCheck size={16} /> Certify New Volunteer
                        </button>
                    </div>

                    <div style={s.card}>
                        {loading ? (
                            <div style={{ padding: 100, textAlign: 'center' }}><Loader2 size={32} className="animate-spin" color={ACCENT} /></div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {['Volunteer', 'Assigned Event', 'Status', 'Location', 'Performance', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedVolunteers.map((v, idx) => (
                                        <tr key={idx}>
                                            <td style={s.td}>
                                                <div style={{ fontWeight: 700 }}>{v.full_name || v.username || 'Volunteer'}</div>
                                                <div style={{ fontSize: 11, color: TEXT_MID }}>{v.email}</div>
                                            </td>
                                            <td style={s.td}>{v.event_name || 'Global Pool'}</td>
                                            <td style={s.td}>
                                                <span style={s.status(v.status || 'available')}>{v.status || 'Available'}</span>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <MapPin size={12} color={ACCENT} /> {v.location_name || 'Unknown'}
                                                </div>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#eab308' }}>
                                                    <Star size={14} fill="#eab308" /> <span>4.9</span>
                                                </div>
                                            </td>
                                            <td style={s.td}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button title="Change Role" style={{ border: 'none', background: 'none', cursor: 'pointer', color: TEXT_MID }}><Users size={18} /></button>
                                                    <button title="Disable Access" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}><XCircle size={18} /></button>
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

                {/* Certification Modal */}
                {showCertifyModal && (
                    <div style={s.modalOverlay}>
                        <div style={s.modal}>
                            <h3 style={{ margin: '0 0 8px 0' }}>Certify New Volunteer</h3>
                            <p style={{ color: TEXT_MID, fontSize: 14, marginBottom: 20 }}>Search for a user by name or email to promote them to the volunteer network.</p>
                            
                            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                <input 
                                    placeholder="Enter name or email..." 
                                    value={userSearchTerm}
                                    onChange={e => setUserSearchTerm(e.target.value)}
                                    style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${BORDER}`, outline: 'none' }}
                                />
                                <button 
                                    onClick={searchUsers}
                                    style={{ padding: '0 20px', borderRadius: 10, background: ACCENT, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Search
                                </button>
                            </div>

                            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                {candidateUsers.map(u => (
                                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: `1px solid ${BORDER}` }}>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{u.full_name}</div>
                                            <div style={{ fontSize: 12, color: TEXT_MID }}>{u.email} • {u.role.toUpperCase()}</div>
                                        </div>
                                        {u.role === 'volunteer' ? (
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '4px 8px', borderRadius: 6 }}>Certified</span>
                                        ) : (
                                            <button 
                                                disabled={certifyingId === u.id}
                                                onClick={() => handleCertify(u.id)}
                                                style={{ padding: '6px 12px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                {certifyingId === u.id ? <Loader2 size={14} className="animate-spin" /> : 'Certify'}
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {candidateUsers.length === 0 && userSearchTerm && (
                                    <div style={{ textAlign: 'center', padding: 20, color: TEXT_MID }}>
                                        No users found. Try searching for "Test User" or "Attendee".
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => { setShowCertifyModal(false); setCandidateUsers([]); setUserSearchTerm(''); }}
                                style={{ width: '100%', marginTop: 24, padding: '12px', borderRadius: 10, background: '#f1f5f9', color: TEXT_DARK, border: 'none', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </main>
            <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default VolunteerManagement;
