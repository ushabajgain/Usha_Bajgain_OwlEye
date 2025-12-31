import React, { useState, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import Sidebar from '../components/Sidebar';
import {
    Search, Download, ChevronLeft, ChevronRight,
    TrendingUp, Ticket, DollarSign, MoreHorizontal,
    Filter, Calendar as CalendarIcon, ChevronDown
} from 'lucide-react';
import C from '../utils/colors';
import PageHeader from '../components/PageHeader';
import DigitalTicket from '../components/DigitalTicket';
import api from '../utils/api';
import { getRole } from '../utils/auth';

const HEADER_BG = C.navy;
const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

// No mock data here

// Derived from data

const StatCard = ({ label, value, icon: Icon, color }) => (
    <div style={{ background: CARD_BG, borderRadius: 16, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon size={20} color={color} />
            </div>
            <p style={{ fontSize: 13, color: TEXT_MID, fontWeight: 600, margin: '0 0 4px' }}>{label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>{value}</p>
        </div>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MID }}>
            <MoreHorizontal size={18} />
        </button>
    </div>
);


const Bookings = () => {
    const isStaff = ['organizer', 'admin'].includes(getRole());
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [bookings, setBookings] = useState([]);
    const [rawTickets, setRawTickets] = useState([]); // Store full objects
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);

    React.useEffect(() => {
        const fetchBookings = async () => {
            try {
                const endpoint = isStaff ? '/tickets/organizer-tickets/' : '/tickets/my-tickets/';
                const res = await api.get(endpoint);
                setRawTickets(res.data);
                // Transform API tickets to match table format
                const transformed = res.data.map(t => ({
                    id: t.id.split('-')[0].toUpperCase(),
                    fullId: t.id, // For viewing
                    date: new Date(t.created_at).toLocaleDateString(),
                    time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    name: t.user_name,
                    event: t.event_details.name,
                    category: t.event_details.category,
                    tkCat: t.package_details?.name || 'Standard',
                    price: t.price_at_purchase,
                    qty: 1,
                    amount: t.price_at_purchase,
                    status: t.status === 'issued' ? 'Confirmed' : t.status === 'scanned' ? 'Confirmed' : 'Cancelled',
                    voucher: t.qr_token.split('-')[0]
                }));
                setBookings(transformed);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    const trendData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const data = days.map(d => ({ name: d, bookings: 0 }));
        bookings.forEach(b => {
            const day = new Date(b.date).getDay();
            data[day].bookings += 1;
        });
        return data;
    }, [bookings]);

    const categoryData = useMemo(() => {
        const cats = {};
        bookings.forEach(b => {
            cats[b.category] = (cats[b.category] || 0) + 1;
        });
        const colors = [C.primary, C.navy, C.secondary || '#db2777', '#9d174d', '#059669'];
        const total = bookings.length || 1;
        return Object.entries(cats).map(([name, value], i) => ({
            name,
            value,
            color: colors[i % colors.length],
            percentage: ((value / total) * 100).toFixed(1) + '%'
        }));
    }, [bookings]);

    const [categoryFilter, setCategoryFilter] = useState('All Category');
    const [timeFilter, setTimeFilter] = useState('All Time');

    const categories = useMemo(() => {
        const set = new Set(bookings.map(b => b.category));
        return ['All Category', ...Array.from(set)];
    }, [bookings]);

    const filtered = useMemo(() => {
        return bookings.filter(b => {
            const matchesTab = activeTab === 'All' || b.status === activeTab;
            const matchesSearch = b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.event?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.id?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'All Category' || b.category === categoryFilter;
            
            let matchesTime = true;
            if (timeFilter === 'This Month') {
                const now = new Date();
                const bDate = new Date(b.date);
                matchesTime = bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear();
            } else if (timeFilter === 'This Week') {
                const now = new Date();
                const bDate = new Date(b.date);
                const diff = (now - bDate) / (1000 * 60 * 60 * 24);
                matchesTime = diff <= 7;
            }

            return matchesTab && matchesSearch && matchesCategory && matchesTime;
        });
    }, [activeTab, searchQuery, bookings, categoryFilter, timeFilter]);

    const s = {
        shell: { display: 'flex', minHeight: '100vh', background: CONTENT_BG, fontFamily: "'Inter','Segoe UI',sans-serif", overflowX: 'hidden' },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column', minWidth: 0 },
        content: { padding: '28px 32px' },
        statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 28 },
        chartsRow: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginBottom: 28 },
        card: { background: CARD_BG, borderRadius: 16, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}` },
        cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
        cardTitle: { fontSize: 16, fontWeight: 800, color: TEXT_DARK, margin: 0 },
        filterBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, color: TEXT_MID, cursor: 'pointer' },

        tableCard: { background: CARD_BG, borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, overflow: 'hidden' },
        tableTop: { padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BORDER}` },
        tabs: { display: 'flex', gap: 8 },
        tab: (active) => ({ padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: active ? ACCENT : '#f1f5f9', color: active ? '#fff' : TEXT_MID, transition: 'all 0.15s' }),

        searchBox: { position: 'relative', minWidth: 240 },
        searchInput: { width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: 'none', background: '#f8fafc' },

        th: { padding: '16px 12px', fontSize: 11, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.04em', background: '#f8fafc', textAlign: 'left', borderBottom: `1px solid ${BORDER}` },
        td: { padding: '16px 12px', fontSize: 13, color: TEXT_DARK, borderBottom: `1px solid #f1f5f9` },
        status: (s) => ({
            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: s === 'Confirmed' ? '#f0fdf4' : s === 'Pending' ? '#eff6ff' : '#fef2f2',
            color: s === 'Confirmed' ? '#16a34a' : s === 'Pending' ? ACCENT : '#ef4444'
        }),
        tkBadge: { padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: TEXT_MID, border: `1px solid ${BORDER}` }
    };

    return (
        <div style={s.shell}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Bookings" breadcrumb="Dashboard" />

                <div style={s.content}>
                    {/* Stats */}
                    <div style={s.statsRow}>
                        <StatCard label={isStaff ? "Total Tickets" : "My Tickets"} value={bookings.length} icon={Ticket} color={ACCENT} />
                        <StatCard label={isStaff ? "Total Revenue" : "Total Spent"} value={`Rs. ${bookings.reduce((sum, b) => sum + parseFloat(b.amount), 0).toLocaleString()}`} icon={DollarSign} color="#ec4899" />
                        <StatCard label={isStaff ? "Events Managed" : "Active Events"} value={[...new Set(bookings.map(b => b.event))].length} icon={CalendarIcon} color="#a855f7" />
                    </div>

                    {/* Charts */}
                    <div style={s.chartsRow}>
                        <div style={s.card}>
                            <div style={s.cardHeader}>
                                <h3 style={s.cardTitle}>Bookings Overview</h3>
                                <button style={s.filterBtn}>This Week <ChevronDown size={14} /></button>
                            </div>
                            <div style={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={ACCENT} stopOpacity={0.2} />
                                                <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={BORDER} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: TEXT_MID, fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: TEXT_MID, fontSize: 12 }} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                                            itemStyle={{ fontWeight: 700 }}
                                        />
                                        <Area type="monotone" dataKey="bookings" stroke={ACCENT} strokeWidth={3} fillOpacity={1} fill="url(#colorArea)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div style={s.card}>
                            <div style={s.cardHeader}>
                                <h3 style={s.cardTitle}>Bookings Category</h3>
                                <button style={s.filterBtn}>This Week <ChevronDown size={14} /></button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                                <div style={{ position: 'relative', width: 140, height: 140 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={categoryData} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                                                {categoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: 10, color: TEXT_MID, fontWeight: 600 }}>Total Bookings</span>
                                        <span style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK }}>{bookings.length}</span>
                                    </div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {categoryData.map((cat, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                                                <span style={{ fontWeight: 600 }}>{cat.name || 'Other'}</span>
                                            </div>
                                            <span style={{ color: TEXT_MID }}>{cat.percentage}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {categoryData.slice(0, 3).map((sub, i) => (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                                            <span style={{ fontWeight: 600, color: TEXT_MID }}>{sub.name}</span>
                                            <span style={{ fontWeight: 700, color: TEXT_DARK }}>{sub.value} out of {bookings.length}</span>
                                        </div>
                                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: (sub.value / (bookings.length || 1) * 100) + '%', background: sub.color, borderRadius: 3 }} />
                                        </div>
                                    </div>
                                ))}
                                {categoryData.length === 0 && <p style={{ fontSize: 12, color: TEXT_MID, textAlign: 'center' }}>No category data available</p>}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div style={s.tableCard}>
                        <div style={s.tableTop}>
                            <div style={s.tabs}>
                                {['All', 'Confirmed', 'Pending', 'Cancelled'].map(t => (
                                    <button key={t} onClick={() => setActiveTab(t)} style={s.tab(activeTab === t)}>{t}</button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={s.searchBox}>
                                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search name, event, etc" style={s.searchInput} />
                                </div>
                                <select 
                                    value={categoryFilter} 
                                    onChange={e => setCategoryFilter(e.target.value)}
                                    style={{ ...s.filterBtn, appearance: 'none', paddingRight: '28px' }}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select 
                                    value={timeFilter} 
                                    onChange={e => setTimeFilter(e.target.value)}
                                    style={{ ...s.filterBtn, appearance: 'none', paddingRight: '28px' }}
                                >
                                    <option value="All Time">All Time</option>
                                    <option value="This Week">This Week</option>
                                    <option value="This Month">This Month</option>
                                </select>
                            </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Invoice ID', 'Date', isStaff ? 'Attendee' : 'Name', 'Event', 'Ticket Category', 'Price', 'Qty', 'Amount', 'Status', 'Actions'].map(h => (
                                        <th key={h} style={s.th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((b, i) => (
                                    <tr key={i} style={{ transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = '#fcfdfe'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                        <td style={{ ...s.td, fontWeight: 700, color: ACCENT }}>{b.id}</td>
                                        <td style={s.td}>
                                            <div style={{ fontWeight: 600 }}>{b.date}</div>
                                            <div style={{ fontSize: 11, color: TEXT_MID, marginTop: 2 }}>{b.time}</div>
                                        </td>
                                        <td style={{ ...s.td, fontWeight: 600 }}>{b.name}</td>
                                        <td style={s.td}>
                                            <div style={{ fontWeight: 600 }}>{b.event}</div>
                                            <div style={{ fontSize: 11, color: TEXT_MID, marginTop: 2 }}>{b.category}</div>
                                        </td>
                                        <td style={s.td}><span style={s.tkBadge}>{b.tkCat}</span></td>
                                        <td style={{ ...s.td, fontWeight: 600 }}>Rs. {Number(b.price).toLocaleString()}</td>
                                        <td style={{ ...s.td, fontWeight: 600 }}>{b.qty}</td>
                                        <td style={{ ...s.td, fontWeight: 700 }}>Rs. {Number(b.amount).toLocaleString()}</td>
                                        <td style={s.td}><span style={s.status(b.status)}>{b.status}</span></td>
                                        <td style={s.td}>
                                            <button
                                                onClick={() => {
                                                    const fullTicket = rawTickets.find(rt => rt.id === b.fullId);
                                                    setSelectedTicket(fullTicket);
                                                }}
                                                style={{ background: ACCENT + '15', border: 'none', cursor: 'pointer', color: ACCENT, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                                View Ticket
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${BORDER}` }}>
                            <div style={{ fontSize: 13, color: TEXT_MID }}>Showing <strong>{filtered.length}</strong> items</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronLeft size={16} color={TEXT_MID} /></button>
                                <button style={{ width: 32, height: 32, borderRadius: 8, background: ACCENT, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>1</button>
                                <button style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', color: TEXT_DARK, border: `1.5px solid ${BORDER}`, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>2</button>
                                <button style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevronRight size={16} color={TEXT_MID} /></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer credit like in inspo */}
                <footer style={{ padding: '20px 32px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: TEXT_MID }}>
                    <span>Copyright © 2026 OwlEye Events</span>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <span>Privacy Policy</span>
                        <span>Term and conditions</span>
                        <span>Contact</span>
                    </div>
                </footer>

                {selectedTicket && (
                    <DigitalTicket ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
                )}
            </main>
        </div>
    );
};

export default Bookings;
