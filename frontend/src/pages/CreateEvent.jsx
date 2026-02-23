import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import MapPicker from '../components/MapPicker';
import {
    Info, MapPin, Calendar, Loader2, Upload,
    Users, Wallet, Image as ImageIcon, Plus, Trash2,
    FileText, LayoutGrid, CheckCircle, X, ChevronDown, Tag, AlertTriangle
} from 'lucide-react';
import api from '../utils/api';
import C from '../utils/colors';
import { getRole } from '../utils/auth';

const ACCENT = C.primary;
const TEXT_DARK = C.textPrimary;
const TEXT_MID = C.textSecondary;
const BORDER = C.border;
const CONTENT_BG = C.background;
const CARD_BG = C.surface;

const CATEGORIES = [
    'Music', 'Sports', 'Fashion', 'Art & Design', 'Food & Culinary',
    'Technology', 'Health & Wellness', 'Outdoor & Adventure', 'Business', 'Education', 'Other'
];

const PACKAGE_COLORS = ['#64748b', '#7c3aed', '#db2777', '#2563eb', '#d97706', '#16a34a'];

// ── Predefined package templates ──────────────────────────────────────────────
const PRESET_PACKAGES = [
    {
        id: 'basic',
        label: 'Basic Pass',
        emoji: '🎟️',
        name: 'Basic Pass',
        price: '20',
        seating_type: 'Standing',
        color: '#64748b',
        description: 'Enjoy access to the event at an affordable price. Perfect for attendees who want to experience the event atmosphere without extra add-ons.',
        perks: 'General event entry,Access to standing area near stage,Access to food & merchandise stalls,Standard security and support services',
    },
    {
        id: 'premium',
        label: 'Premium Pass',
        emoji: '⭐',
        name: 'Premium Pass',
        price: '50',
        seating_type: 'Seating',
        color: '#7c3aed',
        description: 'A comfortable experience with reserved seating and better visibility. Ideal for attendees who want a more relaxed and organized event experience.',
        perks: 'Reserved seating area,Priority entry gate,Better stage view,Complimentary welcome drink,Access to exclusive rest areas',
    },
    {
        id: 'vip',
        label: 'VIP Experience',
        emoji: '👑',
        name: 'VIP Experience',
        price: '120',
        seating_type: 'Premium Seating',
        color: '#db2777',
        description: 'The ultimate event experience with luxury seating and exclusive privileges. Designed for guests who want premium comfort and special treatment.',
        perks: 'Front-row VIP seating,Dedicated VIP entrance,Complimentary food and drinks,Meet & greet with performers/speakers,VIP lounge access,Priority customer support',
    },
];

const defaultPackage = (color = '#2563eb') => ({
    name: '',
    price: '',
    description: '',
    perks: '',
    seating_type: 'Seating',
    color,
    _isCustom: true,
});

const formatCurrency = (val) => {
    if (val === undefined || val === null || val === '') return 'Rs. 0';
    return `Rs. ${Number(val).toLocaleString()}`;
};

const INPUT_STYLE = (err) => ({
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px', borderRadius: 8, fontSize: 14,
    border: `1.5px solid ${err ? '#ef4444' : '#e2e8f0'}`,
    outline: 'none', color: TEXT_DARK, background: '#f8fafc',
    fontFamily: 'inherit', transition: 'border-color 0.15s',
});

const Label = ({ children, required }) => (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
        {children}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
    </label>
);

const ErrorTip = ({ msg }) => msg ? (
    <p style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, marginTop: 4 }}>{msg}</p>
) : null;

