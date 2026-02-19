import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const FeedbackContext = createContext();

export const FeedbackProvider = ({ children }) => {
    const [toast, setToast] = useState(null);
    const [modal, setModal] = useState(null);

    const showToast = useCallback((message, type = 'success', duration = 3000) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), duration);
    }, []);

    const confirmAction = useCallback((config) => {
        // config: { title, message, onConfirm, confirmText, cancelText, type }
        setModal(config);
    }, []);

    const handleConfirm = () => {
        if (modal && modal.onConfirm) modal.onConfirm();
        setModal(null);
    };

    const handleCancel = () => {
        setModal(null);
    };

    return (
        <FeedbackContext.Provider value={{ showToast, confirmAction }}>
            {children}

            {/* Toast UI */}
            {toast && (
                <div style={styles.toastContainer}>
                    <div style={styles.toast(toast.type)}>
                        {toast.type === 'success' && <CheckCircle size={18} />}
                        {toast.type === 'error' && <XCircle size={18} />}
                        {toast.type === 'warning' && <AlertCircle size={18} />}
                        {toast.type === 'info' && <Info size={18} />}
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{toast.message}</span>
                        <button onClick={() => setToast(null)} style={styles.closeBtn}><X size={14} /></button>
                    </div>
                </div>
            )}

            {/* Modal UI */}
            {modal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCard}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>{modal.title || 'Confirm Action'}</h3>
                        </div>
                        <div style={styles.modalBody}>
                            <p style={styles.modalMessage}>{modal.message}</p>
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={handleCancel} style={styles.cancelBtn}>
                                {modal.cancelText || 'Cancel'}
                            </button>
                            <button onClick={handleConfirm} style={styles.confirmBtn(modal.type)}>
                                {modal.confirmText || 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </FeedbackContext.Provider>
    );
};

export const useFeedback = () => useContext(FeedbackContext);

const styles = {
    toastContainer: {
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        animation: 'slideIn 0.3s ease'
    },
    toast: (type) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        borderRadius: 12,
        background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: 280
    }),
    closeBtn: {
        marginLeft: 'auto',
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        padding: 4
    },
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: 'fadeIn 0.2s ease'
    },
    modalCard: {
        background: '#fff',
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
    },
    modalHeader: { padding: '20px 24px 12px', borderBottom: '1px solid #f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 },
    modalBody: { padding: '20px 24px' },
    modalMessage: { fontSize: 14, color: '#64748b', lineHeight: 1.5, margin: 0 },
    modalFooter: { padding: '16px 24px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12 },
    cancelBtn: { padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    confirmBtn: (type) => ({
        padding: '8px 16px', borderRadius: 8, border: 'none', 
        background: type === 'danger' ? '#ef4444' : '#2563eb', 
        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer'
    })
};
