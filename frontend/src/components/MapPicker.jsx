import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react';

// Fix leaflet default icon
const DefaultIcon = L.icon({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

const MapPicker = ({ location, setLocation, onAddressUpdate }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');
    const searchTimeout = useRef(null);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const initialCenter = location
            ? [location.lat, location.lng]
            : [27.7172, 85.3240]; // Kathmandu, Nepal

        const map = L.map(mapRef.current, {
            center: initialCenter,
            zoom: location ? 16 : 13,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        // If location already exists, add marker
        if (location) {
            const marker = L.marker([location.lat, location.lng], { icon: DefaultIcon }).addTo(map);
            markerRef.current = marker;
            // Reverse geocode the existing location
            reverseGeocode(location.lat, location.lng);
        } else {
            // Strategy 1: Browser Geolocation
            const getGeo = (opts) => new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, opts));

            const attemptDetection = async () => {
                try {
                    // Try high accuracy first
                    const pos = await getGeo({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
                    const { latitude: lat, longitude: lng } = pos.coords;
                    if (map && map._container) {
                        map.setView([lat, lng], 16);
                        placeMarker(map, lat, lng);
                        reverseGeocode(lat, lng);
                    }
                } catch (err) {
                    console.warn('Initial high-accuracy detect failed, trying low-accuracy...', err);
                    try {
                        const pos = await getGeo({ enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 });
                        const { latitude: lat, longitude: lng } = pos.coords;
                        if (map && map._container) {
                            map.setView([lat, lng], 16);
                            placeMarker(map, lat, lng);
                            reverseGeocode(lat, lng);
                        }
                    } catch (err2) {
                        console.warn('Initial browser detect failed, trying IP...', err2);
                        try {
                            const res = await fetch('https://ipapi.co/json/');
                            const data = await res.json();
                            if (data.latitude && data.longitude && map && map._container) {
                                map.setView([data.latitude, data.longitude], 13);
                                placeMarker(map, data.latitude, data.longitude);
                                reverseGeocode(data.latitude, data.longitude);
                            }
                        } catch (err3) {
                            console.error('All initial detection strategies failed:', err3);
                        }
                    }
                }
            };
            attemptDetection();
        }

        // On map click: place marker + reverse geocode
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            placeMarker(map, lat, lng);
            reverseGeocode(lat, lng);
        });

        mapInstanceRef.current = map;

        // Fix map sizing after modal animation
        setTimeout(() => {
            map.invalidateSize();
        }, 300);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const placeMarker = (map, lat, lng) => {
        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else {
            const marker = L.marker([lat, lng], { icon: DefaultIcon }).addTo(map);
            markerRef.current = marker;
        }
        setLocation({ lat, lng });
    };

    const reverseGeocode = async (lat, lng) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await res.json();
            if (data.display_name) {
                setSelectedAddress(data.display_name);
                if (onAddressUpdate) onAddressUpdate(data.display_name);
            }
        } catch (err) {
            console.error('Reverse geocode error:', err);
            const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setSelectedAddress(fallback);
            if (onAddressUpdate) onAddressUpdate(fallback);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=np`
                );
                const data = await response.json();
                setSearchResults(data);
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 400);
    };

    const selectResult = (res) => {
        const lat = parseFloat(res.lat);
        const lng = parseFloat(res.lon);
        const map = mapInstanceRef.current;
        if (map) {
            map.setView([lat, lng], 16);
            placeMarker(map, lat, lng);
        }
        setSearchResults([]);
        setSearchQuery(res.display_name);
        setSelectedAddress(res.display_name);
        if (onAddressUpdate) onAddressUpdate(res.display_name);
    };

    const [isLocating, setIsLocating] = useState(false);

    const handleUseCurrentLocation = async () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        setIsLocating(true);

        const applyLocation = (lat, lng, zoom = 16) => {
            const map = mapInstanceRef.current;
            if (map && map._container) {
                try {
                    map.setView([lat, lng], zoom);
                    placeMarker(map, lat, lng);
                    reverseGeocode(lat, lng);
                } catch (err) {
                    console.error('Error applying location to map:', err);
                }
            }
            setIsLocating(false);
        };

        // Strategy 1: Browser Geolocation
        const getGeo = (options) => new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));

        try {
            // Try high accuracy first
            const pos = await getGeo({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
            applyLocation(pos.coords.latitude, pos.coords.longitude);
        } catch (err) {
            console.warn('High accuracy failed, trying low accuracy...', err);
            try {
                // Try low accuracy (faster, works indoors)
                const pos = await getGeo({ enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 });
                applyLocation(pos.coords.latitude, pos.coords.longitude);
            } catch (err2) {
                console.warn('Browser geolocation failed completely, falling back to IP...', err2);
                try {
                    // Strategy 2: IP-based lookup (Third-party API)
                    const res = await fetch('https://ipapi.co/json/');
                    const data = await res.json();
                    if (data.latitude && data.longitude) {
                        applyLocation(data.latitude, data.longitude, 13);
                    } else {
                        throw new Error('IP lookup failed');
                    }
                } catch (err3) {
                    setIsLocating(false);
                    console.error('All geolocation strategies failed:', err3);
                    alert('Could not detect location. Please check browser permissions or search for your location manually.');
                }
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', overflow: 'hidden' }}>
            {/* Search Header */}
            <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0', background: '#f8fafc', position: 'relative', zIndex: 1001 }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search for a location in Nepal..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '10px 14px 10px 36px',
                            border: '1px solid #e2e8f0', borderRadius: 8,
                            fontSize: 13, outline: 'none',
                            background: '#fff', color: '#1e293b',
                            fontFamily: "'Inter','Segoe UI',sans-serif",
                        }}
                    />
                    {isSearching && (
                        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                            <Loader2 size={16} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
                        </div>
                    )}
                </div>

                {searchResults.length > 0 && (
                    <div style={{
                        position: 'absolute', left: 12, right: 12, top: '100%',
                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 1002,
                        maxHeight: 220, overflowY: 'auto',
                    }}>
                        {searchResults.map((res, i) => (
                            <button
                                key={i}
                                onClick={() => selectResult(res)}
                                style={{
                                    width: '100%', padding: '10px 14px', textAlign: 'left',
                                    background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                    fontSize: 12, color: '#334155', fontFamily: "'Inter',sans-serif",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <MapPin size={14} style={{ color: '#4f46e5', flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.display_name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Leaflet Map (plain div) */}
            <div style={{ flex: 1, position: 'relative', minHeight: 280 }}>
                <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

                {/* Use Current Location */}
                <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1000 }}>
                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={isLocating}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            background: '#fff', color: '#1e293b',
                            fontSize: 12, fontWeight: 700, cursor: isLocating ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                            opacity: isLocating ? 0.7 : 1,
                        }}
                    >
                        {isLocating ? (
                            <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Locating...</>
                        ) : (
                            <><Navigation size={14} /> Use Current Location</>
                        )}
                    </button>
                </div>

                {/* Selected location badge */}
                {selectedAddress && (
                    <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1000, maxWidth: 280 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 12px', borderRadius: 8,
                            background: '#4f46e5', color: '#fff',
                            boxShadow: '0 2px 8px rgba(79,70,229,0.4)',
                        }}>
                            <MapPin size={14} style={{ flexShrink: 0 }} />
                            <span style={{
                                fontSize: 11, fontWeight: 600,
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {selectedAddress}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapPicker;
