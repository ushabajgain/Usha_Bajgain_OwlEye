import React from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Ticket, FileText,
    Calendar, Map, ShieldAlert, QrCode,
    Activity, History, AlertTriangle, LogOut,
    Eye, Ambulance, Siren, Building, Settings, Users,
    Globe, TrendingUp, Bell, Shield
} from 'lucide-react';
import api from '../utils/api';
import C from '../utils/colors';
import { getRole, getRefreshToken, clearAuth } from '../utils/auth';

const navSections = [
    {
        label: null,
        items: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard', roles: ['admin'] },
            { name: 'Dashboard', icon: LayoutDashboard, path: '/organizer/dashboard', roles: ['organizer'] },
            { name: 'Dashboard', icon: LayoutDashboard, path: '/volunteer/dashboard', roles: ['volunteer'] },
            { name: 'Dashboard', icon: LayoutDashboard, path: '/attendee/dashboard', roles: ['attendee'] },
        ],
    },
    {
        label: 'Platform Administration',
        items: [
            { name: 'User Management', icon: Users, path: '/admin/users', roles: ['admin'] },
            { name: 'Event Management', icon: Globe, path: '/admin/events', roles: ['admin'] },
            { name: 'Incident Control', icon: ShieldAlert, path: '/admin/incidents', roles: ['admin'] },
            { name: 'SOS Monitoring', icon: Siren, path: '/admin/sos', roles: ['admin'] },
            { name: 'Volunteers', icon: Users, path: '/admin/volunteers', roles: ['admin'] },
            { name: 'Audit Logs', icon: History, path: '/admin/logs', roles: ['admin'] },
            { name: 'Finances', icon: TrendingUp, path: '/admin/finances', roles: ['admin'] },
            { name: 'Settings', icon: Settings, path: '/settings', roles: ['admin'] },
        ],
    },
    {
        label: 'Event Control',
        items: [
            { name: 'My Events', icon: Calendar, path: '/events', roles: ['organizer'] },
            { name: 'Live Map', icon: Map, path: '/organizer/live-map', roles: ['volunteer', 'organizer'] },
        ],
    },
    {
        label: 'Safety Operations',
        items: [
            { name: 'Incidents', icon: AlertTriangle, path: '/organizer/incidents', roles: ['organizer'] },
            { name: 'Assigned Tasks', icon: Shield, path: '/volunteer/assigned', roles: ['volunteer'] },
            { name: 'SOS Alerts', icon: Siren, path: '/organizer/sos', roles: ['organizer'] },
            { name: 'SOS Alerts', icon: Siren, path: '/volunteer/sos', roles: ['volunteer'] },
            { name: 'Report Incident', icon: AlertTriangle, path: '/report-incident', roles: ['attendee'] },
            { name: 'SOS', icon: Siren, path: '/attendee/sos', roles: ['attendee'] },
            { name: 'Volunteers', icon: Users, path: '/organizer/volunteers', roles: ['organizer'] },
            { name: 'My Status', icon: Activity, path: '/volunteer/status', roles: ['volunteer'] },
        ],
    },
    {
        label: 'Attendee Records',
        items: [
            { name: 'Events', icon: Calendar, path: '/events', roles: ['attendee'] },
            { name: 'My Events', icon: Calendar, path: '/attendee/my-events', roles: ['attendee'] },
            { name: 'Tickets', icon: Ticket, path: '/bookings', roles: ['organizer'] },

            { name: 'Bookings', icon: History, path: '/bookings', roles: ['attendee'] },
            { name: 'Invoices', icon: FileText, path: '/invoices', roles: ['attendee', 'organizer'] },
        ],
    },
    {
        label: 'Support',
        items: [
            { name: 'Notifications', icon: Bell, path: '/notifications', roles: ['attendee', 'volunteer', 'organizer', 'admin'] },
            { name: 'Settings', icon: Settings, path: '/settings', roles: ['attendee', 'volunteer', 'organizer'] },
        ],
    },
];

