import React, { useState, useEffect } from 'react';
import { useEffect as useEff } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { 
    TrendingUp, DollarSign, CreditCard, 
    ArrowUp, ArrowDown, Download, Filter, Loader2 
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const GlobalFinances = () => {
    const [stats, setStats] = useState({ revenue: 0, bookings: 0, avgTicket: 0 });
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        // TODO: Fetch real financial data from backend
    }, []);

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 },
        card: { background: CARD_BG, borderRadius: 20, padding: 24, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Finances" breadcrumb="Dashboard" />

                <div style={s.content}>
                    <div style={s.grid}>
                        {[
                            { label: 'Total Revenue', value: `Rs. ${stats.revenue.toLocaleString()}`, icon: DollarSign, color: '#10b981', trend: '+15.2%' },
                            { label: 'Active Bookings', value: stats.bookings, icon: CreditCard, color: ACCENT, trend: '+8.4%' },
                            { label: 'Avg. Ticket Value', value: `Rs. ${stats.avgTicket.toLocaleString()}`, icon: TrendingUp, color: '#f59e0b', trend: '-2.1%' }
                        ].map((item, i) => (
                            <div key={i} style={s.card}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <div style={{ padding: 10, borderRadius: 12, background: item.color + '15', color: item.color }}><item.icon size={20} /></div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: item.trend.startsWith('+') ? '#10b981' : '#ef4444' }}>{item.trend}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: TEXT_MID, textTransform: 'uppercase' }}>{item.label}</p>
                                <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 900, color: TEXT_DARK }}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Global Revenue Growth</h3>
                            <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: '#fff', border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                <Download size={14} /> Export Report
                            </button>
                        </div>
                        <div style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: TEXT_MID }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: TEXT_MID }} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="rev" stroke={ACCENT} strokeWidth={4} dot={{ r: 6, fill: ACCENT, strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GlobalFinances;
