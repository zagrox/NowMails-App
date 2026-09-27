import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { readItems, updateItem } from '@directus/sdk';
import sdk from '../../api/directus';
import { useAuth } from '../../contexts/AuthContext';
import CenteredMessage from '../../components/CenteredMessage';
import Loader from '../../components/Loader';
import ErrorMessage from '../../components/ErrorMessage';
import Icon, { ICONS } from '../../components/Icon';
import { formatDateRelative } from '../../utils/helpers';
import { useToast } from '../../contexts/ToastContext';

// Define the notification type
interface Notification {
    id: string;
    recipient: string | null;
    is_system_wide: boolean;
    icon: string;
    message: string;
    link: string | null;
    read_status: boolean;
    date_created: string;
}

// Map icon names from Directus to the ICONS object
// FIX: Changed return type from string to React.ReactNode to match returned JSX elements.
const getIconPath = (iconName: string): React.ReactNode => {
    switch (iconName?.toLowerCase()) {
        case 'order':
        case 'cart':
        case 'credits':
            return ICONS.BUY_CREDITS;
        case 'user':
        case 'profile':
        case 'account':
            return ICONS.ACCOUNT;
        case 'system':
        case 'info':
            return ICONS.COMPLAINT;
        default:
            return ICONS.BELL;
    }
};

const NotificationsTab = () => {
    const { t, i18n } = useTranslation(['common', 'account']);
    const { user } = useAuth();
    const { addToast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user || !user.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const filter = {
                _and: [
                    { status: { _eq: 'published' } },
                    {
                        _or: [
                            { recipient: { _eq: user.id } },
                            { is_system_wide: { _eq: true } }
                        ]
                    }
                ]
            };
            const response = await sdk.request(readItems('notifications', {
                filter,
                sort: ['-date_created'],
                limit: 100 // Fetch up to 100 notifications
            }));
            setNotifications(response as Notification[]);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch notifications.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleMarkAsRead = async (notificationId: string) => {
        // Optimistic UI update
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read_status: true } : n)
        );
        try {
            await sdk.request(updateItem('notifications', notificationId, { read_status: true }));
        } catch (err: any) {
            addToast('Failed to update notification status.', 'error');
            // Revert UI on failure
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, read_status: false } : n)
            );
        }
    };
    
    const handleMarkAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.read_status).map(n => n.id);
        if (unreadIds.length === 0) return;

        // Optimistic UI update
        const originalNotifications = JSON.parse(JSON.stringify(notifications));
        setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));

        try {
            // Using updateItems for batch update is more efficient if available/configured.
            // For now, mapping over updateItem is a safe default.
            await Promise.all(
                unreadIds.map(id => sdk.request(updateItem('notifications', id, { read_status: true })))
            );
            addToast('All notifications marked as read.', 'success');
        } catch (err: any) {
            addToast('Failed to mark all as read.', 'error');
            // Revert on failure
            setNotifications(originalNotifications);
        }
    };
    
    const handleClickNotification = (notification: Notification) => {
        if (!notification.read_status) {
            handleMarkAsRead(notification.id);
        }
        if (notification.link) {
            // For now, basic navigation. Could be enhanced to use an app router.
            window.location.href = notification.link;
        }
    };

    const unreadCount = notifications.filter(n => !n.read_status).length;
    
    // Create new CSS for the notification list
    const css = `
        .notifications-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .notification-item {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            background-color: var(--surface-color);
            border-left: 4px solid var(--border-color);
            border-radius: 4px;
            transition: background-color 0.2s;
            align-items: flex-start;
        }
        .notification-item.unread {
            background-color: var(--subtle-background);
            border-left-color: var(--secondary-color);
        }
        .notification-item.clickable:hover {
            background-color: var(--border-color);
            cursor: pointer;
        }
        .notification-icon-wrapper {
            flex-shrink: 0;
            color: var(--secondary-color);
        }
        .notification-content {
            flex-grow: 1;
        }
        .notification-message {
            margin: 0;
            font-weight: 500;
        }
        .notification-timestamp {
            font-size: 0.85rem;
            color: var(--subtle-text-color);
            margin-top: 0.25rem;
        }
        .notifications-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
    `;

    if (loading) {
        return <CenteredMessage><Loader /></CenteredMessage>;
    }

    if (error) {
        return <ErrorMessage error={{ message: error, endpoint: 'notifications' }} />;
    }

    return (
        <div className="account-tab-card">
            <style>{css}</style>
            <div className="account-tab-card-header notifications-header">
                <h3>{t('notifications')}</h3>
                <button
                    className="btn btn-secondary"
                    onClick={handleMarkAllAsRead}
                    disabled={unreadCount === 0}
                >
                    {/* FIX: Changed to use JSX children for Icon component */}
                    <Icon>{ICONS.CHECK}</Icon>
                    <span>{t('markAllAsRead')}</span>
                </button>
            </div>
            <div className="account-tab-card-body">
                {notifications.length === 0 ? (
                    <CenteredMessage>
                        <div className="info-message">
                            <strong>{t('noNotifications')}</strong>
                            <p>{t('noNotificationsDesc')}</p>
                        </div>
                    </CenteredMessage>
                ) : (
                    <div className="notifications-list">
                        {notifications.map(n => (
                            <div
                                key={n.id}
                                className={`notification-item ${!n.read_status ? 'unread' : ''} ${n.link ? 'clickable' : ''}`}
                                onClick={() => handleClickNotification(n)}
                                role={n.link ? 'link' : 'listitem'}
                                tabIndex={0}
                                onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleClickNotification(n)}
                            >
                                <div className="notification-icon-wrapper">
                                    {/* FIX: Changed to use JSX children for Icon component */}
                                    <Icon>{getIconPath(n.icon)}</Icon>
                                </div>
                                <div className="notification-content">
                                    <p className="notification-message">{n.message}</p>
                                    <p className="notification-timestamp">{formatDateRelative(n.date_created, i18n.language)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsTab;