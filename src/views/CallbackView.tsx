import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readItem, readItems } from '@directus/sdk';
import sdk from '../api/directus';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';

type ProcessedOrder = {
    id: string;
    note: string;
    creditsAdded?: number;
    total: number;
};

const CallbackView = () => {
    const { t, i18n } = useTranslation(['buyCredits', 'dashboard', 'orders', 'common']);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [processedOrder, setProcessedOrder] = useState<ProcessedOrder | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            setLoading(true);
            try {
                // 1. Robust parameter extraction
                const urlParams = new URLSearchParams(window.location.search);
                const hashQuery = window.location.hash.split('?')[1];
                if (hashQuery) {
                    new URLSearchParams(hashQuery).forEach((value, key) => {
                        urlParams.set(key, value);
                    });
                }
                
                const trackId = urlParams.get('trackId');
                const orderId = urlParams.get('orderId');

                // We strictly need trackId to verify transaction
                if (!trackId) {
                    throw new Error('Missing payment parameters (trackId).');
                }

                // 2. Trigger Server-Side Verification Flow
                // We pass both trackId and orderId (if available) to the flow
                const FLOW_URL = 'https://crm.megamail.ir/flows/trigger/e3a2b7f4-0884-4d13-8a1b-d5e9894c06f8';
                
                const payload: any = { trackId };
                if (orderId) payload.orderId = orderId;

                await fetch(FLOW_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                // 3. Fetch the updated Order Status from Database
                // If orderId was not in URL, we might need to rely on the user navigating to orders manually,
                // but usually the payment gateway callback includes it if configured correctly.
                if (orderId) {
                    const order = await sdk.request(readItem('orders', orderId));

                    if (!order) {
                        throw new Error('Order not found.');
                    }

                    // 4. Determine Success/Failure based on Order Status
                    if (order.order_status === 'completed') {
                        // Fetch package details for display purposes
                        const packages = await sdk.request(readItems('packages', {
                            filter: { packname: { _eq: order.order_note } }
                        }));
                        
                        const packsize = (packages && packages.length > 0) ? packages[0].packsize : 0;

                        setMessage(t('paymentSuccessMessage', { count: packsize.toLocaleString(i18n.language) }));
                        setProcessedOrder({
                            id: order.id,
                            note: order.order_note,
                            creditsAdded: packsize > 0 ? packsize : undefined,
                            total: order.order_total,
                        });
                    } else {
                        // Payment failed or is still pending/failed in DB
                        setProcessedOrder({
                            id: order.id,
                            note: order.order_note,
                            total: order.order_total,
                        });
                        throw new Error(t('paymentFailed'));
                    }
                } else {
                    // Fallback if no orderId in URL (though it should be there)
                    setMessage("Payment processed. Please check your orders page.");
                }

            } catch (err: any) {
                let errorMessage = err.message;
                // Handle Directus API errors structure if any leak through
                if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
                    errorMessage = err.errors[0].message;
                }
                
                setError(errorMessage || 'An unknown error occurred during payment verification.');
                console.error("Payment Verification Error:", err);
            } finally {
                setLoading(false);
            }
        };

        handleCallback();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleReturn = () => {
        window.location.href = '/#account-orders';
    };

    if (loading) {
        return (
            <CenteredMessage style={{ height: '100vh' }}>
                <Loader />
                <p style={{ marginTop: '1rem', color: 'var(--subtle-text-color)' }}>
                    Verifying your payment, please wait...
                </p>
            </CenteredMessage>
        );
    }

    return (
        <div className="auth-container">
            <div className="card" style={{ maxWidth: '500px', width: '100%', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
                {error ? (
                    <>
                        <Icon style={{ width: 48, height: 48, color: 'var(--danger-color)', margin: '0 auto 1rem' }}>{ICONS.X_CIRCLE}</Icon>
                        <h2 style={{ color: 'var(--danger-color)' }}>{t('paymentFailed')}</h2>
                        <p style={{ color: 'var(--subtle-text-color)', maxWidth: '400px', margin: '0 auto 1.5rem', wordBreak: 'break-word' }}>{error}</p>
                        {processedOrder && (
                             <div className="table-container-simple" style={{ marginBottom: '2rem', textAlign: 'left' }}>
                                <table className="simple-table">
                                     <tbody>
                                        <tr><td>{t('orderId', { ns: 'orders' })}</td><td style={{textAlign: 'right'}}><strong>#{processedOrder.id}</strong></td></tr>
                                        <tr><td>{t('package')}</td><td style={{textAlign: 'right'}}><strong>{processedOrder.note}</strong></td></tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="form-actions" style={{ justifyContent: 'center' }}>
                            <button onClick={handleReturn} className="btn btn-primary">{t('returnToOrders', { ns: 'orders' })}</button>
                        </div>
                    </>
                ) : (
                    <>
                        <Icon style={{ width: 48, height: 48, color: 'var(--success-color)', margin: '0 auto 1rem' }}>{ICONS.CHECK}</Icon>
                        <h2 style={{ color: 'var(--success-color)' }}>{t('paymentSuccess')}</h2>
                        <p style={{ color: 'var(--subtle-text-color)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>{message}</p>
                        {processedOrder && (
                            <div className="table-container-simple" style={{ marginBottom: '2rem', textAlign: 'left' }}>
                                <table className="simple-table">
                                    <tbody>
                                        <tr><td>{t('orderId', { ns: 'orders' })}</td><td style={{textAlign: 'right'}}><strong>#{processedOrder.id}</strong></td></tr>
                                        <tr><td>{t('package')}</td><td style={{textAlign: 'right'}}><strong>{processedOrder.note}</strong></td></tr>
                                        {processedOrder.creditsAdded && <tr><td>{t('credits', { ns: 'dashboard' })}</td><td style={{textAlign: 'right'}}><strong>+{processedOrder.creditsAdded.toLocaleString(i18n.language)}</strong></td></tr>}
                                        <tr><td>{t('total', { ns: 'common' })}</td><td style={{textAlign: 'right'}}><strong>${processedOrder.total.toLocaleString('en-US')} USD</strong></td></tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="form-actions" style={{ justifyContent: 'center' }}>
                            <button onClick={handleReturn} className="btn btn-primary">{t('returnToOrders', { ns: 'orders' })}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CallbackView;