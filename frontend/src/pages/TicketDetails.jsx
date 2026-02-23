import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import DigitalTicket from '../components/DigitalTicket';
import api from '../utils/api';
import C from '../utils/colors';
import { Loader2, Download, Share2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import Footer from '../components/Footer';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const TicketDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        fetchTicket();
    }, [id]);

    const fetchTicket = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/tickets/my-tickets/`);
            const found = res.data.find(t => t.id === id);
            if (found) {
                setTicket(found);
            } else {
                setError('Ticket not found');
            }
        } catch (err) {
            setError('Failed to load ticket details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        const element = document.getElementById('digital-ticket-container');
        if (!element) return;

        setIsDownloading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 200));
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#EAEBFF',
                logging: false,
                imageTimeout: 0,
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

    if (loading) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <Loader2 size={40} style={{ color: ACCENT, animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 16 }} />
                        <p style={{ fontSize: 14, color: TEXT_MID, margin: 0 }}>Loading ticket...</p>
                    </div>
                                <Footer />
            </main>
                <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column' }}>
                    <PageHeader title="Ticket Details" breadcrumb="My Events" />
                    <div style={{ padding: '40px 32px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center', maxWidth: 400 }}>
                            <div style={{ width: 80, height: 80, background: '#fee2e2', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <AlertCircle size={40} color="#dc2626" />
                            </div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK, margin: '0 0 8px 0' }}>Ticket Not Found</h2>
                            <p style={{ fontSize: 14, color: TEXT_MID, margin: '0 0 20px 0' }}>{error || 'The ticket you are looking for could not be found.'}</p>
                            <button onClick={() => navigate('/attendee/my-events')} style={{ padding: '10px 24px', background: ACCENT, color: '#fff', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Go Back to My Events</button>
                        </div>
                    </div>
                                <Footer />
            </main>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <PageHeader title="Ticket Details" breadcrumb="My Events" />

                <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto' }}>
                    {/* Back Button */}
                    <button 
                        onClick={() => navigate('/attendee/my-events')}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_MID, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 24 }}
                    >
                        <ArrowLeft size={16} /> Back to My Events
                    </button>

                    {/* Ticket Card */}
                    <div style={{ background: CARD_BG, borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                        
                        {/* Header */}
                        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT_DARK, margin: '0 0 8px 0' }}>{ticket.event_details.name}</h1>
                                <p style={{ fontSize: 14, color: TEXT_MID, margin: 0 }}>{ticket.event_details.category}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: ticket.status === 'issued' || ticket.status === 'scanned' ? '#f0fdf4' : '#fef2f2', color: ticket.status === 'issued' || ticket.status === 'scanned' ? '#16a34a' : '#dc2626', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                                    <CheckCircle size={14} /> {ticket.status === 'issued' || ticket.status === 'scanned' ? 'Valid' : 'Cancelled'}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '32px' }}>
                            <div style={{ marginBottom: 32 }}>
                                <DigitalTicket ticket={ticket} showModal={false} />
                            </div>

                            {/* Ticket Information */}
                            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, margin: '0 0 16px 0' }}>Ticket Information</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 4px 0', fontWeight: 600, textTransform: 'uppercase' }}>Ticket ID</p>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>{ticket.id.split('-')[0]}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 4px 0', fontWeight: 600, textTransform: 'uppercase' }}>Ticket Type</p>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>{ticket.package_details?.name || 'Standard'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 4px 0', fontWeight: 600, textTransform: 'uppercase' }}>Price</p>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: ACCENT, margin: 0 }}>Rs. {parseFloat(ticket.price_at_purchase).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 4px 0', fontWeight: 600, textTransform: 'uppercase' }}>Purchased Date</p>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>{new Date(ticket.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 4px 0', fontWeight: 600, textTransform: 'uppercase' }}>Event Date</p>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>{new Date(ticket.event_details.start_datetime).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 11, color: TEXT_MID, margin: '0 0 4px 0', fontWeight: 600, textTransform: 'uppercase' }}>Event Time</p>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>{new Date(ticket.event_details.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Event Location */}
                            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK, margin: '0 0 12px 0' }}>Event Location</h3>
                                <p style={{ fontSize: 14, color: TEXT_DARK, margin: 0 }}>{ticket.event_details.venue_address || 'Online Event'}</p>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={handleDownload} disabled={isDownloading} style={{ flex: 1, padding: '12px 20px', background: ACCENT, color: '#fff', borderRadius: 10, border: 'none', fontWeight: 700, cursor: isDownloading ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isDownloading ? 0.7 : 1 }}>
                                    {isDownloading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />} {isDownloading ? 'Downloading...' : 'Download Ticket'}
                                </button>
                                <button style={{ flex: 1, padding: '12px 20px', background: '#f1f5f9', color: TEXT_DARK, borderRadius: 10, border: `1px solid ${BORDER}`, fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <Share2 size={16} /> Share Ticket
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                            <Footer />
            </main>
        </div>
    );
};

export default TicketDetails;
