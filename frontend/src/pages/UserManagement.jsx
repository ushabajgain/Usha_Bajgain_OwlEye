import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { usePagination, Pagination } from '../components/Pagination';
import { 
    Users, Search, Filter, MoreVertical, 
    Shield, UserCheck, UserX, Mail, Loader2 
} from 'lucide-react';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await api.get('/accounts/all-users/'); 
                const data = Array.isArray(res.data) ? res.data : res.data.results || [];
                // Transform backend keys if necessary or use directly
                const formattedUsers = data.map(u => ({
                    id: u.id,
                    name: u.full_name || 'No Name',
                    email: u.email,
                    role: u.role,
                    status: u.is_active ? 'active' : 'banned',
                    joined: new Date(u.created_at).toLocaleDateString()
                }));
                setUsers(formattedUsers);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const toggleStatus = async (id) => {
        try {
            await api.post(`/accounts/toggle-active/${id}/`);
            setUsers(users.map(u => 
                u.id === id ? { ...u, status: u.status === 'active' ? 'banned' : 'active' } : u
            ));
        } catch (err) {
            console.error("Failed to toggle status:", err);
            alert("Failed to update user status.");
        }
    };

    const changeRole = async (id, newRole) => {
        try {
            await api.post(`/accounts/update-role/${id}/`, { role: newRole });
            setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
        } catch (err) {
            console.error("Failed to change role:", err);
            alert("Failed to change user role.");
        }
    };

    const filtered = useMemo(() => {
        return users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    }, [users, search]);

    const { page, setPage, slicedItems: paginatedUsers } = usePagination(filtered, itemsPerPage);

    // Reset to first page when search changes
    useEffect(() => {
        setPage(1);
    }, [search, setPage]);

    const s = {
        container: { display: 'flex', minHeight: '100vh', background: CONTENT_BG },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column' },
        content: { padding: '24px 32px' },
        card: { background: CARD_BG, borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: `1px solid ${BORDER}`, overflow: 'hidden' },
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', background: '#f8fafc', borderBottom: `1px solid ${BORDER}` },
        td: { padding: '16px 24px', fontSize: 13, color: TEXT_DARK, borderBottom: `1px solid ${BORDER}` },
        badge: (role) => ({
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: role === 'organizer' ? '#eff6ff' : role === 'volunteer' ? '#f0fdf4' : '#f8fafc',
            color: role === 'organizer' ? '#3b82f6' : role === 'volunteer' ? '#10b981' : TEXT_MID
        }),
        status: (stat) => ({
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
            color: stat === 'active' ? '#10b981' : '#ef4444'
        })
    };

    return (
        <div style={s.container}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="User Management" breadcrumb="Dashboard" />

                <div style={s.content}>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                            <input 
                                id="user-search"
                                name="user-search"
                                placeholder="Search by name, email or UID..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ width: '100%', padding: '12px 12px 12px 48px', borderRadius: 12, border: `1px solid ${BORDER}`, outline: 'none', fontSize: 14 }}
                            />
                        </div>
                    </div>

                    <div style={s.card}>
                        <table style={s.table}>
                            <thead>
                                <tr>
                                    {['User', 'Role', 'Status', 'Joined Date', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.map(u => (
                                    <tr key={u.id}>
                                        <td style={s.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT, fontWeight: 800 }}>{u.name[0]}</div>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 700 }}>{u.name}</p>
                                                    <p style={{ margin: 0, fontSize: 12, color: TEXT_MID }}>{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={s.td}>
                                            <span style={s.badge(u.role)}>{u.role.toUpperCase()}</span>
                                        </td>
                                        <td style={s.td}>
                                            <div style={s.status(u.status)}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: u.status === 'active' ? '#10b981' : '#ef4444' }} />
                                                {u.status.toUpperCase()}
                                            </div>
                                        </td>
                                        <td style={s.td}>{u.joined}</td>
                                        <td style={s.td}>
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <button onClick={() => toggleStatus(u.id)} title={u.status === 'active' ? 'Ban User' : 'Unban User'} style={{ padding: 6, borderRadius: 8, border: 'none', background: u.status === 'active' ? '#fef2f2' : '#f0fdf4', color: u.status === 'active' ? '#dc2626' : '#16a34a', cursor: 'pointer' }}>
                                                    {u.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination 
                        page={page}
                        totalItems={filtered.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setPage}
                    />
                </div>
            </main>
        </div>
    );
};

export default UserManagement;
