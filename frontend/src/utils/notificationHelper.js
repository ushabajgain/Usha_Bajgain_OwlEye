// Notification intent types
export const NOTIFICATION_INTENT = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  ALERT: 'alert'
};

// Get styling for different notification intents
export const getIntentStyle = (intent) => {
  const styles = {
    [NOTIFICATION_INTENT.INFO]: {
      backgroundColor: '#eff6ff',
      borderColor: '#93c5fd',
      dotColor: '#3b82f6',
      titleColor: '#1e40af'
    },
    [NOTIFICATION_INTENT.SUCCESS]: {
      backgroundColor: '#f0fdf4',
      borderColor: '#86efac',
      dotColor: '#22c55e',
      titleColor: '#166534'
    },
    [NOTIFICATION_INTENT.WARNING]: {
      backgroundColor: '#fffbeb',
      borderColor: '#fcd34d',
      dotColor: '#f59e0b',
      titleColor: '#92400e'
    },
    [NOTIFICATION_INTENT.ERROR]: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      dotColor: '#ef4444',
      titleColor: '#991b1b'
    },
    [NOTIFICATION_INTENT.ALERT]: {
      backgroundColor: '#fef2f2',
      borderColor: '#fca5a5',
      dotColor: '#dc2626',
      titleColor: '#7f1d1d'
    }
  };

  return styles[intent] || styles[NOTIFICATION_INTENT.INFO];
};

// Transform notifications and SOS alerts into a unified display format
export const getDisplayNotifications = (notifications = [], sosAlerts = {}) => {
  const result = [];

  // Add regular notifications
  if (Array.isArray(notifications)) {
    notifications.forEach(n => {
      result.push({
        id: n.id,
        type: 'notification',
        dbId: n.id,
        title: n.title || 'Notification',
        message: n.message || '',
        created_at: n.created_at,
        is_read: n.is_read || false,
        intent: NOTIFICATION_INTENT.INFO,
        notification_type: n.notification_type,
        user_id: n.user_id,
        event_id: n.event_id,
        target: n.target,
        compositeId: `notification-${n.id}`
      });
    });
  }

  // Add SOS alerts
  if (sosAlerts && typeof sosAlerts === 'object') {
    Object.values(sosAlerts).forEach(sos => {
      result.push({
        id: sos.id,
        type: 'sos',
        dbId: sos.id,
        title: `SOS: ${sos.sos_type_display || 'Emergency'}`,
        message: sos.message || 'Emergency alert',
        created_at: sos.created_at,
        is_read: sos.is_read || false,
        intent: NOTIFICATION_INTENT.ALERT,
        sos_type: sos.sos_type,
        status: sos.status,
        user_id: sos.user_id,
        compositeId: `sos-${sos.id}`
      });
    });
  }

  return result;
};

// Deduplicate notifications by compositeId
export const deduplicateNotifications = (notifications = []) => {
  if (!notifications || !Array.isArray(notifications)) return [];

  const seen = new Set();
  return notifications.filter(n => {
    const id = n.compositeId || `${n.type}-${n.id}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};
