import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import MapPicker from '../components/MapPicker';
import {
    Info, MapPin, Calendar, Loader2, Upload,
    Users, Wallet, Image as ImageIcon, Plus, Trash2,
    FileText, LayoutGrid, CheckCircle, X, ChevronDown, Tag, Save
} from 'lucide-react';
import api from '../utils/api';
import C from '../utils/colors';
import { getRole } from '../utils/auth';
import Footer from '../components/Footer';

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

const PRESET_PACKAGES = [
    {
        id: 'basic',
        label: 'Basic Pass',
        emoji: '🎟️',
        name: 'Basic Pass',
        price: '20',
        seating_type: 'Standing',
        color: '#64748b',
        description: 'Enjoy access to the event at an affordable price.',
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
        description: 'A comfortable experience with reserved seating and better visibility.',
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
        description: 'The ultimate event experience with luxury seating and exclusive privileges.',
        perks: 'Front-row VIP seating,Dedicated VIP entrance,Complimentary food and drinks,Meet & greet with performers/speakers,VIP lounge access,Priority customer support',
    },
];

const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    return Number(val).toLocaleString();
};

const defaultPackage = (color = '#2563eb') => ({
    name: '',
    price: '',
    description: '',
    perks: '',
    seating_type: 'Seating',
    color,
    _isCustom: true,
});

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

