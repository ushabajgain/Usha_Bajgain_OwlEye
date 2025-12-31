import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { 
    History, ShieldAlert, Database, 
    User, Lock, AlertTriangle, Search, Filter 
} from 'lucide-react';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const GlobalAuditLogs = () => {
    const [logs, setLogs] = useState([
        { id: 101, user: 'Admin', event: 'System Config Change', module: 'Auth', status: 'Success', time: '2 mins ago', severity: 'low' },
        { id: 102, user: 'John Doe', event: 'Failed Login Attempt', module: 'Login', status: 'Blocked', time: '15 mins ago', severity: 'medium' },
        { id: 103, user: 'Stripe', event: 'Payment Webhook Sync', module: 'Finance', status: 'Success', time: '1 hour ago', severity: 'low' },
        { id: 104, user: 'System', event: 'High Memory Usage', module: 'Server', status: 'Warning', time: '2 hours ago', severity: 'high' },
        { id: 105, user: 'Alice Smith', event: 'Event Deleted', module: 'Events', status: 'Success', time: '5 hours ago', severity: 'medium' },
    ]);

    const getSeverityColor = (s) => {
        switch(s) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            default: return '#10b981';
        }
    };

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        card: { background: CARD_BG, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' },
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', background: '#f8fafc', borderBottom: `1px solid ${BORDER}` },
        td: { padding: '16px 24px', fontSize: 13, color: TEXT_DARK, borderBottom: `1px solid ${BORDER}` }
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Audit Logs" breadcrumb="Dashboard" />

                <div style={s.content}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                        {[
                            { label: 'Security Events', value: 24, icon: ShieldAlert, color: '#ef4444' },
                            { label: 'Access Logs', value: '1.2k', icon: User, color: ACCENT },
                            { label: 'System Changes', value: 8, icon: Database, color: '#6366f1' },
                            { label: 'Failures', value: 3, icon: AlertTriangle, color: '#f59e0b' }
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
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                                    <input placeholder="Filter logs..." style={{ padding: '6px 12px 6px 30px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12, outline: 'none' }} />
                                </div>
                                <button style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Filter size={14} /> Filter</button>
                            </div>
                        </div>
                        <table style={s.table}>
                            <thead>
                                <tr>
                                    {['ID', 'User', 'Event', 'Module', 'Time', 'Severity'].map(h => <th key={h} style={s.th}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td style={s.td}>#{log.id}</td>
                                        <td style={s.td}><b style={{ color: TEXT_DARK }}>{log.user}</b></td>
                                        <td style={s.td}>{log.event}</td>
                                        <td style={s.td}><span style={{ padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', fontSize: 11 }}>{log.module}</span></td>
                                        <td style={s.td}>{log.time}</td>
                                        <td style={s.td}>
                                            <span style={{ padding: '4px 10px', borderRadius: 20, background: getSeverityColor(log.severity) + '15', color: getSeverityColor(log.severity), fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                                                {log.severity}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GlobalAuditLogs;
