import React, { useEffect, useState } from 'react';
import { ShieldAlert, X, Bell, Siren, Shield, AlertTriangle } from 'lucide-react';
import C from '../utils/colors';
import { getToken, getRole, getUserId } from '../utils/auth';

const SafetyAlertListener = () => {
    const [alert, setAlert] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!getToken()) return;
        
        // Skip if WebSocket is known to be unsupported (from previous attempt)
        if (sessionStorage.getItem('wsDisabled') === 'true') return;
        
        // We use a fixed event ID 1 for now as per current project pattern
        const socket = new WebSocket(`ws://127.0.0.1:8000/ws/heatmap/1/`);

        socket.onerror = (err) => {
            // Mark WebSocket as disabled for this session
            sessionStorage.setItem('wsDisabled', 'true');
        };

        socket.onclose = (e) => {
            // Mark WebSocket as disabled if connection fails
            if (e.code === 1006 || !e.wasClean) {
                sessionStorage.setItem('wsDisabled', 'true');
            }
        };

        socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                const role = getRole();
                const userId = getUserId();

                let shouldShow = false;
                let title = "";
                let body = "";
                let severity = "info";
                let icon = <Bell />;

                if (data.entity_type === 'safety_alert') {
                    shouldShow = true;
                    title = data.title;
                    body = data.message;
                    severity = data.severity;
                    icon = <ShieldAlert size={24} />;
                } 
                else if (data.entity_type === 'sos') {
                    // Organizers see all new SOS
                    if ((role === 'organizer' || role === 'admin')) {
                        shouldShow = true;
                        title = "EMERGENCY: SOS SIGNAL";
                        body = `${data.user_name} is in distress at ${data.location_name || 'Event Venue'}.`;
                        severity = "critical";
                        icon = <Siren size={24} />;
                    }
                    // Attendee sees if THEIR SOS is acknowledged
                    else if (Number(data.user_id) === Number(userId) && data.status === 'responder_acknowledged') {
                        shouldShow = true;
                        title = "SOS ACKNOWLEDGED";
                        body = `${data.assigned_volunteer_name} is arriving to assist you. Stay calm.`;
                        severity = "info";
                        icon = <Shield size={24} />;
                    }
                }
                else if (data.entity_type === 'incident') {
                    // Volunteer sees if an incident is assigned to them
                    if (role === 'volunteer' && Number(data.assigned_volunteer_id) === Number(userId)) {
                        shouldShow = true;
                        title = "NEW TASK ASSIGNED";
                        body = `Incident: ${data.title}. Please report to ${data.location_name || 'the area'}.`;
                        severity = "warning";
                        icon = <Shield size={24} />;
                    }
                    // Organizer sees all new reports
                    else if ((role === 'organizer' || role === 'admin') && data.action === 'new_incident') {
                        shouldShow = true;
                        title = "NEW INCIDENT REPORTED";
                        body = `${data.title} reported at ${data.location_name}. Verification needed.`;
                        severity = "warning";
                        icon = <AlertTriangle size={24} />;
                    }
                }

                if (shouldShow) {
                    setAlert({ title, message: body, severity });
                    setVisible(true);
                    
                    // Auto-hide after 15 seconds unless it's critical
                    if (severity !== 'critical') {
                        setTimeout(() => setVisible(false), 15000);
                    }
                }
            } catch (err) {
                console.error("Socket error", err);
            }
        };

        return () => socket.close();
    }, []);

    if (!visible || !alert) return null;

    const bg = alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#f59e0b' : '#3b82f6';
    const accentColor = alert.severity === 'critical' ? '#fecaca' : alert.severity === 'warning' ? '#fef3c7' : '#dbeafe';

    return (
        <div style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
            width: '90%', maxWidth: 500, background: bg, color: '#fff', borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', padding: '20px 24px',
            display: 'flex', alignItems: 'start', gap: 16, border: `2px solid ${accentColor}`,
            animation: 'slideDownPulse 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
            <div style={{ 
                background: 'rgba(255,255,255,0.2)', borderRadius: 12, width: 48, height: 48, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
            }}>
                {alert.title.includes('SOS') ? <Siren size={28} /> : <Bell size={28} />}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9, background: 'rgba(0,0,0,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                        {alert.severity} System Alert
                    </span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>{alert.title}</h3>
                <p style={{ fontSize: 14, fontWeight: 500, margin: 0, opacity: 0.95, lineHeight: 1.5 }}>
                    {alert.message}
                </p>
            </div>
            <button 
                onClick={() => setVisible(false)}
                style={{ 
                    background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '50%', 
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    cursor: 'pointer', color: '#fff', transition: 'all 0.2s'
                }}>
                <X size={18} />
            </button>
            <style>{`
                @keyframes slideDownPulse {
                    from { transform: translate(-50%, -120%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                @keyframes pulse-once {
                    0% { transform: translate(-50%, 0) scale(1); }
                    50% { transform: translate(-50%, 0) scale(1.02); }
                    100% { transform: translate(-50%, 0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default SafetyAlertListener;
