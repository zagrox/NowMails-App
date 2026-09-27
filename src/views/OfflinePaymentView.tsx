import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import sdk from '../api/directus';
import { useToast } from '../contexts/ToastContext';
import { useConfiguration } from '../contexts/ConfigurationContext';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import CenteredMessage from '../components/CenteredMessage';

const OfflinePaymentView = ({ order, setView }: { order: any, setView: (view: string, data?: any) => void }) => {
    const { t, i18n } = useTranslation(['buyCredits', 'common', 'orders']);
    const { addToast } = useToast();
    const { config } = useConfiguration();
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!order) {
        return (
            <CenteredMessage>
                <div className="info-message warning">
                    <p>{t('noOrderSelected', { ns: 'orders' })}</p>
                </div>
            </CenteredMessage>
        );
    }
    
    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!details.trim()) {
            addToast(t('detailsCannotBeEmpty'), 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const token = await sdk.getToken();
            if (!token) throw new Error("Authentication token not found.");
            if (!config?.app_backend) throw new Error("Application backend is not configured.");

            // Update both the details and the status to 'processing' upon submission.
            const response = await fetch(`${config.app_backend}/items/orders/${order.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    order_offline: details,
                    order_status: 'processing'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.errors?.[0]?.message || 'Failed to submit details.';
                throw new Error(errorMessage);
            }

            addToast(t('detailsSubmittedSuccess'), 'success');
            sessionStorage.setItem('account-tab', 'orders');
            setView('Account');

        } catch (error: any) {
            addToast(t('detailsSubmittedError', { error: error.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackToOrders = () => {
        sessionStorage.setItem('account-tab', 'orders');
        setView('Account');
    };

    const bankName = t('bankNameValue', { ns: 'buyCredits' });
    const cardNumber = t('cardNumberValue', { ns: 'buyCredits' });
    const accountName = t('accountNameValue', { ns: 'buyCredits' });
    
    // Check if the translation keys exist in the language file.
    // The t() function returns the key if no translation is found.
    const bankDetailsAvailable = bankName !== 'bankNameValue' && cardNumber !== 'cardNumberValue' && accountName !== 'accountNameValue';

    return (
        <div className="buy-credits-view">
             <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="card-header" style={{ textAlign: 'center', borderBottom: 'none', paddingBottom: 0 }}>
                    <h2 style={{fontSize: '1.5rem'}}>{t('offlinePaymentFormTitle')}</h2>
                    <p style={{ color: 'var(--subtle-text-color)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        {bankDetailsAvailable ? t('ourBankDetailsInstruction') : t('offlinePaymentFormInstructions')}
                    </p>
                </div>
                <div className="card-body">
                    <div className="table-container-simple" style={{ marginBottom: '2rem' }}>
                        <table className="simple-table">
                            <tbody>
                                <tr><td>{t('orderId')}</td><td style={{textAlign: 'right'}}><strong>#{order.id}</strong></td></tr>
                                <tr><td>{t('package')}</td><td style={{textAlign: 'right'}}><strong>{order.order_note}</strong></td></tr>
                                <tr><td>{t('totalAmount', { ns: 'orders' })}</td><td style={{textAlign: 'right'}}><strong>${Number(order.order_total).toLocaleString('en-US')} USD</strong></td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    {bankDetailsAvailable && (
                        <div className="bank-details-section">
                            <h4>{t('ourBankDetails')}</h4>
                            <dl className="bank-details-list">
                                <dt>{t('bankNameLabel')}</dt>
                                <dd>
                                    <span>{bankName}</span>
                                    <button className="btn-icon" onClick={() => handleCopy(bankName, 'bank')}>
                                        <Icon>{copiedField === 'bank' ? ICONS.CHECK : ICONS.COPY}</Icon>
                                    </button>
                                </dd>
                                <dt>{t('cardNumberLabel')}</dt>
                                <dd>
                                    <span>{cardNumber}</span>
                                    <button className="btn-icon" onClick={() => handleCopy(cardNumber, 'card')}>
                                        <Icon>{copiedField === 'card' ? ICONS.CHECK : ICONS.COPY}</Icon>
                                    </button>
                                </dd>
                                <dt>{t('accountNameLabel')}</dt>
                                <dd>
                                    <span>{accountName}</span>
                                    <button className="btn-icon" onClick={() => handleCopy(accountName, 'name')}>
                                        <Icon>{copiedField === 'name' ? ICONS.CHECK : ICONS.COPY}</Icon>
                                    </button>
                                </dd>
                            </dl>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="transfer-details">{t('transferDetails')}</label>
                            <textarea
                                id="transfer-details"
                                value={details}
                                onChange={e => setDetails(e.target.value)}
                                rows={6}
                                placeholder={t('transferDetailsPlaceholder')}
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="form-actions" style={{ justifyContent: 'space-between', padding: '1.5rem 0 0', border: 'none' }}>
                            <button type="button" className="btn btn-secondary" onClick={handleBackToOrders} disabled={isSubmitting}>
                                <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                                <span>{t('backToOrders')}</span>
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !details.trim()}>
                                {isSubmitting ? <Loader /> : <Icon>{ICONS.CHECK}</Icon>}
                                <span>{t('submitDetails')}</span>
                            </button>
                        </div>
                    </form>
                </div>
             </div>
        </div>
    );
};

export default OfflinePaymentView;
