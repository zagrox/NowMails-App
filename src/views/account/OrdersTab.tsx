
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { readItems } from '@directus/sdk';
import sdk from '../../api/directus';
import { useAuth } from '../../contexts/AuthContext';
import CenteredMessage from '../../components/CenteredMessage';
import Loader from '../../components/Loader';
import ErrorMessage from '../../components/ErrorMessage';
import Icon, { ICONS } from '../../components/Icon';
import OrderDetailsModal from './OrderDetailsModal';
import { formatDateRelative } from '../../utils/helpers';
import Badge from '../../components/Badge';
import { useOrderStatuses } from '../../hooks/useOrderStatuses';
import Button from '../../components/Button';

const OrdersTab = ({ setView }: { setView: (view: string, data?: any) => void }) => {
    const { t, i18n } = useTranslation(['orders', 'common', 'buyCredits', 'dashboard']);
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<{ message: string, endpoint: string } | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const { statusesMap, loading: statusesLoading } = useOrderStatuses();

    useEffect(() => {
        if (!user || !user.id) {
            setLoading(false);
            return;
        }

        const fetchOrders = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await sdk.request(readItems('orders', {
                    filter: { user_created: { _eq: user.id } },
                    sort: ['-date_created'],
                    fields: ['*', 'transactions.*']
                }));
                setOrders(response);
            } catch (err: any) {
                console.error("Failed to fetch orders:", err);
                
                // This function safely extracts a string message from various error formats.
                const getErrorMessage = (error: any): string => {
                    // Directus SDK error format
                    if (error?.errors?.[0]?.message) {
                        return error.errors[0].message;
                    }
                    // Standard Error or object with a message property
                    if (error?.message) {
                        // If message is an object, stringify it to avoid [object Object]
                        return typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
                    }
                    // If the error itself is a string
                    if (typeof error === 'string') {
                        return error;
                    }
                    // Fallback for other unexpected error structures
                    return t('unknownError');
                };

                const errorMessage = getErrorMessage(err);
                setError({ message: errorMessage, endpoint: 'GET /items/orders' });
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [user, t]);

    const getStatusBadgeType = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'pending': return 'warning';
            case 'failed': return 'danger';
            default: return 'default';
        }
    };

    const handleContinueOrder = (order: any) => {
        setSelectedOrder(null); // Close the modal first
        setView('Buy Credits', { orderToResume: order });
    };
    
    const handleCreateNewOrder = () => {
        setSelectedOrder(null);
        setView('Buy Credits');
    };

    const handleGoToOfflineForm = (order: any) => {
        setSelectedOrder(null);
        setView('OfflinePayment', { order: order });
    };

    const handleViewInvoice = (order: any) => {
        setSelectedOrder(null);
        setView('Invoice', { order: order });
    };

    if (loading) {
        return <CenteredMessage><Loader /></CenteredMessage>;
    }

    if (error) {
        return <ErrorMessage error={error} />;
    }

    return (
        <div className="account-tab-card">
            {selectedOrder && (
                <OrderDetailsModal
                    isOpen={!!selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    order={selectedOrder}
                    onContinueOrder={handleContinueOrder}
                    onGoToOfflineForm={handleGoToOfflineForm}
                    onViewInvoice={handleViewInvoice}
                    onCreateNewOrder={handleCreateNewOrder}
                />
            )}
            <div className="account-tab-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>{t('orders')}</h3>
                <Button className="btn-primary" onClick={() => setView('Buy Credits')}>
                    <Icon>{ICONS.PLUS}</Icon>
                    <span>{t('newOrder')}</span>
                </Button>
            </div>
            <div className="account-tab-card-body" style={{ padding: 0 }}>
                {orders.length === 0 ? (
                    <CenteredMessage>{t('noOrdersFound')}</CenteredMessage>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('description')}</th>
                                    <th>{t('date')}</th>
                                    <th>{t('totalAmount')}</th>
                                    <th>{t('status')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => {
                                    const orderStatus = order.order_status;
                                    const statusInfo = !statusesLoading ? statusesMap[orderStatus] : null;
                                    const isModulePurchase = order.project_name?.includes('Module Purchase');
                                    const currency = isModulePurchase ? t('credits', { ns: 'dashboard' }) : 'USD';

                                    return (
                                        <tr key={order.id}>
                                            <td>{order.order_note}</td>
                                            <td>{formatDateRelative(order.date_created, i18n.language)}</td>
                                            <td>{order.order_total.toLocaleString(i18n.language)} {currency}</td>
                                            <td>
                                                {statusInfo ? (
                                                    <Badge text={statusInfo.text} color={statusInfo.color} iconPath={statusInfo.iconPath} />
                                                ) : (
                                                    <Badge text={orderStatus} type={getStatusBadgeType(orderStatus)} />
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn-icon btn-icon-primary" onClick={() => setSelectedOrder(order)} aria-label={t('orderDetails', { ns: 'buyCredits' })}>
                                                    <Icon>{ICONS.EYE}</Icon>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersTab;