const SectionCard = ({ icon: Icon, title, children }) => (
    <section style={{ background: CARD_BG, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: ACCENT, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 20px' }}>
            <Icon size={14} /> {title}
        </h3>
        {children}
    </section>
);

import { useFeedback } from '../context/FeedbackContext';
import Footer from '../components/Footer';

const CreateEvent = () => {
    const { showToast } = useFeedback();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [seatPlanFile, setSeatPlanFile] = useState(null);
    const [seatPlanPreview, setSeatPlanPreview] = useState(null);
    const [location, setLocation] = useState(null);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedPresets, setSelectedPresets] = useState(['basic', 'premium', 'vip']);
    const [customPackages, setCustomPackages] = useState([]);

    // Derive packages list: selected presets (in order) + custom ones
    const getPackages = () => [
        ...PRESET_PACKAGES.filter(p => selectedPresets.includes(p.id)).map(({ id, label, emoji, ...rest }) => rest),
        ...customPackages,
    ];

    const togglePreset = (presetId) => {
        setSelectedPresets(prev =>
            prev.includes(presetId) ? prev.filter(id => id !== presetId) : [...prev, presetId]
        );
    };

    const addCustomPackage = () => {
        const usedColors = customPackages.map(p => p.color);
        const nextColor = PACKAGE_COLORS.find(c => !usedColors.includes(c)) || '#2563eb';
        setCustomPackages(prev => [...prev, defaultPackage(nextColor)]);
    };

    const removeCustomPackage = (idx) => setCustomPackages(prev => prev.filter((_, i) => i !== idx));
    const updateCustomPackage = (idx, field, value) => setCustomPackages(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));

    useEffect(() => {
        const userRole = getRole();
        if (userRole !== 'organizer' && userRole !== 'admin') {
            navigate('/events');
        }
    }, [navigate]);

    const [formData, setFormData] = useState({
        name: '', description: '', category: 'Music',
        venue_address: '', start_datetime: '', end_datetime: '',
        capacity: 1000, price: 0, status: 'draft',
        terms_conditions: '', seat_plan_description: '',
    });

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (fieldErrors[e.target.name]) setFieldErrors(prev => ({ ...prev, [e.target.name]: '' }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
    };

    const handleSeatPlanChange = (e) => {
        const file = e.target.files[0];
        if (file) { setSeatPlanFile(file); setSeatPlanPreview(URL.createObjectURL(file)); }
    };

    const handleAddressUpdate = (address) => {
        setFormData(prev => ({ ...prev, venue_address: address }));
    };

    const addPackage = () => addCustomPackage();
    const removePackage = (idx) => {
        // idx offset: preset count first, then custom
        const presetCount = selectedPresets.length;
        removeCustomPackage(idx - presetCount);
    };
    const updatePackage = (idx, field, value) => {
        const presetCount = selectedPresets.length;
        updateCustomPackage(idx - presetCount, field, value);
    };

    // Keep packages in sync for submit
    const packages = getPackages();

    const validate = () => {
        const fErrors = {};
        const now = new Date();

        if (!formData.name.trim()) fErrors.name = 'Event name is required.';
        if (formData.name.length > 255) fErrors.name = 'Name too long (max 255).';
        
        if (formData.description.length > 5000) fErrors.description = 'Description too long (max 5000).';
        if (formData.terms_conditions.length > 5000) fErrors.terms_conditions = 'Terms too long (max 5000).';

        if (!location) fErrors.location = 'Please pin the event location on the map.';
        else if (!formData.venue_address.trim()) fErrors.location = 'Address lookup failed. Please try again or pin precisely.';
        
        if (!formData.start_datetime) fErrors.start_datetime = 'Start date & time is required.';
        else if (new Date(formData.start_datetime) < new Date(now.getTime() - 5 * 60 * 1000)) fErrors.start_datetime = 'Start date cannot be in the past.';
        
        if (!formData.end_datetime) fErrors.end_datetime = 'End date & time is required.';
        if (formData.start_datetime && formData.end_datetime && new Date(formData.start_datetime) >= new Date(formData.end_datetime))
            fErrors.end_datetime = 'End time must be after start time.';
        
        if (!formData.capacity || formData.capacity <= 0) fErrors.capacity = 'Capacity must be a positive number.';
        if (formData.price === '' || formData.price === null || formData.price < 0) fErrors.price = 'Valid base ticket price is required.';
        
        if (!imageFile) fErrors.image = 'Event cover image is required.';
        else {
            const ext = imageFile.name.split('.').pop().toLowerCase();
            if (!['jpg', 'jpeg', 'png'].includes(ext)) fErrors.image = 'Only JPG/PNG allowed.';
            if (imageFile.size > 10 * 1024 * 1024) fErrors.image = 'Max size 10MB.';
        }

        if (seatPlanFile) {
            const ext = seatPlanFile.name.split('.').pop().toLowerCase();
            if (!['jpg', 'jpeg', 'png'].includes(ext)) fErrors.seatPlan = 'Only JPG/PNG allowed.';
            if (seatPlanFile.size > 10 * 1024 * 1024) fErrors.seatPlan = 'Max size 10MB.';
        }

        if (packages.length === 0) fErrors.packages = 'At least one ticket package is required.';
        
        const pkgNames = new Set();
        customPackages.forEach((pkg, idx) => {
            if (!pkg.name.trim()) fErrors[`custom_name_${idx}`] = 'Name req.';
            else if (pkgNames.has(pkg.name.trim().toLowerCase())) fErrors[`custom_name_${idx}`] = 'Unique name req.';
            else pkgNames.add(pkg.name.trim().toLowerCase());

            if (pkg.price === '' || pkg.price < 0) fErrors[`custom_price_${idx}`] = 'Valid price req.';
        });

        // Check presets uniqueness too
        const selectedPresetObjs = PRESET_PACKAGES.filter(p => selectedPresets.includes(p.id));
        selectedPresetObjs.forEach(p => {
            if (pkgNames.has(p.name.toLowerCase())) fErrors.packages = 'Package names must be unique.';
            pkgNames.add(p.name.toLowerCase());
        });

        return fErrors;
    };

    const handleSubmit = async (e, asDraft = false) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});

        const statusToSave = 'active';
        const fErrors = validate();
        if (Object.keys(fErrors).length > 0) {
            setFieldErrors(fErrors);
            showToast("Please fix the errors in the form.", 'error');
            return;
        }

        if (!location || !location.lat || !location.lng) {
            setError('Location is required. Please pin your event on the map.');
            return;
        }

        setLoading(true);
        try {
            // Create FormData for file upload
            const uploadData = new FormData();

            // Append all form fields
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
                    uploadData.append(key, formData[key]);
                }
            });

            // Set event status
            uploadData.set('status', statusToSave);

            // Append location coordinates
            uploadData.append('latitude', parseFloat(location.lat).toFixed(6));
            uploadData.append('longitude', parseFloat(location.lng).toFixed(6));

            // Append files if present
            if (imageFile) {
                uploadData.append('image', imageFile);
            }
            if (seatPlanFile) {
                uploadData.append('seat_plan_image', seatPlanFile);
            }

            // Append ticket packages as JSON
            const validPackages = packages.filter(p => p.name && p.name.trim() && p.price);
            if (validPackages.length === 0) {
                setFieldErrors({ packages: 'At least one ticket package is required.' });
                setLoading(false);
                return;
            }
            uploadData.append('ticket_packages', JSON.stringify(validPackages));

            // POST request
            await api.post('/events/', uploadData);

            showToast('Event created successfully! Redirecting...');
            setTimeout(() => {
                navigate('/events');
            }, 1000);
        } catch (err) {
            console.error('Event creation error:', err);
            const backendData = err.response?.data;

            if (backendData && typeof backendData === 'object') {
                const sErrors = {};

                // Handle non-field errors
                if (backendData.non_field_errors) {
                    setError(Array.isArray(backendData.non_field_errors) ? backendData.non_field_errors[0] : backendData.non_field_errors);
                }

                // Handle field-specific errors
                Object.keys(backendData).forEach(key => {
                    if (key !== 'non_field_errors' && key !== 'detail') {
                        sErrors[key] = Array.isArray(backendData[key]) ? backendData[key][0] : backendData[key];
                    }
                });

                setFieldErrors(sErrors);

                if (!error && Object.keys(sErrors).length > 0) {
                    const firstMsg = Object.values(sErrors)[0];
                    setError(firstMsg || 'Could not create event. Please check your input.');
                }
            } else if (err.response?.status === 401) {
                setError('Unauthorized. Please log in again.');
                navigate('/login');
            } else if (err.response?.status === 403) {
                setError('Only organizers can create events.');
            } else {
                setError(err.message || 'Error: Could not create event. Please check your connection and try again.');
            }

            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter','Segoe UI',sans-serif", background: CONTENT_BG, overflowX: 'hidden' }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                {/* Header */}
                <PageHeader
                    title="Create Event"
                    breadcrumb="Dashboard"
                />

                {/* Body */}
                <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>

                    {/* Error Banner */}
                    {error && (
                        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <X size={15} color="#dc2626" />
                            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{error}</span>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 24, paddingBottom: 60 }}>

                        {/* ── LEFT Column ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                            {/* Basic Info */}
                            <SectionCard icon={Info} title="Event Information">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <Label required>Event Name</Label>
                                        <input type="text" name="name" value={formData.name} onChange={handleChange}
                                            placeholder="Enter event name" style={INPUT_STYLE(fieldErrors.name)} />
                                        <ErrorTip msg={fieldErrors.name} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <div>
                                            <Label required>Category</Label>
                                            <div style={{ position: 'relative' }}>
                                                <select name="category" value={formData.category} onChange={handleChange}
                                                    style={{ ...INPUT_STYLE(false), appearance: 'none', paddingRight: 32 }}>
                                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID, pointerEvents: 'none' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <Label required>Base Ticket Price</Label>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: TEXT_MID }}>Rs.</div>
                                                <input type="number" name="price" min="0" value={formData.price} onChange={handleChange}
                                                    placeholder="0" style={{ ...INPUT_STYLE(fieldErrors.price), paddingLeft: 38 }} />
                                            </div>
                                            <ErrorTip msg={fieldErrors.price} />
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <Label>Description</Label>
                                            <span style={{ fontSize: 10, color: formData.description.length > 4500 ? '#ef4444' : '#94a3b8', marginBottom: 6 }}>
                                                {formData.description.length} / 5000
                                            </span>
                                        </div>
                                        <textarea name="description" rows={6} value={formData.description} onChange={handleChange}
                                            placeholder="Optional: Describe your event..."
                                            style={{ ...INPUT_STYLE(fieldErrors.description), resize: 'vertical', lineHeight: 1.6 }} />
                                        <ErrorTip msg={fieldErrors.description} />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Date & Capacity */}
                            <SectionCard icon={Calendar} title="Date, Time & Capacity">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <div>
                                            <Label required>Start Date & Time</Label>
                                            <input type="datetime-local" name="start_datetime" value={formData.start_datetime} onChange={handleChange}
                                                style={INPUT_STYLE(fieldErrors.start_datetime)} />
                                            <ErrorTip msg={fieldErrors.start_datetime} />
                                        </div>
                                        <div>
                                            <Label required>End Date & Time</Label>
                                            <input type="datetime-local" name="end_datetime" value={formData.end_datetime} onChange={handleChange}
                                                style={INPUT_STYLE(fieldErrors.end_datetime)} />
                                            <ErrorTip msg={fieldErrors.end_datetime} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label required>Maximum Capacity</Label>
                                        <div style={{ position: 'relative' }}>
                                            <Users size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID }} />
                                            <input type="number" name="capacity" min="1" value={formData.capacity} onChange={handleChange}
                                                style={{ ...INPUT_STYLE(fieldErrors.capacity), paddingLeft: 34 }} />
                                        </div>
                                        <ErrorTip msg={fieldErrors.capacity} />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Location */}
                            <SectionCard icon={MapPin} title="Venue & Location">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div>
                                        <Label required>Venue Location (Pin on Map)</Label>
                                        <button type="button" onClick={() => setIsMapModalOpen(true)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, padding: '12px 18px', borderRadius: 8, border: `1.5px solid ${fieldErrors.location ? '#ef4444' : ACCENT}`, background: location ? '#eff6ff' : '#f8fafc', color: location ? ACCENT : TEXT_MID, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', transition: 'all 0.15s', overflow: 'hidden' }}>
                                            <MapPin size={16} color={location ? ACCENT : TEXT_MID} strokeWidth={2} style={{ flexShrink: 0 }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {location ? (formData.venue_address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`) : 'Click to pick location on map'}
                                            </span>
                                        </button>
                                        <ErrorTip msg={fieldErrors.location} />
                                    </div>
                                </div>
                            </SectionCard>

                             {/* Terms & Conditions */}
                             <SectionCard icon={FileText} title="Terms & Conditions">
                                 <div>
                                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                         <Label>Event Terms & Conditions</Label>
                                         <span style={{ fontSize: 10, color: formData.terms_conditions.length > 4500 ? '#ef4444' : '#94a3b8', marginBottom: 6 }}>
                                             {formData.terms_conditions.length} / 5000
                                         </span>
                                     </div>
                                     <textarea name="terms_conditions" rows={8} value={formData.terms_conditions} onChange={handleChange}
                                         placeholder="E.g.&#10;1. Ticket Purchase and Entry&#10;   - All attendees must hold a valid ticket&#10;   - Tickets are non-refundable"
                                         style={{ ...INPUT_STYLE(fieldErrors.terms_conditions), resize: 'vertical', lineHeight: 1.6 }} />
                                     <ErrorTip msg={fieldErrors.terms_conditions} />
                                 </div>
                             </SectionCard>
                        </div>

                        {/* ── RIGHT Column ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                            {/* Event Image */}
                            <SectionCard icon={ImageIcon} title="Event Cover Image">
                                <div>
                                    {imagePreview ? (
                                        <div style={{ position: 'relative' }}>
                                            <img src={imagePreview} alt="preview" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 10 }} />
                                            <label style={{ position: 'absolute', bottom: 12, right: 12, background: '#1f2937', color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                                Change <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                            </label>
                                        </div>
                                    ) : (
                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, border: `2px dashed ${fieldErrors.image ? '#ef4444' : BORDER}`, borderRadius: 10, cursor: 'pointer', color: fieldErrors.image ? '#ef4444' : TEXT_MID, gap: 8, background: fieldErrors.image ? '#fef2f2' : 'transparent' }}>
                                            <Upload size={24} strokeWidth={1.5} />
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>Upload Cover Image</span>
                                            <span style={{ fontSize: 11 }}>PNG, JPG up to 10MB</span>
                                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                        </label>
                                    )}
                                    <ErrorTip msg={fieldErrors.image} />
                                </div>
                            </SectionCard>

                            {/* Seat Plan */}
                            <SectionCard icon={LayoutGrid} title="Seat Plan">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {seatPlanPreview ? (
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ width: '100%', height: 160, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                                                <img src={seatPlanPreview} alt="seat plan" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                            </div>
                                            <label style={{ position: 'absolute', bottom: 10, right: 10, background: '#4b5563', color: '#fff', fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                                                Replace <input type="file" accept="image/*" onChange={handleSeatPlanChange} style={{ display: 'none' }} />
                                            </label>
                                        </div>
                                    ) : (
                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, border: `2px dashed ${BORDER}`, borderRadius: 10, cursor: 'pointer', color: TEXT_MID, gap: 6, background: '#f8fafc' }}>
                                            <LayoutGrid size={20} strokeWidth={1.5} />
                                            <span style={{ fontSize: 12, fontWeight: 600 }}>Upload Seat Plan Image</span>
                                            <input type="file" accept="image/*" onChange={handleSeatPlanChange} style={{ display: 'none' }} />
                                        </label>
                                    )}
                                    <div>
                                        <Label>Notes</Label>
                                        <textarea name="seat_plan_description" rows={4} value={formData.seat_plan_description} onChange={handleChange}
                                            placeholder="E.g. Seating categories include reserved seats with stage view..."
                                            style={{ ...INPUT_STYLE(fieldErrors.seat_plan_description), resize: 'vertical', fontSize: 13 }} />
                                        <ErrorTip msg={fieldErrors.seat_plan_description} />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Ticket Packages */}
                            <SectionCard icon={Tag} title="Ticket Packages">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                                    {/* ── Preset picker ── */}
                                    <div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {PRESET_PACKAGES.map(preset => {
                                                const selected = selectedPresets.includes(preset.id);
                                                return (
                                                    <div key={preset.id}
                                                        onClick={() => togglePreset(preset.id)}
                                                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px', borderRadius: 10, border: `1.5px solid ${selected ? preset.color : BORDER}`, background: selected ? preset.color + '0d' : '#f8fafc', cursor: 'pointer', transition: 'all 0.15s' }}>
                                                        {/* Checkbox */}
                                                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected ? preset.color : '#cbd5e1'}`, background: selected ? preset.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, transition: 'all 0.15s' }}>
                                                            {selected && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                        </div>
                                                        {/* Info */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>{preset.emoji} {preset.label}</div>
                                                            <div style={{ fontSize: 12, color: TEXT_MID }}>{formatCurrency(preset.price)} · {preset.seating_type}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div style={{ height: 1, background: BORDER, margin: '8px 0' }} />

                                    {/* ── Custom packages ── */}
                                    {customPackages.map((pkg, idx) => (
                                        <div key={idx} style={{ padding: 12, borderRadius: 10, border: `1px solid ${pkg.color}40`, background: pkg.color + '08' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: pkg.color }} />
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_DARK }}>Custom {idx + 1}</span>
                                                </div>
                                                <button type="button" onClick={() => removeCustomPackage(idx)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <input value={pkg.name} onChange={e => updateCustomPackage(idx, 'name', e.target.value)}
                                                    placeholder="Package Name" style={{ ...INPUT_STYLE(fieldErrors[`custom_name_${idx}`]), fontSize: 12, padding: '6px 10px' }} />
                                                <ErrorTip msg={fieldErrors[`custom_name_${idx}`]} />
                                                
                                                <div style={{ position: 'relative' }}>
                                                    <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: TEXT_MID }}>Rs.</div>
                                                    <input type="number" value={pkg.price} onChange={e => updateCustomPackage(idx, 'price', e.target.value)}
                                                        placeholder="Price" style={{ ...INPUT_STYLE(fieldErrors[`custom_price_${idx}`]), fontSize: 12, padding: '6px 8px 6px 28px' }} />
                                                </div>
                                                <ErrorTip msg={fieldErrors[`custom_price_${idx}`]} />
                                            </div>
                                        </div>
                                    ))}

                                    {(selectedPresets.length + customPackages.length) < 6 && (
                                        <button type="button" onClick={addCustomPackage}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 8, border: `1.5px dashed ${ACCENT}`, background: 'transparent', color: ACCENT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                            <Plus size={14} /> Add Custom Package
                                        </button>
                                    )}
                                    <div style={{ textAlign: 'center' }}>
                                        <ErrorTip msg={fieldErrors.packages} />
                                    </div>
                                </div>
                            </SectionCard>
                        </div>
                    </div>

                </div>

                {/* Sticky Bottom Actions */}
                <div style={{ background: '#fff', padding: '16px 32px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end', gap: 12, boxShadow: '0 -2px 10px rgba(0,0,0,0.03)', zIndex: 100, position: 'sticky', bottom: 0 }}>
                    <button type="button" onClick={() => navigate('/events')}
                        style={{ padding: '10px 24px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: TEXT_MID, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button type="button" onClick={(e) => handleSubmit(e, false)} disabled={loading}
                        style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                        {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating Event…</> : <><CheckCircle size={16} /> Create Event</>}
                    </button>
                </div>
                            <Footer />
            </main>

            {/* Map Modal */}
            {isMapModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Pin Event Location</h3>
                                <p style={{ fontSize: 12, color: TEXT_MID, marginTop: 2 }}>Click on the map to set location, or search using the search bar.</p>
                            </div>
                            <button onClick={() => setIsMapModalOpen(false)} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${BORDER}`, background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} color={TEXT_MID} />
                            </button>
                        </div>
                        <div style={{ height: 440 }}>
                            <MapPicker
                                location={location}
                                setLocation={(pos) => {
                                    setLocation(pos);
                                    if (pos && pos.address) handleAddressUpdate(pos.address);
                                }}
                                onAddressUpdate={handleAddressUpdate}
                            />
                        </div>
                        <div style={{ padding: '14px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 13, color: TEXT_MID }}>
                                {location ? (
                                    <span><strong>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</strong></span>
                                ) : (
                                    <span>No location selected</span>
                                )}
                            </div>
                            <button onClick={() => setIsMapModalOpen(false)}
                                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                Confirm Location
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default CreateEvent;
