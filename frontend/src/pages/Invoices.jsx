import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
    Search, Download, Clock, AlertCircle,
    MoreHorizontal, Filter, Plus, ChevronLeft,
    ChevronRight, Edit, CreditCard,
    Calendar as CalendarIcon, Loader2
} from 'lucide-react';
import api from '../utils/api';
import { getRole } from '../utils/auth';
import C from '../utils/colors';
import PageHeader from '../components/PageHeader';

import { jsPDF } from 'jspdf';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const Invoices = () => {
    const isStaff = ['organizer', 'admin'].includes(getRole());
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedInv, setSelectedInv] = useState(null);
    const [downloading, setDownloading] = useState(false);


    const handleDownloadPDF = async () => {
        if (!selectedInv) return;

        setDownloading(true);
        await new Promise(r => setTimeout(r, 600));
        try {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const W = pdf.internal.pageSize.getWidth();  // ~595
            const L = 60;             // left margin
            const R = W - 60;         // right edge
            const CW = R - L;         // content width

            // ── Top accent stripe ──
            pdf.setFillColor(79, 70, 229);
            pdf.rect(0, 0, W * 0.4, 6, 'F');
            pdf.setFillColor(6, 182, 212);
            pdf.rect(W * 0.4, 0, W * 0.3, 6, 'F');
            pdf.setFillColor(236, 72, 153);
            pdf.rect(W * 0.7, 0, W * 0.3, 6, 'F');

            let y = 45;

            pdf.setFillColor(79, 70, 229);
            pdf.roundedRect(L, y, 30, 30, 5, 5, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(15);
            pdf.setFont('helvetica', 'bold');
            pdf.text('O', L + 10.5, y + 20);

            pdf.setTextColor(17, 24, 39);
            pdf.setFontSize(17);
            pdf.text('OwlEye Events', L + 42, y + 20);

            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.text('', L, y + 50);
            pdf.text('', L, y + 64);

            pdf.setTextColor(156, 163, 175);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.text('INVOICE', R, y, { align: 'right' });

            pdf.setTextColor(17, 24, 39);
            pdf.setFontSize(22);
            pdf.text(`#${selectedInv.id}`, R, y + 26, { align: 'right' });

            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(selectedInv.date, R, y + 46, { align: 'right' });

            const isPaid = selectedInv.status === 'Paid';
            const bW = 50;
            pdf.setFillColor(...(isPaid ? [5, 150, 105] : [217, 119, 6]));
            pdf.roundedRect(R - bW, y + 56, bW, 18, 9, 9, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.text(selectedInv.status, R - bW / 2, y + 68, { align: 'center' });

            y = 135;
            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.5);
            pdf.line(L, y, R, y);

            y = 165;
            pdf.setFillColor(248, 250, 252);
            pdf.roundedRect(L, y, CW, 75, 10, 10, 'F');
            pdf.setDrawColor(229, 231, 235);
            pdf.roundedRect(L, y, CW, 75, 10, 10, 'S');

            pdf.setTextColor(79, 70, 229);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.text('BILLED TO', L + 20, y + 22);

            pdf.setTextColor(17, 24, 39);
            pdf.setFontSize(14);
            pdf.text(selectedInv.customer, L + 20, y + 44);

            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(selectedInv.email, L + 20, y + 62);


            // ═══════════════════════════════════════
            // ITEMS TABLE  (y = 280+)
            // ═══════════════════════════════════════
            y = 280;

            // Column positions (well-spaced)
            const c1 = L + 16;
            const c2 = L + CW * 0.52;
            const c3 = L + CW * 0.72;
            const c4 = R - 16;

            // Table header
            pdf.setFillColor(248, 250, 252);
            pdf.roundedRect(L, y, CW, 32, 6, 6, 'F');

            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.text('ITEM', c1, y + 21);
            pdf.text('QTY', c2, y + 21, { align: 'center' });
            pdf.text('UNIT PRICE', c3, y + 21, { align: 'center' });
            pdf.text('AMOUNT', c4, y + 21, { align: 'right' });

            y += 32;
            pdf.setDrawColor(229, 231, 235);
            pdf.line(L, y, R, y);

            // Group tickets by package
            const groups = {};
            if (selectedInv.tickets && selectedInv.tickets.length > 0) {
                selectedInv.tickets.forEach(t => {
                    const pkgName = t.package_details?.name || 'Standard';
                    if (!groups[pkgName]) {
                        groups[pkgName] = { name: pkgName, count: 0, unitPrice: 0, total: 0 };
                    }
                    groups[pkgName].count += 1;
                    groups[pkgName].unitPrice = parseFloat(t.price_at_purchase || 0);
                    groups[pkgName].total += parseFloat(t.price_at_purchase || 0);
                });
            } else {
                groups['Tickets'] = { name: 'Standard', count: 1, unitPrice: parseFloat(selectedInv.raw_amount || 0), total: parseFloat(selectedInv.raw_amount || 0) };
            }

            // Table rows (generous 55pt per row)
            y += 10;
            Object.values(groups).forEach(g => {
                // Event name
                pdf.setTextColor(17, 24, 39);
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                pdf.text(selectedInv.event_name, c1, y + 20);

                // Package name
                pdf.setTextColor(79, 70, 229);
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                pdf.text(g.name, c1, y + 36);

                // Qty
                pdf.setTextColor(17, 24, 39);
                pdf.setFontSize(10);
                pdf.text(String(g.count), c2, y + 26, { align: 'center' });

                // Unit price
                pdf.setTextColor(107, 114, 128);
                pdf.text(`Rs. ${g.unitPrice.toLocaleString()}`, c3, y + 26, { align: 'center' });

                // Amount
                pdf.setTextColor(17, 24, 39);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Rs. ${g.total.toLocaleString()}`, c4, y + 26, { align: 'right' });

                y += 55;
                pdf.setDrawColor(241, 245, 249);
                pdf.line(L + 10, y, R - 10, y);
                y += 5;
            });


            // ═══════════════════════════════════════
            // TOTALS  (40pt gap after table)
            // ═══════════════════════════════════════
            y += 40;
            const tL = R - 220;

            // Subtotal
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(11);
            pdf.text('Subtotal', tL, y);
            pdf.setTextColor(17, 24, 39);
            pdf.setFont('helvetica', 'bold');
            pdf.text(selectedInv.amount, R, y, { align: 'right' });

            // Tax (30pt below)
            y += 30;
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(107, 114, 128);
            pdf.text('Tax', tL, y);
            pdf.setTextColor(17, 24, 39);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Rs. 0', R, y, { align: 'right' });

            // Divider line
            y += 18;
            pdf.setDrawColor(229, 231, 235);
            pdf.line(tL, y, R, y);

            // Total (30pt below divider)
            y += 30;
            pdf.setFontSize(18);
            pdf.setTextColor(17, 24, 39);
            pdf.text('Total', tL, y);
            pdf.setTextColor(79, 70, 229);
            pdf.text(selectedInv.amount, R, y, { align: 'right' });


            // ═══════════════════════════════════════
            // FOOTER  (70pt gap)
            // ═══════════════════════════════════════
            y += 70;
            pdf.setFillColor(238, 242, 255);
            pdf.roundedRect(L, y, CW, 65, 10, 10, 'F');
            pdf.setDrawColor(221, 214, 254);
            pdf.roundedRect(L, y, CW, 65, 10, 10, 'S');

            pdf.setTextColor(79, 70, 229);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Thank you for your purchase!', W / 2, y + 26, { align: 'center' });

            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.text('This invoice was generated automatically by OwlEye Events.', W / 2, y + 44, { align: 'center' });
            pdf.text('For questions, contact support@owleye.com', W / 2, y + 56, { align: 'center' });

            // Save
            pdf.save(`Invoice-${selectedInv.id}.pdf`);
        } catch (err) {
            console.error('PDF generation failed:', err);
        } finally {
            setDownloading(false);
        }
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const endpoint = isStaff ? '/tickets/organizer-orders/' : '/tickets/my-orders/';
                const res = await api.get(endpoint);
                const transformed = res.data.map(o => ({
                    id: o.id.split('-')[0].toUpperCase(),
                    date: new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    amount: `Rs. ${Number(o.total_amount).toLocaleString()}`,
                    status: o.status.charAt(0).toUpperCase() + o.status.slice(1),
                    customer: `${o.first_name} ${o.last_name}`,
                    email: o.email,
                    event_name: o.event_name,
                    tickets: o.tickets,
                    raw_amount: o.total_amount,
                    timestamp: new Date(o.created_at)
                }));
                setInvoices(transformed);
                if (transformed.length > 0) setSelectedInv(transformed[0]);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             inv.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             inv.customer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const s = {
        shell: { display: 'flex', minHeight: '100vh', background: CONTENT_BG, fontFamily: "'Inter','Segoe UI',sans-serif", overflowX: 'hidden' },
        main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column', minWidth: 0 },
        content: { padding: '28px 32px', display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, flex: 1, alignItems: 'start' },

        statCard: (color) => ({
            background: CARD_BG, borderRadius: 16, padding: '16px', border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden'
        }),
        statIndicator: (color) => ({
            position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: '50%', background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }),

        leftPanel: { display: 'flex', flexDirection: 'column', gap: 20 },
        invListCard: { background: CARD_BG, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px' },
        invItem: (active) => ({
            width: '100%', padding: '16px', borderRadius: 14, border: active ? `2px solid ${ACCENT}` : `1.5px solid ${BORDER}`, background: active ? ACCENT + '08' : 'transparent', cursor: 'pointer', textAlign: 'left', marginBottom: 16, transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }),

        rightPanel: { background: CARD_BG, borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden', minHeight: 600, display: 'flex', flexDirection: 'column' },
        invDetailHeader: { padding: '20px 32px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        pinkTop: { height: 6, background: 'linear-gradient(90deg, #ec4899, #4F46E5)', width: '100%' },

        detailTable: { width: '100%', borderCollapse: 'collapse', marginTop: 24 },
        th: { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.04em', background: '#f8fafc', textAlign: 'left', borderBottom: `1px solid ${BORDER}` },
        td: { padding: '16px 16px', fontSize: 13, color: TEXT_DARK, borderBottom: `1px solid #f1f5f9` },

        actionBtn: (primary, colorOverride) => ({
            padding: '10px 20px', borderRadius: 10, border: primary ? 'none' : `1.5px solid ${BORDER}`, background: primary ? (colorOverride || ACCENT) : '#fff', color: primary ? '#fff' : TEXT_MID, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s'
        })
    };

    return (
        <div style={s.shell}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title={isStaff ? "Event Invoices" : "My Invoices"} breadcrumb="Dashboard" />

                <div style={s.content}>
                    {/* Left Panel */}
                    <div style={s.leftPanel}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            <div style={s.statCard('#16a34a')}>
                                <div style={s.statIndicator('#16a34a')}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} /></div>
                                <span style={{ fontSize: 11, color: TEXT_MID, fontWeight: 600 }}>Paid</span>
                                <p style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, margin: '4px 0' }}>{invoices.filter(i => i.status === 'Paid').length}</p>
                            </div>
                            <div style={s.statCard('#eab308')}>
                                <div style={s.statIndicator('#eab308')}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308' }} /></div>
                                <span style={{ fontSize: 11, color: TEXT_MID, fontWeight: 600 }}>Pending</span>
                                <p style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, margin: '4px 0' }}>{invoices.filter(i => i.status === 'Pending').length}</p>
                            </div>
                            <div style={s.statCard('#ef4444')}>
                                <div style={s.statIndicator('#ef4444')}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /></div>
                                <span style={{ fontSize: 11, color: TEXT_MID, fontWeight: 600 }}>Total</span>
                                <p style={{ fontSize: 20, fontWeight: 800, color: TEXT_DARK, margin: '4px 0' }}>{invoices.length}</p>
                            </div>
                        </div>

                        <div style={s.invListCard}>
                            <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT_DARK, marginBottom: 16 }}>Invoice List</h3>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                                    <input 
                                        placeholder="Search invoice" 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 13, background: '#f8fafc', outline: 'none' }} 
                                    />
                                </div>
                                <select 
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${BORDER}`, background: '#f8fafc', fontSize: 13, outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="All">All Status</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </div>
                            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                                {loading ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
                                ) : filteredInvoices.length > 0 ? filteredInvoices.map((inv, i) => (
                                    <button key={i} onClick={() => setSelectedInv(inv)} style={s.invItem(selectedInv?.id === inv.id)}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: 14, fontWeight: 800, color: TEXT_DARK, margin: '0 0 6px' }}>{inv.id}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <CalendarIcon size={12} color={TEXT_MID} />
                                                <span style={{ fontSize: 11, color: TEXT_MID, fontWeight: 600 }}>{inv.date}</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: 14, fontWeight: 800, color: ACCENT, margin: '0 0 6px' }}>{inv.amount}</p>
                                            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: inv.status === 'Paid' ? '#f0fdf4' : '#eff6ff', color: inv.status === 'Paid' ? '#16a34a' : ACCENT }}>
                                                {inv.status}
                                            </span>
                                        </div>
                                    </button>
                                )) : (
                                    <div style={{ padding: '40px 10px', textAlign: 'center', color: TEXT_MID }}>No invoices found.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel – Invoice Detail */}
                    <div style={s.rightPanel}>
                        {selectedInv ? (
                            <>
                                {/* Header bar with download button */}
                                <div style={{ 
                                    padding: '16px 32px', 
                                    borderBottom: `1px solid ${BORDER}`, 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: '#fafbff'
                                }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT_DARK, margin: 0 }}>Invoice Details</h3>
                                    <button onClick={handleDownloadPDF} disabled={downloading} style={{ ...s.actionBtn(true), padding: '8px 18px', opacity: downloading ? 0.7 : 1 }}>
                                        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                        {downloading ? 'Generating...' : 'Download PDF'}
                                    </button>
                                </div>

                                {/* ─── PDF-CAPTURED AREA ─── */}
                                <div style={{ padding: '0', overflowY: 'auto', flex: 1, background: '#fff' }}>
                                    
                                    {/* Gradient accent stripe */}
                                    <div style={{ height: 5, background: 'linear-gradient(90deg, #4F46E5, #06B6D4, #ec4899)', width: '100%' }} />

                                    <div style={{ padding: '36px 40px 40px' }}>
                                        {/* Top: Brand + Invoice meta */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>O</span>
                                                    </div>
                                                    <span style={{ fontSize: 18, fontWeight: 900, color: TEXT_DARK }}>OwlEye Events</span>
                                                </div>
                                                <p style={{ fontSize: 12, color: TEXT_MID, margin: '4px 0 0', lineHeight: 1.6 }}>
                                                    <br />
                                                </p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Invoice</div>
                                                <div style={{ fontSize: 28, fontWeight: 900, color: TEXT_DARK, letterSpacing: '-0.02em' }}>#{selectedInv.id}</div>
                                                <div style={{ marginTop: 8, display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    <span style={{ fontSize: 12, color: TEXT_MID }}>{selectedInv.date}</span>
                                                    <span style={{ 
                                                        padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                                                        background: selectedInv.status === 'Paid' ? '#ecfdf5' : '#fef3c7', 
                                                        color: selectedInv.status === 'Paid' ? '#059669' : '#d97706',
                                                        border: `1px solid ${selectedInv.status === 'Paid' ? '#a7f3d0' : '#fde68a'}`
                                                    }}>
                                                        {selectedInv.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div style={{ height: 1, background: `linear-gradient(90deg, ${BORDER}, transparent)`, marginBottom: 32 }} />

                                        {/* Bill To section */}
                                        <div style={{ 
                                            background: '#f8fafc', borderRadius: 14, padding: '20px 24px', 
                                            border: `1px solid ${BORDER}`, marginBottom: 32 
                                        }}>
                                            <div style={{ fontSize: 10, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                                                Billed To
                                            </div>
                                            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT_DARK, marginBottom: 4 }}>{selectedInv.customer}</div>
                                            <div style={{ fontSize: 13, color: TEXT_MID }}>{selectedInv.email}</div>
                                        </div>

                                        {/* Items table */}
                                        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 32 }}>
                                            {/* Table header */}
                                            <div style={{ 
                                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', 
                                                padding: '14px 24px', background: '#f8fafc', 
                                                borderBottom: `1px solid ${BORDER}` 
                                            }}>
                                                {['Item', 'Qty', 'Unit Price', 'Amount'].map((h, i) => (
                                                    <div key={h} style={{ 
                                                        fontSize: 10, fontWeight: 800, color: TEXT_MID, 
                                                        textTransform: 'uppercase', letterSpacing: '0.08em',
                                                        textAlign: i === 0 ? 'left' : 'right'
                                                    }}>{h}</div>
                                                ))}
                                            </div>
                                            {/* Table body – list each ticket */}
                                            {(selectedInv.tickets && selectedInv.tickets.length > 0) ? (
                                                (() => {
                                                    // Group tickets by package
                                                    const groups = {};
                                                    selectedInv.tickets.forEach(t => {
                                                        const pkgName = t.package_details?.name || 'Standard';
                                                        if (!groups[pkgName]) {
                                                            groups[pkgName] = { name: pkgName, count: 0, unitPrice: 0, total: 0, color: t.package_details?.color };
                                                        }
                                                        groups[pkgName].count += 1;
                                                        groups[pkgName].unitPrice = parseFloat(t.price_at_purchase || 0);
                                                        groups[pkgName].total += parseFloat(t.price_at_purchase || 0);
                                                    });
                                                    return Object.values(groups).map((g, i) => (
                                                        <div key={i} style={{ 
                                                            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', 
                                                            padding: '16px 24px', 
                                                            borderBottom: `1px solid #f1f5f9`,
                                                            alignItems: 'center'
                                                        }}>
                                                            <div>
                                                                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>{selectedInv.event_name}</div>
                                                                <div style={{ 
                                                                    fontSize: 11, fontWeight: 700, marginTop: 3,
                                                                    color: g.color || ACCENT
                                                                }}>
                                                                    {g.name}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: TEXT_DARK }}>{g.count}</div>
                                                            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: TEXT_MID }}>Rs. {g.unitPrice.toLocaleString()}</div>
                                                            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: TEXT_DARK }}>Rs. {g.total.toLocaleString()}</div>
                                                        </div>
                                                    ));
                                                })()
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '16px 24px' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>{selectedInv.event_name} Tickets</div>
                                                    <div style={{ textAlign: 'right', fontSize: 13, color: TEXT_DARK }}>1</div>
                                                    <div style={{ textAlign: 'right', fontSize: 13, color: TEXT_MID }}>{selectedInv.amount}</div>
                                                    <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: TEXT_DARK }}>{selectedInv.amount}</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Totals */}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <div style={{ width: 260 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, color: TEXT_MID }}>
                                                    <span>Subtotal</span>
                                                    <span style={{ fontWeight: 700, color: TEXT_DARK }}>{selectedInv.amount}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, color: TEXT_MID, borderBottom: `1px solid ${BORDER}` }}>
                                                    <span>Tax</span>
                                                    <span style={{ fontWeight: 700, color: TEXT_DARK }}>Rs. 0</span>
                                                </div>
                                                <div style={{ 
                                                    display: 'flex', justifyContent: 'space-between', 
                                                    padding: '14px 0 0', fontSize: 20, fontWeight: 900, color: TEXT_DARK 
                                                }}>
                                                    <span>Total</span>
                                                    <span style={{ color: ACCENT }}>{selectedInv.amount}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer note */}
                                        <div style={{ 
                                            marginTop: 40, padding: '20px 24px', borderRadius: 12, 
                                            background: 'linear-gradient(135deg, #eef2ff, #ecfeff)', 
                                            border: `1px solid #ddd6fe`,
                                            textAlign: 'center'
                                        }}>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: ACCENT, margin: '0 0 4px' }}>Thank you for your purchase!</p>
                                            <p style={{ fontSize: 11, color: TEXT_MID, margin: 0 }}>
                                                This invoice was generated automatically by OwlEye Events. For questions, contact support@owleye.com
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: TEXT_MID, gap: 16 }}>
                                <AlertCircle size={48} style={{ opacity: 0.2 }} />
                                <p>Select an invoice from the list</p>
                            </div>
                        )}
                    </div>
                </div>

                <footer style={{ padding: '24px 32px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: TEXT_MID, fontWeight: 600 }}>
                    <span>Copyright © 2026 OwlEye Events</span>
                    <div style={{ display: 'flex', gap: 24 }}>
                        <span>Privacy Policy</span>
                        <span>Term and conditions</span>
                    </div>
                </footer>
            </main>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default Invoices;
