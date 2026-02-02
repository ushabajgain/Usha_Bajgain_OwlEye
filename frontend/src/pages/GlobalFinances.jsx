import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { 
    TrendingUp, DollarSign, CreditCard, 
    ArrowUp, ArrowDown, Download, Loader2, AlertCircle 
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

const formatCurrency = (value) => `Rs. ${Math.round(value).toLocaleString()}`;

const GlobalFinances = () => {
    const [stats, setStats] = useState({ revenue: 0, bookings: 0, avgTicket: 0 });
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchFinancialData();

        const pollInterval = setInterval(() => {
            fetchFinancialData();
        }, 30000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchFinancialData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(pollInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const fetchFinancialData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/tickets/organizer-orders/');
            const orders = Array.isArray(response.data) ? response.data : [];

            if (orders.length === 0) {
                setStats({ revenue: 0, bookings: 0, avgTicket: 0 });
                setChartData([]);
                setLoading(false);
                return;
            }

            const totalRevenue = orders.reduce((sum, order) => {
                const amount = parseFloat(order.total_amount || 0);
                return sum + amount;
            }, 0);

            const totalBookings = orders.length;
            const avgTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;

            setStats({
                revenue: totalRevenue,
                bookings: totalBookings,
                avgTicket: avgTicket
            });

            const revenueByDate = {};
            orders.forEach(order => {
                if (order.created_at) {
                    const dateStr = new Date(order.created_at).toISOString().split('T')[0];
                    const date = new Date(order.created_at);
                    const displayDate = date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
                    
                    if (!revenueByDate[dateStr]) {
                        revenueByDate[dateStr] = { date: dateStr, displayDate, revenue: 0 };
                    }
                    revenueByDate[dateStr].revenue += parseFloat(order.total_amount || 0);
                }
            });

            const chartArray = Object.values(revenueByDate)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(item => ({
                    name: item.displayDate,
                    revenue: Math.round(item.revenue)
                }));

            setChartData(chartArray.length > 0 ? chartArray : [{ name: 'No Data', revenue: 0 }]);
        } catch (err) {
            console.error('Failed to fetch financial data:', err);
            setError('Failed to load financial data. Please try again.');
            setStats({ revenue: 0, bookings: 0, avgTicket: 0 });
            setChartData([]);
        } finally {
            setLoading(false);
        }
    };

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
                    {error && (
                        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div style={s.grid}>
                        {[
                            { 
                                label: 'Total Revenue', 
                                value: loading ? '...' : formatCurrency(stats.revenue), 
                                icon: DollarSign, 
                                color: '#10b981', 
                                trend: '+12.5%',
                                detail: `${stats.bookings} orders`
                            },
                            { 
                                label: 'Active Bookings', 
                                value: loading ? '...' : stats.bookings.toLocaleString(), 
                                icon: CreditCard, 
                                color: ACCENT, 
                                trend: '+8.4%',
                                detail: 'this month'
                            },
                            { 
                                label: 'Avg. Ticket Value', 
                                value: loading ? '...' : formatCurrency(stats.avgTicket), 
                                icon: TrendingUp, 
                                color: '#f59e0b', 
                                trend: '+3.2%',
                                detail: 'per booking'
                            }
                        ].map((item, i) => (
                            <div key={i} style={s.card}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <div style={{ padding: 10, borderRadius: 12, background: item.color + '15', color: item.color }}>
                                        <item.icon size={20} />
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: item.trend.startsWith('+') ? '#10b981' : '#ef4444' }}>
                                        {item.trend.startsWith('+') ? <ArrowUp size={12} style={{ display: 'inline', marginRight: 2 }} /> : <ArrowDown size={12} style={{ display: 'inline', marginRight: 2 }} />}
                                        {item.trend}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: TEXT_MID, textTransform: 'uppercase' }}>
                                    {item.label}
                                </p>
                                <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900, color: TEXT_DARK }}>
                                    {item.value}
                                </p>
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: TEXT_MID }}>
                                    {item.detail}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Revenue Growth Trend</h3>
                            <button 
                                onClick={() => {
                                    const csv = chartData.map(d => `${d.name},${d.revenue}`).join('\n');
                                    const blob = new Blob(['Date,Revenue\n' + csv], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'revenue-report.csv';
                                    a.click();
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: '#fff', border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#fff';
                                }}
                            >
                                <Download size={14} /> Export CSV
                            </button>
                        </div>
                        <div style={{ height: 350, minHeight: 350, display: 'flex', flexDirection: 'column' }}>
                            {loading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
                                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: ACCENT }} />
                                    <span style={{ color: TEXT_MID }}>Loading financial data...</span>
                                </div>
                            ) : chartData.length > 0 && chartData[0].name !== 'No Data' ? (
                                <ResponsiveContainer width="100%" height={330} minWidth={300}>
                                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 90, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 11, fill: TEXT_MID }} 
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 11, fill: TEXT_MID }}
                                            tickFormatter={(value) => `Rs. ${Math.round(value).toLocaleString()}`}
                                            width={80}
                                        />
                                        <Tooltip 
                                            formatter={(value) => formatCurrency(value)}
                                            contentStyle={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8 }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="revenue" 
                                            stroke={ACCENT} 
                                            strokeWidth={3} 
                                            dot={{ r: 5, fill: ACCENT, strokeWidth: 2, stroke: '#fff' }} 
                                            activeDot={{ r: 7 }} 
                                            isAnimationActive={true}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: TEXT_MID, flexDirection: 'column', gap: 8 }}>
                                    <DollarSign size={32} style={{ opacity: 0.3 }} />
                                    <p style={{ margin: 0 }}>No financial data available yet</p>
                                    <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>Bookings will appear here once orders are placed</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GlobalFinances;
