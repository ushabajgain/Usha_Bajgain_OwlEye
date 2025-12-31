import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';

const PaymentCancel = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderId = searchParams.get('order_id');

    useEffect(() => {
        // Auto-cancel the pending order
        if (orderId) {
            api.post('/payments/cancel/', { order_id: orderId }).catch(() => {});
        }
    }, [orderId]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter',sans-serif" }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, background: C.background, display: 'flex', flexDirection: 'column' }}>
                <PageHeader title="Payment Cancelled" breadcrumb="Events" breadcrumbPath="/events" />

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                    <div style={{
                        background: C.surface, borderRadius: 24, overflow: 'hidden',
                        maxWidth: 520, width: '100%',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.06)', border: `1px solid ${C.border}`
                    }}>
                        <div style={{ height: 6, background: 'linear-gradient(90deg, #ef4444, #f97316)' }} />

                        <div style={{ padding: '48px 40px', textAlign: 'center' }}>
                            <div style={{
                                width: 100, height: 100, borderRadius: '50%',
                                background: '#fef2f2', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 28px',
                                animation: 'scaleIn 0.5s ease-out'
                            }}>
                                <XCircle size={48} color="#ef4444" />
                            </div>

                            <h1 style={{ fontSize: 28, fontWeight: 900, color: C.textPrimary, marginBottom: 8 }}>
                                Payment Cancelled
                            </h1>
                            <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.7, marginBottom: 32, maxWidth: 380, margin: '0 auto 12px' }}>
                                Your payment was not completed. No charges have been made to your card.
                            </p>
                            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginBottom: 36 }}>
                                You can try booking again or browse other events.
                            </p>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button
                                    onClick={() => navigate(-1)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '14px 28px', borderRadius: 12, border: 'none',
                                        background: C.primary, color: '#fff', fontSize: 14,
                                        fontWeight: 700, cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(79,70,229,0.25)',
                                    }}
                                >
                                    <RefreshCw size={18} /> Try Again
                                </button>
                                <button
                                    onClick={() => navigate('/events')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '14px 28px', borderRadius: 12,
                                        border: `1px solid ${C.border}`, background: C.surface,
                                        color: C.textPrimary, fontSize: 14, fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <ArrowLeft size={18} /> Browse Events
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes scaleIn{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}
                `}</style>
            </main>
        </div>
    );
};

export default PaymentCancel;
