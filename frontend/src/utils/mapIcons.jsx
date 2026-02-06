import L from "leaflet";
import {
    User,
    Shield,
    HardHat,
    AlertTriangle,
    Zap
} from "lucide-react";
import { renderToString } from "react-dom/server";

export const getIcon = (type, severity = null) => {
    let color = "#3b82f6"; // Default blue
    let IconComponent = User;

    switch (type) {
        case 'attendee':
            color = "#60a5fa"; // Light blue
            IconComponent = User;
            break;
        case 'volunteer':
            color = "#fbbf24"; // Amber
            IconComponent = HardHat;
            break;
        case 'organizer':
            color = "#a855f7"; // Purple
            IconComponent = Shield;
            break;
        case 'incident':
            color = severity === 'CRITICAL' ? "#ef4444" : "#f97316";
            IconComponent = AlertTriangle;
            break;
        case 'authority':
            color = "#6366f1"; // Indigo
            IconComponent = Shield;
            break;
        case 'sos':
            color = "#ef4444"; // Red
            IconComponent = Zap;
            break;
    }

    const iconHtml = renderToString(
        <div style={{
            color: color,
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: "6px",
            borderRadius: "50%",
            border: `2px solid ${color}`,
            boxShadow: `0 0 10px ${color}`
        }}>
            <IconComponent size={20} />
        </div>
    );

    return L.divIcon({
        className: "custom-marker-icon",
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });
};
