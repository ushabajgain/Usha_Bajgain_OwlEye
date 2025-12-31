import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
    CheckCircle2, Ticket, Download, ArrowLeft, Loader2,
    AlertCircle, CreditCard
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [orderData, setOrderData] = useState(null);
    const [error, setError] = useState(null);

    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                const params = new URLSearchParams();
                if (sessionId) params.append('session_id', sessionId);
                if (orderId) params.append('order_id', orderId);

                const res = await api.get(`/payments/verify/?${params.toString()}`);
                setOrderData(res.data);
            } catch (err) {
                setError('Unable to verify your payment. Please check your bookings.');
            } finally {
                setLoading(false);
            }
        };
        verifyPayment();
    }, [sessionId, orderId]);

    if (loading) return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter',sans-serif" }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, background: C.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={40} style={{ color: C.primary, animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                    <p style={{ fontSize: 16, color: C.textSecondary, fontWeight: 500 }}>Verifying your payment...</p>
                </div>
                <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </main>
        </div>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter',sans-serif" }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, background: C.background, display: 'flex', flexDirection: 'column' }}>
                <PageHeader title="Payment Confirmation" breadcrumb="Events" breadcrumbPath="/events" />

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                    {error ? (
                        <div style={{
                            background: C.surface, borderRadius: 24, padding: '60px 48px',
                            maxWidth: 520, width: '100%', textAlign: 'center',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.06)', border: `1px solid ${C.border}`
                        }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <AlertCircle size={40} color="#ef4444" />
                            </div>
                            <h1 style={{ fontSize: 26, fontWeight: 900, color: C.textPrimary, marginBottom: 12 }}>Verification Issue</h1>
                            <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.7, marginBottom: 32 }}>{error}</p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <Link to="/bookings" style={{ padding: '12px 28px', borderRadius: 12, background: C.primary, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                                    View My Tickets
                                </Link>
                                <Link to="/events" style={{ padding: '12px 28px', borderRadius: 12, border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                                    Browse Events
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            background: C.surface, borderRadius: 24, padding: '0',
                            maxWidth: 420, width: '100%', overflow: 'hidden',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.06)', border: `1px solid ${C.border}`
                        }}>
                            {/* Top gradient bar */}
                            <div style={{ height: 6, background: `linear-gradient(90deg, ${C.primary}, #10b981)` }} />

                            <div style={{ padding: '36px 24px', textAlign: 'center' }}>
                                {/* Success animation container */}
                                <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 24px' }}>
                                    <div style={{
                                        width: 88, height: 88, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #dcfce7, #f0fdf4)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        animation: 'scaleIn 0.5s ease-out'
                                    }}>
                                        <CheckCircle2 size={36} color="#16a34a" />
                                    </div>
                                </div>

                                <h1 style={{ fontSize: 24, fontWeight: 900, color: C.textPrimary, marginBottom: 8 }}>
                                    Payment Successful!
                                </h1>
                                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>
                                    Tickets confirmed. View or download them anytime from your dashboard.
                                </p>

                                {/* Order details card */}
                                {orderData && (
                                    <div style={{
                                        background: '#f8fafc', borderRadius: 16, padding: '20px 24px',
                                        border: `1px solid ${C.border}`, marginBottom: 32, textAlign: 'left'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 13, color: C.textSecondary }}>Event</span>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{orderData.event_name}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 13, color: C.textSecondary }}>Tickets</span>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{orderData.ticket_count} ticket(s)</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 13, color: C.textSecondary }}>Status</span>
                                                <span style={{
                                                    fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20,
                                                    background: orderData.status === 'paid' ? '#dcfce7' : '#fef3c7',
                                                    color: orderData.status === 'paid' ? '#16a34a' : '#d97706'
                                                }}>
                                                    {orderData.status === 'paid' ? 'Paid' : 'Processing'}
                                                </span>
                                            </div>
                                            <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>Total Paid</span>
                                                <span style={{ fontSize: 20, fontWeight: 900, color: C.primary }}>Rs. {parseFloat(orderData.total_amount).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                    <button
                                        onClick={() => navigate('/bookings')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '12px 24px', borderRadius: 12, border: 'none',
                                            background: C.primary, color: '#fff', fontSize: 13,
                                            fontWeight: 700, cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(79,70,229,0.25)',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <Ticket size={16} /> View My Tickets
                                    </button>
                                    <button
                                        onClick={() => navigate('/events')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '12px 24px', borderRadius: 12,
                                            border: `1px solid ${C.border}`, background: C.surface,
                                            color: C.textPrimary, fontSize: 13, fontWeight: 600,
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                    >
                                        <ArrowLeft size={16} /> Browse Events
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <style>{`
                    @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
                    @keyframes scaleIn{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}
                `}</style>
            </main>
        </div>
    );
};

export default PaymentSuccess;
