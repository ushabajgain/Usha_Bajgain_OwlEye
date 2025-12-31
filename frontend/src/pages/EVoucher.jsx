import React, { useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, Printer, ArrowLeft, Calendar, MapPin, Hash, User, Ban, CameraOff, VolumeX, Dog, Bike, CheckCircle } from 'lucide-react';
import C from '../utils/colors';
import PageHeader from '../components/PageHeader';

const HEADER_BG = C.navy;
const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const EVoucher = () => {
    const ticketRef = useRef(null);
    const location = useLocation();
    const passedTicket = location.state?.ticket;

    const ticketData = {
        name: passedTicket?.user_name || 'Jackson Moore',
        event: passedTicket?.event_details?.name || 'Echo Beats Festival',
        invoiceId: passedTicket?.id ? `TX-${passedTicket.id.substring(0, 8).toUpperCase()}` : 'TX-2026-ECHO',
        category: 'Silver',
        seat: 'B-12',
        gate: 'Gate 3',
        venue: passedTicket?.event_details?.venue_address || 'Festival Grounds, Kathmandu',
        date: passedTicket?.event_details?.start_datetime ? new Date(passedTicket.event_details.start_datetime).toLocaleDateString() : 'June 20, 2026',
        time: passedTicket?.event_details?.start_datetime ? new Date(passedTicket.event_details.start_datetime).toLocaleTimeString() : '18:00 – 04:00',
        qrToken: passedTicket?.qr_token || 'OWLEYE-TICKET-TOKEN-SECURE-7890',
    };

    const handleDownload = async () => {
        if (!ticketRef.current) return;
        const canvas = await html2canvas(ticketRef.current, { useCORS: true, scale: 3, backgroundColor: '#fff' });
        const link = document.createElement('a');
        link.download = `Ticket_${ticketData.invoiceId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const s = {
        shell: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif" },
        main: { flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column' },
        topBar: { background: HEADER_BG, color: '#fff', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 100 },
        content: { padding: '28px 32px' },
        // ticket card
        ticketCard: { background: CARD_BG, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', border: `1px solid ${BORDER}`, overflow: 'hidden', display: 'flex', marginBottom: 24 },
        poster: { width: 340, flexShrink: 0, position: 'relative' },
        dataSection: { flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: `1px solid ${BORDER}` },
        qrSection: { width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px', background: CONTENT_BG },
        metaLabel: { fontSize: 10, fontWeight: 700, color: TEXT_MID, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 },
        metaValue: { fontSize: 13, fontWeight: 700, color: TEXT_DARK },
        bottomGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
        bottomCard: { background: CARD_BG, borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${BORDER}` },
    };

    return (
        <div style={s.shell}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="My Ticket" breadcrumb="Dashboard" />
                {/* Action buttons row */}
                <div style={{ display: 'flex', gap: 8, padding: '10px 28px', background: CARD_BG, borderBottom: `1px solid ${BORDER}` }}>
                    <button onClick={handleDownload} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Download size={14} /> Download
                    </button>
                    <button onClick={() => window.print()} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#f8fafc', color: TEXT_MID, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Printer size={14} /> Print
                    </button>
                </div>

                <div style={s.content}>
                    {/* Back link */}
                    <div style={{ marginBottom: 20 }}>
                        <Link to="/bookings" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: TEXT_MID, textDecoration: 'none', fontWeight: 600 }}>
                            <ArrowLeft size={14} /> Back to Bookings
                        </Link>
                    </div>

                    {/* Ticket */}
                    <div ref={ticketRef} style={s.ticketCard}>
                        {/* Poster */}
                        <div style={{ ...s.poster }}>
                            <img src="https://images.unsplash.com/photo-1540039155732-68087418a1a3?auto=format&fit=crop&q=80"
                                alt={ticketData.event} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)' }} />
                            <div style={{ position: 'absolute', bottom: 20, left: 20 }}>
                                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>{ticketData.event}</h2>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#86efac', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle size={14} color="#86efac" /> Confirmed Ticket
                                </span>
                            </div>
                        </div>

                        {/* Details */}
                        <div style={s.dataSection}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 20px', marginBottom: 20 }}>
                                {[
                                    { label: 'Name', val: ticketData.name, icon: User },
                                    { label: 'Booking ID', val: ticketData.invoiceId, icon: Hash },
                                    { label: 'Ticket Type', val: ticketData.category, icon: null },
                                    { label: 'Seat', val: ticketData.seat, icon: null },
                                    { label: 'Gate', val: ticketData.gate, icon: null },
                                    { label: 'Time', val: ticketData.time, icon: Calendar },
                                ].map((item, i) => (
                                    <div key={i}>
                                        <p style={s.metaLabel}>{item.label}</p>
                                        <p style={s.metaValue}>{item.val}</p>
                                    </div>
                                ))}
                            </div>
                            <div style={{ paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
                                <p style={s.metaLabel}>Venue</p>
                                <p style={{ fontSize: 13, color: TEXT_MID, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <MapPin size={13} color={ACCENT} /> {ticketData.venue}
                                </p>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div style={s.qrSection}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_DARK, marginBottom: 14, textAlign: 'center' }}>Scan to Enter</p>
                            <div style={{ background: '#fff', padding: 12, borderRadius: 12, border: `1px solid ${BORDER}`, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <QRCodeSVG value={ticketData.qrToken} size={130} level="H" bgColor="#ffffff" fgColor="#1e293b" />
                            </div>
                            <p style={{ fontSize: 11, color: TEXT_MID, marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>Show this QR code at the gate for entry.</p>
                        </div>
                    </div>

                    {/* Bottom grid */}
                    <div style={s.bottomGrid}>
                        {/* Schedule */}
                        <div style={s.bottomCard}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} color={ACCENT} /> Event Schedule</p>
                            {[
                                { time: '18:00', label: 'Doors Open' },
                                { time: '20:00', label: 'Opening Acts' },
                                { time: '22:00', label: 'Main Performance' },
                                { time: '02:00', label: 'Event Ends' },
                            ].map((step, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, marginBottom: 8, background: CONTENT_BG }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT, width: 44 }}>{step.time}</span>
                                    <span style={{ fontSize: 13, color: TEXT_DARK }}>{step.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Not allowed */}
                        <div style={s.bottomCard}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 14 }}>Not Allowed Inside</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                                {[
                                    { icon: Ban, label: 'Weapons' },
                                    { icon: CameraOff, label: 'Recording' },
                                    { icon: VolumeX, label: 'Loud devices' },
                                    { icon: Dog, label: 'Pets' },
                                    { icon: Bike, label: 'Bicycles' },
                                ].map((item, i) => (
                                    <div key={i} style={{ textAlign: 'center' }}>
                                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                                            <item.icon size={18} color="#dc2626" />
                                        </div>
                                        <p style={{ fontSize: 10, color: TEXT_MID }}>{item.label}</p>
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: 12, color: TEXT_MID, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>All applicable laws apply inside the event venue.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EVoucher;
