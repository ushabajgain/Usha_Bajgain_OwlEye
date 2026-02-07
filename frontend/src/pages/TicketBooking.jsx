import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ChevronLeft, Ticket, User, CreditCard, CheckCircle2,
    Plus, Minus, ArrowRight, Loader2, AlertCircle, ShoppingCart,
    Mail, ShieldCheck, Zap
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import api from '../utils/api';
import C from '../utils/colors';
import { getUserId, getFullName, getEmail } from '../utils/auth';

const TicketBooking = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1); // 1: Selection, 2: Checkout, 3: Success

    // Selection state
    const [quantities, setQuantities] = useState({}); // {packageId: quantity}

    // Billing state
    const fullName = getFullName();
    const nameParts = fullName.split(' ');
    
    const [billingInfo, setBillingInfo] = useState({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: getEmail() || '',
        confirm_email: getEmail() || ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadEvent = async () => {
            try {
                const res = await api.get(`/events/${id}/`);
                setEvent(res.data);
                // Initialize quantities
                const initial = {};
                (res.data.ticket_packages || []).forEach(pkg => {
                    initial[pkg.id] = 0;
                });
                setQuantities(initial);
            } catch (err) {
                setError('Failed to load event details.');
            } finally {
                setLoading(false);
            }
        };
        loadEvent();
    }, [id]);

    const handleQuantityChange = (pkgId, delta) => {
        setQuantities(prev => ({
            ...prev,
            [pkgId]: Math.max(0, (prev[pkgId] || 0) + delta)
        }));
    };

    const selectedItems = (event?.ticket_packages || []).filter(pkg => quantities[pkg.id] > 0);
    const totalAmount = selectedItems.reduce((sum, pkg) => sum + (pkg.price * quantities[pkg.id]), 0);
    const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);

    const handleNextStep = () => {
        if (totalTickets === 0) {
            alert('Please select at least one ticket.');
            return;
        }
        setStep(2);
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        if (billingInfo.email !== billingInfo.confirm_email) {
            alert('Emails do not match.');
            return;
        }

        setIsSubmitting(true);
        try {
            const items = selectedItems.map(pkg => ({
                package_id: pkg.id,
                quantity: quantities[pkg.id]
            }));

            const res = await api.post('/payments/create-checkout-session/', {
                event: id,
                items,
                billing_info: billingInfo
            });

            // Redirect to Stripe Checkout
            if (res.data.checkout_url) {
                window.location.href = res.data.checkout_url;
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to initiate payment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.background }}>
            <Loader2 size={32} style={{ color: C.primary, animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (error || !event) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.background, gap: 12 }}>
            <AlertCircle size={44} color={C.danger} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary }}>Error</h1>
            <p style={{ fontSize: 14, color: C.textSecondary }}>{error}</p>
            <Link to="/events" style={{ marginTop: 8, padding: '10px 24px', background: C.primary, color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Back to Events</Link>
        </div>
    );

    const s = {
        main: { flex: 1, marginLeft: 230, background: C.background, display: 'flex', flexDirection: 'column', minHeight: '100vh' },
        container: { padding: '32px', maxWidth: 1200, margin: '0 auto', width: '100%' },
        grid: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' },
        card: { background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' },
        pkgCard: { padding: '20px', borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 16, transition: 'all 0.2s' },
        label: { fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' },
        input: { width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, background: '#fcfcfc', color: C.textPrimary, outline: 'none', transition: 'border-color 0.2s' },
        btnPrimary: { background: C.primary, color: '#fff', border: 'none', padding: '14px 24px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(79,70,229,0.2)' },
        orderSummary: { background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, padding: 24, position: 'sticky', top: 32 },
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter',sans-serif" }}>
            <Sidebar />
            <main style={s.main}>
                <PageHeader
                    title="Tickets"
                    breadcrumb="Events"
                />

                <div style={s.container}>
                    {step < 3 ? (
                        <div style={s.grid}>
                            {/* LEFT COLUMN */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                                {/* Step Indicator */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: step >= 1 ? C.primary : C.border, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>1</div>
                                        <span style={{ fontSize: 14, fontWeight: step === 1 ? 700 : 500, color: step === 1 ? C.textPrimary : C.textSecondary }}>Tickets</span>
                                    </div>
                                    <div style={{ width: 40, height: 1, background: C.border }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: step >= 2 ? C.primary : C.border, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>2</div>
                                        <span style={{ fontSize: 14, fontWeight: step === 2 ? 700 : 500, color: step === 2 ? C.textPrimary : C.textSecondary }}>Details</span>
                                    </div>
                                </div>

                                {step === 1 ? (
                                    <div style={s.card}>
                                        <div style={{ padding: '24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.primaryTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Ticket size={24} color={C.primary} />
                                            </div>
                                            <div>
                                                <h2 style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Available Packages</h2>
                                                <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>Choose the best experience for you</p>
                                            </div>
                                        </div>
                                        <div style={{ padding: '24px' }}>
                                            {(event.ticket_packages || []).length > 0 ? (event.ticket_packages || []).map(pkg => (
                                                <div key={pkg.id} style={{ ...s.pkgCard, borderColor: quantities[pkg.id] > 0 ? C.primary : C.border, background: quantities[pkg.id] > 0 ? C.primaryTint : 'transparent' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{pkg.name}</h3>
                                                                <span style={{ fontSize: 11, fontWeight: 700, color: pkg.color, padding: '2px 8px', borderRadius: 4, background: `${pkg.color}15`, border: `1px solid ${pkg.color}30` }}>{pkg.seating_type}</span>
                                                            </div>
                                                            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 12 }}>{pkg.description || "Standard entry package."}</p>

                                                            {pkg.perks && (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                                    {pkg.perks.split(',').map((perk, pi) => (
                                                                        <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.textSecondary, background: 'rgba(0,0,0,0.03)', padding: '3px 8px', borderRadius: 6 }}>
                                                                            <CheckCircle2 size={10} color={C.success} /> {perk.trim()}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                                                            <span style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>Rs. {Number(pkg.price).toLocaleString()}</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '4px' }}>
                                                                <button onClick={() => handleQuantityChange(pkg.id, -1)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
                                                                <span style={{ fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{quantities[pkg.id] || 0}</span>
                                                                <button onClick={() => handleQuantityChange(pkg.id, 1)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: C.primary, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                                                    <AlertCircle size={40} style={{ color: C.textSecondary, opacity: 0.2, marginBottom: 12 }} />
                                                    <p style={{ color: C.textSecondary }}>No ticket packages available for this event.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                        <div style={s.card}>
                                            <div style={{ padding: '24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 12, background: C.secondaryTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={24} color={C.secondary} />
                                                </div>
                                                <div>
                                                    <h2 style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Billing Information</h2>
                                                    <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>Enter your contact details</p>
                                                </div>
                                            </div>
                                            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                                <div>
                                                    <label style={s.label}>First Name *</label>
                                                    <input id="billing-first-name" name="first_name" required type="text" style={s.input} value={billingInfo.first_name} onChange={e => setBillingInfo({ ...billingInfo, first_name: e.target.value })} placeholder="John" />
                                                </div>
                                                <div>
                                                    <label style={s.label}>Last Name *</label>
                                                    <input id="billing-last-name" name="last_name" required type="text" style={s.input} value={billingInfo.last_name} onChange={e => setBillingInfo({ ...billingInfo, last_name: e.target.value })} placeholder="Doe" />
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label style={s.label}>Email Address *</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <Mail size={16} color={C.textSecondary} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                                                        <input id="billing-email" name="email" required type="email" style={{ ...s.input, paddingLeft: 40 }} value={billingInfo.email} onChange={e => setBillingInfo({ ...billingInfo, email: e.target.value })} placeholder="john.doe@example.com" />
                                                    </div>
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label style={s.label}>Confirm Email *</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <Mail size={16} color={C.textSecondary} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                                                        <input id="billing-confirm-email" name="confirm_email" required type="email" style={{ ...s.input, paddingLeft: 40 }} value={billingInfo.confirm_email} onChange={e => setBillingInfo({ ...billingInfo, confirm_email: e.target.value })} placeholder="Confirm your email" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={s.card}>
                                            <div style={{ padding: '24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 12, background: C.warningTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <CreditCard size={24} color={C.warning} />
                                                </div>
                                                <div>
                                                    <h2 style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Payment Method</h2>
                                                    <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>Secure checkout via Stripe</p>
                                                </div>
                                            </div>
                                            <div style={{ padding: '24px' }}>
                                                <div style={{ padding: '16px', borderRadius: 12, border: `2px solid ${C.primary}`, background: C.primaryTint, display: 'flex', alignItems: 'center', gap: 16 }}>
                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: `6px solid ${C.primary}`, background: '#fff' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>Pay with Stripe</div>
                                                        <div style={{ fontSize: 12, color: C.textSecondary }}>You'll be redirected to Stripe's secure payment page.</div>
                                                    </div>
                                                    <ShieldCheck size={20} color={C.primary} />
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* RIGHT COLUMN: SUMMARY */}
                            <div style={s.orderSummary}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                    <ShoppingCart size={20} color={C.primary} />
                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Order Summary</h3>
                                </div>

                                <div style={{ display: 'flex', gap: 12, marginBottom: 24, padding: 12, background: '#f8fafc', borderRadius: 12, border: `1px solid ${C.border}` }}>
                                    <img src={event.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80'}
                                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} alt="" />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{event.name}</div>
                                        <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{new Date(event.start_datetime).toDateString()}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                                    {selectedItems.length > 0 ? selectedItems.map(pkg => (
                                        <div key={pkg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: 13, color: C.textSecondary }}><span style={{ fontWeight: 700, color: C.textPrimary }}>{quantities[pkg.id]}x</span> {pkg.name}</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Rs. {(pkg.price * quantities[pkg.id]).toLocaleString()}</div>
                                        </div>
                                    )) : (
                                        <div style={{ fontSize: 13, color: C.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>No tickets selected</div>
                                    )}
                                </div>

                                <div style={{ paddingTop: 20, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 14, color: C.textSecondary }}>Subtotal</span>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>Rs. {totalAmount.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 14, color: C.textSecondary }}>Fees</span>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: C.success }}>FREE</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                        <span style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary }}>Total</span>
                                        <span style={{ fontSize: 24, fontWeight: 900, color: C.primary }}>Rs. {totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={step === 1 ? handleNextStep : handlePlaceOrder}
                                    disabled={totalTickets === 0 || isSubmitting}
                                    style={{ ...s.btnPrimary, width: '100%', marginTop: 28, opacity: (totalTickets === 0 || isSubmitting) ? 0.6 : 1 }}
                                >
                                    {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (
                                        <>
                                            {step === 1 ? "Proceed to Checkout" : "Pay with Stripe"}
                                            {step === 1 && <ArrowRight size={18} />}
                                            {step === 2 && <CreditCard size={18} />}
                                        </>
                                    )}
                                </button>

                                <div style={{ marginTop: 16, textAlign: 'center' }}>
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/1f/Stripe_logo.svg" style={{ height: 16, opacity: 0.5, marginRight: 12 }} alt="" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" style={{ height: 10, opacity: 0.5 }} alt="" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* SUCCESS STATE */
                        <div style={{ ...s.card, maxWidth: 600, margin: '40px auto', padding: '60px 40px', textAlign: 'center' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.successTint, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <CheckCircle2 size={40} color={C.success} />
                            </div>
                            <h1 style={{ fontSize: 28, fontWeight: 900, color: C.textPrimary, marginBottom: 12 }}>Booking Confirmed!</h1>
                            <p style={{ fontSize: 16, color: C.textSecondary, lineHeight: 1.6, marginBottom: 32 }}>
                                Your tickets have been issued successfully. You can view them in the Bookings section or your email.
                            </p>

                            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                                <button onClick={() => navigate('/my-tickets')} style={s.btnPrimary}>
                                    <Ticket size={18} /> View My Tickets
                                </button>
                                <button onClick={() => navigate('/events')} style={{ ...s.btnPrimary, background: '#f1f5f9', color: C.textPrimary, boxShadow: 'none' }}>
                                    Browse More Events
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </main>
        </div>
    );
};

export default TicketBooking;
