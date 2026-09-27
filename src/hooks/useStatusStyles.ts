import React from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '../components/Icon';
import { useLabels } from '../contexts/LabelsContext';

export type StatusStyle = {
    text: string;
    type: 'success' | 'warning' | 'danger' | 'info' | 'default';
    iconPath?: React.ReactNode;
    color?: string;
};

// This hook provides consistent styling for status badges across the app.
export const useStatusStyles = () => {
    const { t } = useTranslation(['common', 'contacts']);
    const { labels } = useLabels();

    const getStatusStyle = (status: string | undefined): StatusStyle => {
        const originalStatus = status ? t(status.toLowerCase(), { ns: 'contacts', defaultValue: status }) : t('unknown');
        const normalizedStatus = String(status || 'unknown').toLowerCase().replace(/\s/g, '');
        
        const color = labels?.[normalizedStatus] || undefined;

        // Map various status strings to a standardized style type
        switch (normalizedStatus) {
            // Success states
            case 'active':
            case 'completed':
            case 'verified':
            case 'delivered':
            case 'engaged':
            case 'success':
                return { text: originalStatus, type: 'success', iconPath: ICONS.CHECK, color };

            // Warning / In-progress states
            case 'pending':
            case 'paused':
            case 'transactional':
            case 'checking':
            case 'stale':
            case 'notconfirmed':
                return { text: originalStatus, type: 'warning', iconPath: ICONS.LOADING_SPINNER, color };
            
            case 'missing':
            case 'notverified':
                return { text: originalStatus, type: 'warning', color };

            // Info states
            case 'processing':
            case 'sending':
            case 'inprogress':
            case 'draft':
            case 'review':
            case 'info':
                 return { text: originalStatus, type: 'info', iconPath: ICONS.LOADING_SPINNER, color };

            // Danger / Error states
            case 'inactive':
            case 'failed':
            case 'cancelled':
            case 'deleted':
            case 'bounced':
            case 'abuse':
            case 'unsubscribed':
            case 'complaints':
            case 'manualcancel':
            case 'notdelivered':
            case 'invalid':
                return { text: originalStatus, type: 'danger', iconPath: ICONS.X_CIRCLE, color };
            
            // Default
            default:
                return { text: originalStatus, type: 'default', color };
        }
    };

    return { getStatusStyle };
};