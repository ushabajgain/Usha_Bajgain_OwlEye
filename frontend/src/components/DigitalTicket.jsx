import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, X, Loader2 } from 'lucide-react';
import C from '../utils/colors';

const DigitalTicket = ({ ticket, onClose, showModal = true }) => {
    const ticketRef = useRef();
    const [isDownloading, setIsDownloading] = React.useState(false);

    if (!ticket) return null;

    const event = ticket.event_details || {};
    const pkg = ticket.package_details || {};

    const handleDownload = async () => {
        const element = document.getElementById('digital-ticket-container');
        if (!element) return;

        setIsDownloading(true);
        try {
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            const images = element.querySelectorAll('img');
            const imagePromises = Array.from(images).map(img => {
                return new Promise((resolve) => {
                    if (img.complete) {
                        resolve();
                    } else {
                        img.onload = resolve;
                        img.onerror = resolve;
                    }
                });
            });
            await Promise.all(imagePromises);

            await new Promise(resolve => setTimeout(resolve, 1000));

            const width = element.offsetWidth;
            const height = element.offsetHeight;

            const canvas = await html2canvas(element, {
                width: width,
                height: height,
                scale: 2,
                useCORS: true,
                backgroundColor: null,
                logging: false,
                imageTimeout: 15000,
                allowTaint: false,
                windowHeight: height,
                windowWidth: width,
                foreignObjectRendering: true,
                onclone: (clonedDocument) => {
                    const clonedElement = clonedDocument.getElementById('digital-ticket-container');
                    if (clonedElement) {
                        clonedElement.style.margin = '0';
                        clonedElement.style.padding = '0';
                        clonedElement.style.position = 'relative';
                        clonedElement.style.display = 'flex';
                        
                        const imgs = clonedElement.querySelectorAll('img');
                        imgs.forEach(img => {
                            img.style.margin = '0';
                            img.style.padding = '0';
                            img.style.display = 'block';
                        });
                    }
                }
            });

            const shortId = (ticket.id || 'ticket').toString().split('-')[0];
            const fileName = `ticket-${shortId}.png`;

            canvas.toBlob((blob) => {
                if (!blob) return;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 200);
            }, 'image/png');
        } catch (err) {
            console.error("Download failed:", err);
        } finally {
            setIsDownloading(false);
        }
    };

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

    const ticketContent = (
        <div
            id="digital-ticket-container"
            ref={ticketRef}
            style={{
                width: '100%',
                minHeight: 400,
                background: '#EAEBFF',
                borderRadius: 24,
                display: 'flex',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                position: 'relative',
                fontFamily: "'Inter', sans-serif",
                margin: 0,
                padding: 0,
                border: 'none'
            }}
        >
            {/* ── LEFT: Image + Overlay ── */}
            <div style={{ width: '30%', minHeight: 400, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                <img
                    src={event.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', margin: 0, padding: 0 }}
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
                    {/* Category badge */}
                    <div style={{
                        display: 'inline-block',
                        background: 'rgba(17, 14, 58, 0.85)',
                        color: '#fff',
                        height: '22px',
                        lineHeight: '22px',
                        padding: '0 14px',
                        borderRadius: '11px',
                        border: 'rgba(255,255,255,0.15)',
                        fontSize: '10px',
                        fontWeight: '700',
                        letterSpacing: '0.05em',
                        textTransform: 'capitalize',
                        textAlign: 'center'
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
                    <div style={{ fontSize: 16, fontWeight: 800, color: pkg.color || C.primary }}>
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
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <QRCodeSVG
                        value={ticket.qr_token}
                        size={120}
                        level="H"
                        includeMargin={true}
                        fgColor="#110E3A"
                        bgColor="#ffffff"
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

    if (!showModal) {
        return ticketContent;
    }

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
            backdropFilter: 'blur(8px)',
            fontFamily: "'Inter', sans-serif"
        }} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={{ width: '100%', maxWidth: 960, position: 'relative' }}>
                {/* Action buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 16 }}>
                    <button
                        onClick={handleDownload}
                        style={{
                            padding: '12px 24px', borderRadius: 12,
                            background: C.primary, color: '#fff', border: 'none',
                            fontWeight: 700, fontSize: 14,
                            display: 'flex', alignItems: 'center', gap: 10,
                            cursor: 'pointer',
                            boxShadow: '0 8px 16px rgba(79,70,229,0.3)'
                        }}
                    >
                        {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        {isDownloading ? 'Downloading...' : 'Download Ticket'}
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            width: 44, height: 44, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ─── TICKET ─── */}
                {ticketContent}
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default DigitalTicket;
