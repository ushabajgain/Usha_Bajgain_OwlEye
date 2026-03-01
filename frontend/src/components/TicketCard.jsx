import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import C from '../utils/colors';
import { Calendar, Clock } from 'lucide-react';

const TicketCard = ({ ticket }) => {
    if (!ticket) return null;

    const event = ticket.event_details || {};
    const pkg = ticket.package_details || {};

    const formatDate = (dateStr) => {
        if (!dateStr) return 'TBA';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return 'TBA';
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const sep = 'rgba(17,14,58,0.08)';
    const labelColor = 'rgba(17,14,58,0.45)';
    const valueColor = '#110E3A';

    return (
        <div
            id="digital-ticket-container"
            style={{
                width: '100%',
                background: '#EAEBFF',
                borderRadius: 24,
                display: 'flex',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                position: 'relative',
                fontFamily: "'Inter', sans-serif"
            }}
        >
            {/* ── LEFT: Image + Overlay ── */}
            <div style={{ width: '30%', position: 'relative', overflow: 'hidden' }}>
                <img
                    src={event.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    alt=""
                    crossOrigin="anonymous"
                />
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(17,14,58,0.9) 10%, rgba(17,14,58,0.15) 100%)',
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'flex-end', padding: 24,
                    alignItems: 'flex-start'
                }}>
                    <h1 style={{
                        fontSize: 24, fontWeight: 900, color: '#fff',
                        margin: '0 0 8px', lineHeight: 1.1,
                        textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}>
                        {event.name}
                    </h1>
                    <div style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'rgba(255,255,255,0.85)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        textShadow: '0 1px 4px rgba(0,0,0,0.5)'
                    }}>
                        {event.category || 'Event'}
                    </div>
                </div>
            </div>

            {/* ── MIDDLE: Stacked Info Fields ── */}
            <div style={{
                flex: 1,
                padding: '28px 32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                borderRight: `2px dashed ${sep}`,
                position: 'relative'
            }}>
                {/* Punch-out cutouts */}
                <div style={{
                    position: 'absolute', width: 28, height: 28,
                    background: '#0a0a0f',
                    borderRadius: '50%', right: -14, top: -14, zIndex: 10,
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)'
                }} />
                <div style={{
                    position: 'absolute', width: 28, height: 28,
                    background: '#0a0a0f',
                    borderRadius: '50%', right: -14, bottom: -14, zIndex: 10,
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)'
                }} />

                {/* Row: Attendee */}
                <div style={{ borderBottom: `1px solid ${sep}`, paddingBottom: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        Attendee:
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: valueColor }}>
                        {ticket.user_name}
                    </div>
                </div>

                {/* Row: Ticket Type */}
                <div style={{ borderBottom: `1px solid ${sep}`, paddingBottom: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        Ticket Type:
                    </div>
                    <div style={{ 
                        fontSize: 16, 
                        fontWeight: 800, 
                        color: pkg.color || (pkg.name?.toLowerCase().includes('vip') ? '#ec4899' : C.primary) 
                    }}>
                        {pkg.name}
                    </div>
                </div>

                {/* Row: Invoice ID */}
                <div style={{ borderBottom: `1px solid ${sep}`, paddingBottom: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        Invoice ID:
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: valueColor }}>
                        INV-{ticket.order_id?.split('-')[0].toUpperCase() || 'PROMO'}
                    </div>
                </div>

                {/* Row: Date */}
                <div style={{ borderBottom: `1px solid ${sep}`, paddingBottom: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        Date:
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: valueColor }}>
                        {formatDate(event.start_datetime)}
                    </div>
                </div>

                {/* Row: Time */}
                <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        Time:
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: valueColor }}>
                        {formatTime(event.start_datetime)} – {formatTime(event.end_datetime)}
                    </div>
                </div>
            </div>

            {/* ── RIGHT: QR Code ── */}
            <div style={{
                width: '25%',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                background: 'rgba(17,14,58,0.03)'
            }}>
                {/* QR Code */}
                <div style={{
                    background: '#fff',
                    padding: 12,
                    borderRadius: 16,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    marginBottom: 16
                }}>
                    <QRCodeSVG
                        value={ticket.qr_token}
                        size={120}
                        level="H"
                        includeMargin={true}
                        fgColor="#110E3A"
                    />
                </div>

                <div style={{
                    fontSize: 10, fontWeight: 800,
                    color: labelColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 6
                }}>
                    Entry QR Code
                </div>

                <div style={{
                    fontSize: 11,
                    color: 'rgba(17,14,58,0.45)',
                    lineHeight: 1.4
                }}>
                    Scan at the entrance to validate
                </div>
            </div>
        </div>
    );
};

export default TicketCard;
