import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import TicketCard from '../components/TicketCard';
import api from '../utils/api';
import C from '../utils/colors';
import { Loader2, Download, ArrowLeft, X } from 'lucide-react';
import html2canvas from 'html2canvas';

const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const EventTickets = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewingTicket, setViewingTicket] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        fetchEventAndTickets();
    }, [eventId]);

    const fetchEventAndTickets = async () => {
        setLoading(true);
        try {
            // Get all tickets for the user
            const ticketsRes = await api.get(`/tickets/my-tickets/`);
            
            // Filter tickets by event_id
            const eventTickets = ticketsRes.data.filter(t => t.event_details?.id === parseInt(eventId));
            
            if (eventTickets.length > 0) {
                setEvent(eventTickets[0].event_details);
                setTickets(eventTickets);
            } else {
                setError('No tickets found for this event');
            }
        } catch (err) {
            setError('Failed to load tickets');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (ticket) => {
        setIsDownloading(true);
        try {
            // Create a temporary container
            const tempContainer = document.createElement('div');
            tempContainer.id = 'temp-ticket-download';
            tempContainer.style.position = 'fixed';
            tempContainer.style.left = '-10000px';
            tempContainer.style.top = '0';
            tempContainer.style.width = '960px';
            tempContainer.style.zIndex = '-1';
            document.body.appendChild(tempContainer);

            // Render the TicketCard component into the container
            ReactDOM.render(<TicketCard ticket={ticket} />, tempContainer);

            // Wait for the component to render
            await new Promise(resolve => setTimeout(resolve, 500));

            // Find the ticket container within the temp container
            const ticketElement = tempContainer.querySelector('#digital-ticket-container');
            
            if (!ticketElement) {
                throw new Error('Failed to render ticket');
            }

            // Capture with html2canvas
            const canvas = await html2canvas(ticketElement, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#EAEBFF',
                logging: false,
                imageTimeout: 0,
                allowTaint: true,
            });

            // Download the image
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
                    ReactDOM.unmountComponentAtNode(tempContainer);
                    document.body.removeChild(tempContainer);
                }, 200);
            }, 'image/png');
        } catch (err) {
            console.error("Download failed:", err);
            alert('Failed to download ticket. Please try again.');
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
                        <p style={{ fontSize: 14, color: TEXT_MID, margin: 0 }}>Loading tickets...</p>
                    </div>
                </main>
                <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error || tickets.length === 0) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column' }}>
                    <PageHeader title="Event Tickets" breadcrumb="My Events" />
                    <div style={{ padding: '40px 32px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center', maxWidth: 400 }}>
                            <div style={{ width: 80, height: 80, background: '#fee2e2', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <X size={40} color="#dc2626" />
                            </div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK, margin: '0 0 8px 0' }}>No Tickets Found</h2>
                            <p style={{ fontSize: 14, color: TEXT_MID, margin: '0 0 20px 0' }}>{error || 'You have no tickets for this event.'}</p>
                            <button onClick={() => navigate('/attendee/my-events')} style={{ padding: '10px 24px', background: ACCENT, color: '#fff', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Go Back to My Events</button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Viewing a single ticket
    if (viewingTicket) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column' }}>
                    <PageHeader title="Ticket Details" breadcrumb="Event Tickets" />
                    <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto' }}>
                        <button 
                            onClick={() => setViewingTicket(null)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_MID, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 24 }}
                        >
                            <ArrowLeft size={16} /> Back to Event Tickets
                        </button>

                        <div style={{ background: CARD_BG, borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, padding: '32px', marginBottom: 32 }}>
                            <TicketCard ticket={viewingTicket} />
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button 
                                onClick={() => handleDownload(viewingTicket)} 
                                disabled={isDownloading}
                                style={{ padding: '8px 16px', background: ACCENT, color: '#fff', borderRadius: 8, border: 'none', fontWeight: 600, cursor: isDownloading ? 'not-allowed' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: isDownloading ? 0.7 : 1, whiteSpace: 'nowrap' }}
                            >
                                {isDownloading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                                {isDownloading ? 'Downloading...' : 'Download Ticket'}
                            </button>
                        </div>
                    </div>
                </main>
                <style>{`.animate-spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // Table view of all tickets for the event
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <PageHeader title="Event Tickets" breadcrumb="My Events" />

                <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto' }}>
                    <button 
                        onClick={() => navigate('/attendee/my-events')}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_MID, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 24 }}
                    >
                        <ArrowLeft size={16} /> Back to My Events
                    </button>

                    <div style={{ background: CARD_BG, borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${BORDER}` }}>
                            <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT_DARK, margin: '0 0 4px 0' }}>{event?.name}</h1>
                            <p style={{ fontSize: 13, color: TEXT_MID, margin: 0 }}>{event?.category}</p>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${BORDER}` }}>
                                        <th style={{ padding: '16px 32px', textAlign: 'left', fontWeight: 700, color: TEXT_MID, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticket Category</th>
                                        <th style={{ padding: '16px 32px', textAlign: 'left', fontWeight: 700, color: TEXT_MID, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</th>
                                        <th style={{ padding: '16px 32px', textAlign: 'left', fontWeight: 700, color: TEXT_MID, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty</th>
                                        <th style={{ padding: '16px 32px', textAlign: 'left', fontWeight: 700, color: TEXT_MID, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                                        <th style={{ padding: '16px 32px', textAlign: 'left', fontWeight: 700, color: TEXT_MID, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                        <th style={{ padding: '16px 32px', textAlign: 'left', fontWeight: 700, color: TEXT_MID, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map((ticket, idx) => (
                                        <tr key={idx} style={{ borderBottom: `1px solid ${BORDER}`, _hover: { background: '#f8fafc' } }}>
                                            <td style={{ padding: '16px 32px', color: TEXT_DARK, fontWeight: 600 }}>{ticket.package_details?.name || 'Standard'}</td>
                                            <td style={{ padding: '16px 32px', color: TEXT_DARK, fontWeight: 600 }}>Rs. {parseFloat(ticket.price_at_purchase).toLocaleString()}</td>
                                            <td style={{ padding: '16px 32px', color: TEXT_DARK }}>1</td>
                                            <td style={{ padding: '16px 32px', color: ACCENT, fontWeight: 700 }}>Rs. {parseFloat(ticket.price_at_purchase).toLocaleString()}</td>
                                            <td style={{ padding: '16px 32px' }}>
                                                <span style={{ display: 'inline-block', padding: '4px 12px', background: ticket.status === 'issued' || ticket.status === 'scanned' ? '#f0fdf4' : '#fef2f2', color: ticket.status === 'issued' || ticket.status === 'scanned' ? '#16a34a' : '#dc2626', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                                    {ticket.status === 'issued' || ticket.status === 'scanned' ? 'Confirmed' : 'Cancelled'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 32px' }}>
                                                <button 
                                                    onClick={() => setViewingTicket(ticket)}
                                                    style={{ color: ACCENT, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
                                                >
                                                    View Ticket
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EventTickets;
