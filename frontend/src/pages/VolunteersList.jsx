import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { User, Mail, Phone, Shield, ShieldCheck, Search, Loader2 } from 'lucide-react';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const VolunteersList = () => {
    const navigate = useNavigate();
    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchVolunteers = async () => {
            try {
                const res = await api.get('/accounts/volunteers/');
                setVolunteers(res.data);
            } catch (err) {
                console.error("Failed to fetch volunteers", err);
            } finally {
                setLoading(false);
            }
        };
        fetchVolunteers();
    }, []);

    const filtered = volunteers.filter(v => 
        v.full_name?.toLowerCase().includes(search.toLowerCase()) || 
        v.email?.toLowerCase().includes(search.toLowerCase()) ||
        v.phone?.includes(search)
    );

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        searchBox: { 
            background: CARD_BG, padding: '16px 24px', borderRadius: 12, border: `1px solid ${BORDER}`,
            marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 
        },
        input: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: TEXT_DARK },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 },
        card: { background: CARD_BG, borderRadius: 16, border: `1px solid ${BORDER}`, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', transition: 'transform 0.2s ease' },
        avatar: { width: 64, height: 64, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, marginBottom: 16, fontSize: 24, fontWeight: 800 },
        vName: { fontSize: 18, fontWeight: 800, color: TEXT_DARK, margin: '0 0 4px' },
        vRole: { fontSize: 12, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 },
        infoItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: TEXT_MID, marginBottom: 8 },
        statusBadge: (active) => ({
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: active ? '#DCFCE7' : '#F1F5F9', color: active ? '#16A34A' : TEXT_MID,
            marginLeft: 'auto'
        })
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Volunteers" breadcrumb="Dashboard" />

                <div style={s.content}>
                    <div style={s.searchBox}>
                        <Search size={18} color={TEXT_MID} />
                        <input 
                            style={s.input} 
                            placeholder="Find a volunteer by name, email, or phone..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div style={{ padding: 100, textAlign: 'center' }}>
                            <Loader2 size={40} className="animate-spin" color={ACCENT} style={{ margin: '0 auto' }} />
                        </div>
                    ) : (
                        <div style={s.grid}>
                            {filtered.map(vol => (
                                <div key={vol.id} style={s.card}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={s.avatar}>
                                            {vol.full_name?.[0] || 'V'}
                                        </div>
                                        <div style={s.statusBadge(true)}>ON DUTY</div>
                                    </div>
                                    <h3 style={s.vName}>{vol.full_name}</h3>
                                    <div style={s.vRole}><ShieldCheck size={14} /> Certified Volunteer</div>
                                    
                                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 16 }}>
                                        <div style={s.infoItem}><Mail size={14} /> {vol.email}</div>
                                        <div style={s.infoItem}><Phone size={14} /> {vol.phone || '+977-XXXXXXXXXX'}</div>
                                    </div>

                                    <button 
                                        onClick={() => navigate(`/organizer/live-map`)}
                                        style={{ width: '100%', marginTop: 20, padding: '10px', borderRadius: 8, border: `1px solid ${ACCENT}`, background: 'transparent', color: ACCENT, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Locate on Map
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 100, color: TEXT_MID }}>
                            <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                            <p>No volunteers found matching your search.</p>
                        </div>
                    )}
                </div>
            </main>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
        </div>
    );
};

export default VolunteersList;
