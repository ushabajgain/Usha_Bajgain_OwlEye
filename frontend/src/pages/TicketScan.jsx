import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { QrCode, CheckCircle, XCircle, Users, RefreshCw } from 'lucide-react';
import C from '../utils/colors';
import PageHeader from '../components/PageHeader';
import { getRole } from '../utils/auth';

const HEADER_BG = C.navy;
const CONTENT_BG = C.background;
const CARD_BG = C.surface;
const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;

const TicketScan = () => {
    const navigate = useNavigate();
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [successData, setSuccessData] = useState(null);

    useEffect(() => {
        const userRole = getRole();
        if (userRole !== 'organizer' && userRole !== 'admin' && userRole !== 'volunteer') { navigate('/events'); return; }

        const scanner = new Html5QrcodeScanner('reader', { qrbox: { width: 250, height: 250 }, fps: 10 });
        scanner.render(onScanSuccess, onScanError);

        async function onScanSuccess(result) {
            scanner.clear();
            setScanResult(result);
            validateTicket(result);
        }
        function onScanError() { }
        return () => scanner.clear();
    }, [navigate]);

    const validateTicket = async (token) => {
        setIsLoading(true);
        setError(null);
        setSuccessData(null);

        let lat = null, lng = null;
        try {
            const pos = await new Promise((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
            );
            lat = Number(pos.coords.latitude.toFixed(6));
            lng = Number(pos.coords.longitude.toFixed(6));
        } catch { }

        try {
            const response = await api.post('/tickets/scan/', { qr_token: token, lat, lng });
            setSuccessData(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid ticket. Could not verify.');
        } finally {
            setIsLoading(false);
        }
    };

    const s = {
        shell: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter','Segoe UI',sans-serif" },
        main: { flex: 1, marginLeft: 230, background: CONTENT_BG, display: 'flex', flexDirection: 'column' },
        topBar: { background: HEADER_BG, color: '#fff', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 100 },
        content: { padding: '28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
        scanCard: { background: CARD_BG, borderRadius: 16, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${BORDER}`, width: '100%', maxWidth: 480, textAlign: 'center', marginBottom: 20 },
        statsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 480 },
        statCard: { background: CARD_BG, borderRadius: 12, padding: '20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${BORDER}`, textAlign: 'center' },
    };

    return (
        <div style={s.shell}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader title="Scan Ticket" breadcrumb="Dashboard" />

                <div style={s.content}>
                    <div style={s.scanCard}>
                        {!scanResult ? (
                            <>
                                <p style={{ fontSize: 13, fontWeight: 600, color: ACCENT, marginBottom: 16 }}>Point camera at the QR code to scan</p>
                                <div id="reader" style={{ borderRadius: 12, overflow: 'hidden', border: `2px dashed ${BORDER}`, background: '#f8fafc' }} />
                                <p style={{ fontSize: 12, color: TEXT_MID, marginTop: 12 }}>The ticket will be verified automatically after scanning.</p>
                            </>
                        ) : (
                            <div>
                                {isLoading && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
                                        <div style={{ width: 48, height: 48, border: `4px solid ${BORDER}`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                        <p style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>Verifying ticket…</p>
                                    </div>
                                )}

                                {successData && (
                                    <div style={{ padding: '20px 0' }}>
                                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                            <CheckCircle size={36} color="#16a34a" />
                                        </div>
                                        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', marginBottom: 6 }}>Ticket Valid</h3>
                                        <p style={{ fontSize: 13, color: TEXT_MID, marginBottom: 20 }}>Welcome, {successData.user}! Entry granted.</p>
                                        <button onClick={() => window.location.reload()}
                                            style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
                                            <RefreshCw size={14} /> Scan Next Ticket
                                        </button>
                                    </div>
                                )}

                                {error && (
                                    <div style={{ padding: '20px 0' }}>
                                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                            <XCircle size={36} color="#dc2626" />
                                        </div>
                                        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', marginBottom: 6 }}>Ticket Invalid</h3>
                                        <p style={{ fontSize: 13, color: TEXT_MID, marginBottom: 20 }}>{error}</p>
                                        <button onClick={() => window.location.reload()}
                                            style={{ padding: '10px 28px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#f8fafc', color: TEXT_DARK, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                                            Try Again
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div style={s.statsRow}>
                        <div style={s.statCard}>
                            <p style={{ fontSize: 11, color: TEXT_MID, marginBottom: 4 }}>Total Scanned</p>
                            <p style={{ fontSize: 28, fontWeight: 800, color: TEXT_DARK }}>1,284</p>
                        </div>
                        <div style={s.statCard}>
                            <p style={{ fontSize: 11, color: TEXT_MID, marginBottom: 4 }}>Capacity Used</p>
                            <p style={{ fontSize: 28, fontWeight: 800, color: ACCENT }}>84<span style={{ fontSize: 16 }}>%</span></p>
                        </div>
                    </div>
                </div>
            </main>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );
};

export default TicketScan;
