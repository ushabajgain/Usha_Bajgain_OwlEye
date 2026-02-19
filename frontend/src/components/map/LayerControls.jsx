import React from 'react';

const LAYERS = [
    { key: 'volunteers', label: 'Volunteers', color: '#3b82f6' },
    { key: 'incidents', label: 'Incidents', color: '#f97316' },
    { key: 'sos', label: 'SOS Alerts', color: '#ef4444' },
    { key: 'heatmap', label: 'Heatmap', color: '#10b981' },
    { key: 'attendees', label: 'Attendees', color: '#f43f5e' },
    { key: 'riskZones', label: 'Risk Zones', color: '#8b5cf6' },
    { key: 'boundaries', label: 'Event Boundaries', color: '#2563eb' }
];

/**
 * Map layer toggle controls. Renders as an overlay panel on the map.
 * Each toggle controls visibility of a specific data layer.
 */
const LayerControls = ({ layers, onToggle, stats = {} }) => {
    return (
        <div style={{
            position: 'absolute', top: 16, right: 16, zIndex: 1000,
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
            borderRadius: 16, padding: '16px 20px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.06)',
            minWidth: 190,
            fontFamily: "'Inter','Segoe UI',sans-serif"
        }}>
            <div style={{
                fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 12
            }}>
                Map Layers
            </div>

            {LAYERS.map(item => {
                // Only render if the layer exists in the layers prop
                if (layers[item.key] === undefined) return null;

                return (
                    <label
                        key={item.key}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            color: layers[item.key] ? '#1e293b' : '#94a3b8',
                            transition: 'color 0.15s',
                            userSelect: 'none'
                        }}
                        onClick={() => onToggle(item.key)}
                    >
                        {/* Toggle switch */}
                        <div style={{
                            width: 34, height: 18, borderRadius: 10, flexShrink: 0,
                            background: layers[item.key] ? item.color : '#e2e8f0',
                            position: 'relative', transition: 'background 0.2s',
                            cursor: 'pointer'
                        }}>
                            <div style={{
                                width: 14, height: 14, borderRadius: '50%', background: '#fff',
                                position: 'absolute', top: 2,
                                left: layers[item.key] ? 18 : 2,
                                transition: 'left 0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }} />
                        </div>

                        <span style={{ flex: 1 }}>{item.label}</span>

                        {stats[item.key] !== undefined && (
                            <span style={{
                                fontSize: 11, fontWeight: 800,
                                color: layers[item.key] ? item.color : '#cbd5e1',
                                minWidth: 20, textAlign: 'right'
                            }}>
                                {stats[item.key]}
                            </span>
                        )}
                    </label>
                );
            })}
        </div>
    );
};

export default React.memo(LayerControls);
