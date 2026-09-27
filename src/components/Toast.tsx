import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from './Icon';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
    const { t } = useTranslation('common');
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        timerRef.current = window.setTimeout(() => {
            onDismiss();
        }, 5000); // Auto-dismiss after 5 seconds

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [onDismiss]);

    const toastConfig = {
        success: { icon: ICONS.CHECK, title: t('toastSuccess', 'Success') },
        error: { icon: ICONS.X_CIRCLE, title: t('toastError', 'Error') },
        info: { icon: ICONS.COMPLAINT, title: t('toastInfo', 'Info') },
        warning: { icon: ICONS.COMPLAINT, title: t('toastWarning', 'Warning') },
    };
    
    const config = toastConfig[type];

    const handleDismiss = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        onDismiss();
    }

    return (
        <div className={`toast toast-${type}`} role="alert" aria-live="assertive" aria-atomic="true">
            <div className="toast-icon">
                <Icon>{config.icon}</Icon>
            </div>
            <div className="toast-content">
                <p className="toast-title">{config.title}</p>
                <p className="toast-message">{message}</p>
            </div>
            <button onClick={handleDismiss} className="toast-close-btn" aria-label="Close">
                &times;
            </button>
        </div>
    );
};

export default Toast;