const EditEvent = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [fetching, setFetching] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    const [formData, setFormData] = useState({
        name: '', description: '', category: 'Music',
        venue_address: '', start_datetime: '', end_datetime: '',
        capacity: 1000, price: 0, status: 'active',
        terms_conditions: '', seat_plan_description: '',
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [seatPlanFile, setSeatPlanFile] = useState(null);
    const [seatPlanPreview, setSeatPlanPreview] = useState(null);
    const [location, setLocation] = useState(null);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedPresets, setSelectedPresets] = useState([]);
    const [customPackages, setCustomPackages] = useState([]);

    useEffect(() => {
        const userRole = getRole();
        if (userRole !== 'organizer' && userRole !== 'admin') {
            navigate('/events');
            return;
        }

        const fetchEvent = async () => {
            try {
                const res = await api.get(`/events/${id}/`);
                const data = res.data;

                const formatDate = (dateStr) => {
                    const d = new Date(dateStr);
                    return d.toISOString().slice(0, 16);
                };

                setFormData({
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    venue_address: data.venue_address,
                    start_datetime: formatDate(data.start_datetime),
                    end_datetime: formatDate(data.end_datetime),
                    capacity: data.capacity,
                    price: data.price,
                    status: data.status,
                    terms_conditions: data.terms_conditions || '',
                    seat_plan_description: data.seat_plan_description || '',
                });

                if (data.latitude && data.longitude) {
                    setLocation({ lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) });
                }

                if (data.image) setImagePreview(data.image);
                if (data.seat_plan_image) setSeatPlanPreview(data.seat_plan_image);

                // Handle ticket packages
                // Backend sends them as an array of objects
                const pkgs = data.ticket_packages || [];
                const presetsFound = [];
                const customsFound = [];

                pkgs.forEach(pkg => {
                    const presetMatch = PRESET_PACKAGES.find(p => p.name === pkg.name && p.price == pkg.price);
                    if (presetMatch) {
                        presetsFound.push(presetMatch.id);
                    } else {
                        customsFound.push({ ...pkg, _isCustom: true });
                    }
                });

                setSelectedPresets(presetsFound);
                setCustomPackages(customsFound);

            } catch (err) {
                setError("Failed to load event data.");
            } finally {
                setFetching(false);
            }
        };

        fetchEvent();
    }, [id, navigate]);

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        if ((name === 'description' || name === 'terms_conditions') && value.length > 5000) return;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            setFieldErrors(prev => ({ ...prev, image: 'Only JPEG and PNG are allowed' }));
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setFieldErrors(prev => ({ ...prev, image: 'File size must be under 10MB' }));
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setFieldErrors(prev => ({ ...prev, image: '' }));
    };

    const handleSeatPlanChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            setFieldErrors(prev => ({ ...prev, seat_plan: 'Only JPEG and PNG are allowed' }));
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setFieldErrors(prev => ({ ...prev, seat_plan: 'File size must be under 10MB' }));
            return;
        }
        setSeatPlanFile(file);
        setSeatPlanPreview(URL.createObjectURL(file));
        setFieldErrors(prev => ({ ...prev, seat_plan: '' }));
    };

    const handleAddressUpdate = (address) => {
        setFormData(prev => ({ ...prev, venue_address: address }));
    };

    const validate = () => {
        const fErrors = {};
        const now = new Date();
        const start = new Date(formData.start_datetime);
        const end = new Date(formData.end_datetime);

        if (!formData.name.trim()) fErrors.name = 'Event name is required';
        if (!formData.category) fErrors.category = 'Category is required';
        if (formData.price < 0) fErrors.price = 'Price cannot be negative';

        if (!formData.start_datetime) fErrors.start_datetime = 'Start time is required';

        if (!formData.end_datetime) fErrors.end_datetime = 'End time is required';
        else if (end <= start) fErrors.end_datetime = 'End time must be after start time';

        if (!formData.capacity || formData.capacity <= 0) fErrors.capacity = 'Capacity must be positive';
        if (!location) fErrors.location = 'Venue location is required';

        const pkgs = getPackages();
        if (pkgs.length === 0) fErrors.packages = 'At least one ticket package is required';
        
        // Package uniqueness
        const names = pkgs.map(p => p.name.trim().toLowerCase());
        if (new Set(names).size !== names.length) {
            fErrors.packages = 'Package names must be unique';
        }

        return fErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});

        const fErrors = validate();
        if (Object.keys(fErrors).length > 0) {
            setFieldErrors(fErrors);
            return;
        }

        setSubmitting(true);
        try {
            const uploadData = new FormData();
            Object.keys(formData).forEach(key => uploadData.append(key, formData[key]));
            uploadData.append('latitude', parseFloat(location.lat).toFixed(6));
            uploadData.append('longitude', parseFloat(location.lng).toFixed(6));
            if (imageFile) uploadData.append('image', imageFile);
            if (seatPlanFile) uploadData.append('seat_plan_image', seatPlanFile);

            const allPkgs = getPackages();
            uploadData.append('ticket_packages', JSON.stringify(allPkgs));

            // Use PATCH for partial updates and do NOT manually set Content-Type header
            // Let axios/fetch auto-set multipart/form-data with proper boundary
            await api.patch(`/events/${id}/`, uploadData);
            
            setSuccessMsg('Event updated successfully! Redirecting...');
            setTimeout(() => {
                navigate('/events');
            }, 1500);
        } catch (err) {
            console.error('Event update error:', err);
            const errorMsg = err.response?.data?.detail || 
                           err.response?.data?.message ||
                           'Could not update event. Please check your inputs.';
            setError(errorMsg);
            setSubmitting(false);
        }
    };

    if (fetching) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CONTENT_BG }}>
            <Loader2 style={{ color: ACCENT, animation: 'spin 1s linear infinite' }} size={32} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter','Segoe UI',sans-serif", background: CONTENT_BG, overflowX: 'hidden' }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <PageHeader title="Edit Event" breadcrumb="Dashboard/Events" />

                <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
                    {error && (
                        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <X size={15} color="#dc2626" />
                            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{error}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <CheckCircle size={15} color="#16a34a" />
                            <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{successMsg}</span>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 24, paddingBottom: 60 }}>
                        {/* LEFT COLUMN */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <SectionCard icon={Info} title="Event Information">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <Label required>Event Name</Label>
                                        <input type="text" name="name" value={formData.name} onChange={handleChange} style={INPUT_STYLE(fieldErrors.name)} />
                                        <ErrorTip msg={fieldErrors.name} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <div>
                                            <Label required>Category</Label>
                                            <div style={{ position: 'relative' }}>
                                                <select name="category" value={formData.category} onChange={handleChange} style={{ ...INPUT_STYLE(false), appearance: 'none', paddingRight: 32 }}>
                                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: TEXT_MID, pointerEvents: 'none' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <Label required>Base Ticket Price (Rs.)</Label>
                                            <input type="number" name="price" value={formData.price} onChange={handleChange} style={INPUT_STYLE(false)} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Description <span style={{ fontWeight: 400, color: TEXT_MID }}>(Optional)</span></Label>
                                        <div style={{ position: 'relative' }}>
                                            <textarea 
                                                name="description" 
                                                rows={6} 
                                                value={formData.description} 
                                                onChange={handleChange} 
                                                style={{ ...INPUT_STYLE(fieldErrors.description), resize: 'vertical', lineHeight: 1.6 }} 
                                            />
                                            <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 10, color: formData.description.length >= 5000 ? '#ef4444' : TEXT_MID, fontWeight: 600, background: 'rgba(255,255,255,0.8)', padding: '2px 4px', borderRadius: 4 }}>
                                                {formData.description.length}/5000
                                            </div>
                                        </div>
                                        <ErrorTip msg={fieldErrors.description} />
                                    </div>
                                </div>
                            </SectionCard>

                            <SectionCard icon={Calendar} title="Date, Time & Capacity">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <div>
                                            <Label required>Start Date & Time</Label>
                                            <input type="datetime-local" name="start_datetime" value={formData.start_datetime} onChange={handleChange} style={INPUT_STYLE(fieldErrors.start_datetime)} />
                                        </div>
                                        <div>
                                            <Label required>End Date & Time</Label>
                                            <input type="datetime-local" name="end_datetime" value={formData.end_datetime} onChange={handleChange} style={INPUT_STYLE(fieldErrors.end_datetime)} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label required>Maximum Capacity</Label>
                                        <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} style={INPUT_STYLE(fieldErrors.capacity)} />
                                    </div>
                                </div>
                            </SectionCard>

                            <SectionCard icon={MapPin} title="Venue & Location">
                                <div>
                                    <Label required>Venue Location (Pin on Map)</Label>
                                    <button type="button" onClick={() => setIsMapModalOpen(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 8, border: `1.5px solid ${fieldErrors.location ? '#ef4444' : ACCENT}`, background: location ? '#eff6ff' : '#f8fafc', color: location ? ACCENT : TEXT_MID, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                                        <MapPin size={16} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {location ? (formData.venue_address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`) : 'Click to pick location'}
                                        </span>
                                    </button>
                                </div>
                            </SectionCard>

                            <SectionCard icon={FileText} title="Terms & Conditions">
                                <div>
                                    <Label>Event Terms & Conditions <span style={{ fontWeight: 400, color: TEXT_MID }}>(Optional)</span></Label>
                                    <div style={{ position: 'relative' }}>
                                        <textarea 
                                            name="terms_conditions" 
                                            rows={6} 
                                            value={formData.terms_conditions} 
                                            onChange={handleChange} 
                                            style={{ ...INPUT_STYLE(false), resize: 'vertical', lineHeight: 1.6 }} 
                                        />
                                        <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 10, color: formData.terms_conditions.length >= 5000 ? '#ef4444' : TEXT_MID, fontWeight: 600, background: 'rgba(255,255,255,0.8)', padding: '2px 4px', borderRadius: 4 }}>
                                            {formData.terms_conditions.length}/5000
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <SectionCard icon={ImageIcon} title="Event Cover Image">
                                {imagePreview ? (
                                    <div style={{ position: 'relative' }}>
                                        <img src={imagePreview} alt="preview" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 10, border: fieldErrors.image ? '2px solid #ef4444' : 'none' }} />
                                        <label style={{ position: 'absolute', bottom: 12, right: 12, background: '#1f2937', color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                            Change <input type="file" accept="image/jpeg,image/png" onChange={handleFileChange} style={{ display: 'none' }} />
                                        </label>
                                    </div>
                                ) : (
                                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, border: `2px dashed ${fieldErrors.image ? '#ef4444' : BORDER}`, borderRadius: 10, cursor: 'pointer', color: TEXT_MID, background: '#f8fafc' }}>
                                        <Upload size={24} />
                                        <span style={{ fontSize: 13, marginTop: 8 }}>Upload Cover *</span>
                                        <input type="file" accept="image/jpeg,image/png" onChange={handleFileChange} style={{ display: 'none' }} />
                                    </label>
                                )}
                                <ErrorTip msg={fieldErrors.image} />
                                <p style={{ fontSize: 10, color: TEXT_MID, marginTop: 8 }}>Recommended: 1200x630 (PNG, JPG under 10MB)</p>
                            </SectionCard>

                            <SectionCard icon={LayoutGrid} title="Seat Plan">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {seatPlanPreview ? (
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ width: '100%', height: 160, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${fieldErrors.seat_plan ? '#ef4444' : BORDER}`, overflow: 'hidden' }}>
                                                <img src={seatPlanPreview} alt="seat plan" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                            </div>
                                            <label style={{ position: 'absolute', bottom: 10, right: 10, background: '#4b5563', color: '#fff', fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                                                Replace <input type="file" accept="image/jpeg,image/png" onChange={handleSeatPlanChange} style={{ display: 'none' }} />
                                            </label>
                                        </div>
                                    ) : (
                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, border: `2px dashed ${fieldErrors.seat_plan ? '#ef4444' : BORDER}`, borderRadius: 10, cursor: 'pointer', color: TEXT_MID, background: '#f8fafc' }}>
                                            <LayoutGrid size={20} />
                                            <span style={{ fontSize: 12, marginTop: 6 }}>Upload Seat Plan <span style={{ fontWeight: 400 }}>(Optional)</span></span>
                                            <input type="file" accept="image/jpeg,image/png" onChange={handleSeatPlanChange} style={{ display: 'none' }} />
                                        </label>
                                    )}
                                    <ErrorTip msg={fieldErrors.seat_plan} />
                                    <div>
                                        <Label>Notes</Label>
                                        <textarea name="seat_plan_description" rows={4} value={formData.seat_plan_description} onChange={handleChange} style={{ ...INPUT_STYLE(false), resize: 'vertical', fontSize: 13 }} />
                                    </div>
                                </div>
                            </SectionCard>

                            <SectionCard icon={Tag} title="Ticket Packages">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {PRESET_PACKAGES.map(preset => {
                                            const selected = selectedPresets.includes(preset.id);
                                            return (
                                                <div key={preset.id} onClick={() => togglePreset(preset.id)}
                                                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px', borderRadius: 10, border: `1.5px solid ${selected ? preset.color : BORDER}`, background: selected ? preset.color + '0d' : '#f8fafc', cursor: 'pointer' }}>
                                                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected ? preset.color : '#cbd5e1'}`, background: selected ? preset.color : 'transparent', flexShrink: 0, marginTop: 2 }} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>{preset.emoji} {preset.label}</div>
                                                        <div style={{ fontSize: 12, color: TEXT_MID }}>Rs. {formatCurrency(preset.price)} · {preset.seating_type}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ height: 1, background: BORDER, margin: '8px 0' }} />
                                    {customPackages.map((pkg, idx) => (
                                        <div key={idx} style={{ padding: 12, borderRadius: 10, border: `1px solid ${pkg.color}40`, background: pkg.color + '08' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700 }}>Custom {idx + 1}</span>
                                                <button type="button" onClick={() => removeCustomPackage(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12} /></button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <input value={pkg.name} onChange={e => updateCustomPackage(idx, 'name', e.target.value)} placeholder="Name" style={{ ...INPUT_STYLE(false), fontSize: 12, padding: '6px 10px' }} />
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: TEXT_MID, fontWeight: 600 }}>Rs.</span>
                                                    <input type="number" value={pkg.price} onChange={e => updateCustomPackage(idx, 'price', e.target.value)} placeholder="0" style={{ ...INPUT_STYLE(false), fontSize: 12, padding: '6px 10px 6px 32px' }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addCustomPackage} style={{ padding: 10, borderRadius: 8, border: `1.5px dashed ${ACCENT}`, background: 'transparent', color: ACCENT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                        + Add Custom Package
                                    </button>
                                    <ErrorTip msg={fieldErrors.packages} />
                                </div>
                            </SectionCard>
                        </div>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '16px 32px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'flex-end', gap: 12, position: 'sticky', bottom: 0, zIndex: 10, boxShadow: '0 -2px 10px rgba(0,0,0,0.03)' }}>
                    <button type="button" onClick={() => navigate('/events')} style={{ padding: '10px 24px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: TEXT_MID, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button type="button" onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {submitting ? <><Loader2 size={16} className="spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
                    </button>
                </div>
                            <Footer />
            </main>

            {isMapModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Pin Location</h3>
                            <button onClick={() => setIsMapModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <div style={{ height: 400 }}>
                            <MapPicker location={location} setLocation={l => { setLocation(l); if (l.address) handleAddressUpdate(l.address); }} onAddressUpdate={handleAddressUpdate} />
                        </div>
                        <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}`, textAlign: 'right' }}>
                            <button onClick={() => setIsMapModalOpen(false)} style={{ padding: '8px 20px', borderRadius: 8, background: ACCENT, color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default EditEvent;