// ── colours (design-system tokens) ──────────────────────────────────────────
const BG = C.navy;          // #1E293B – dark indigo sidebar bg
const BG_ACTIVE = C.primary;       // #4F46E5 – active item
const BG_HOVER = C.sidebarHover;  // #334155 – hover item
const TEXT = C.sidebarText;   // #E5E7EB – sidebar text
const TEXT_ACT = '#ffffff';       // white   – active item text
const BORDER = 'rgba(255,255,255,0.08)'; // subtle divider

import { useSafety } from '../context/SafetySocketContext';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const userRole = getRole() || 'attendee';
    const { unreadCount } = useSafety();

    const handleLogout = async () => {
        try {
            const refresh = getRefreshToken();
            if (refresh) await api.post('/accounts/logout/', { refresh });
        } catch (_) { }
        clearAuth();
        navigate('/login');
    };

    const s = {
        aside: {
            width: 230, minHeight: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 200,
            background: BG, display: 'flex', flexDirection: 'column',
            boxShadow: '2px 0 12px rgba(0,0,0,0.25)', fontFamily: "'Inter','Segoe UI',sans-serif",
        },
        logo: {
            height: 72, padding: '0 20px', borderBottom: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
            flexShrink: 0,
        },
        logoIcon: {
            width: 38, height: 38, background: C.primary, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 900, color: '#ffffff',
        },
        logoText: { fontSize: 14, fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', lineHeight: 1.2 },
        logoSub: { fontSize: 10, color: C.sidebarText, marginTop: 2, opacity: 0.7 },
        nav: { flex: 1, overflowY: 'auto', padding: '12px 0' },
        section: { marginBottom: 4 },
        sectionLabel: {
            padding: '10px 20px 4px', fontSize: 10, fontWeight: 700,
            color: C.sidebarText, opacity: 0.45, textTransform: 'uppercase', letterSpacing: '0.12em',
        },
        link: (active) => ({
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 20px', margin: '1px 8px', borderRadius: 8,
            textDecoration: 'none', fontSize: 13, fontWeight: active ? 700 : 500,
            color: active ? TEXT_ACT : TEXT,
            background: active ? BG_ACTIVE : 'transparent',
            transition: 'all 0.15s', position: 'relative'
        }),
        badge: {
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800,
            minWidth: 18, height: 18, borderRadius: 9, display: 'flex', 
            alignItems: 'center', justifyContent: 'center', padding: '0 4px',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
        },
        bottom: { padding: '12px 8px', borderTop: `1px solid ${BORDER}` },
        logoutBtn: {
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500,
            transition: 'all 0.15s',
        },
    };

    return (
        <>
            <aside style={s.aside}>
                <Link to="/" style={s.logo}>
                    <div style={s.logoIcon}><Eye size={20} /></div>
                    <div>
                        <div style={s.logoText}>OwlEye</div>
                        <div style={s.logoSub}>Event Management</div>
                    </div>
                </Link>

                <nav style={s.nav}>
                    {navSections.map((section, si) => {
                        const visible = section.items.filter(item => item.roles.includes(userRole));
                        if (!visible.length) return null;
                        return (
                            <div key={si} style={s.section}>
                                {section.label && (
                                    <div style={s.sectionLabel}>{section.label}</div>
                                )}
                                {visible.map(item => {
                                    const active = location.pathname.startsWith(item.path);
                                    const isNotify = item.name === 'Notifications';
                                    return (
                                        <NavLink
                                            key={`${item.name}-${item.path}`}
                                            to={item.path}
                                            style={s.link(active)}
                                            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = BG_HOVER; e.currentTarget.style.color = '#fff'; } }}
                                            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT; } }}
                                        >
                                            <item.icon size={16} style={{ flexShrink: 0 }} />
                                            {item.name}
                                            {isNotify && unreadCount > 0 && (
                                                <div style={s.badge}>{unreadCount > 99 ? '99+' : unreadCount}</div>
                                            )}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>

                {/* ── bottom actions ── */}
                <div style={s.bottom}>
                    <button style={s.logoutBtn} onClick={handleLogout}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                        <LogOut size={16} /> Log Out
                    </button>
                </div>
            </aside>

        </>
    );
};

export default Sidebar;
