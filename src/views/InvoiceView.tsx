import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { formatDateForDisplay } from '../utils/helpers';
import Icon, { ICONS } from '../components/Icon';
import Badge from '../components/Badge';
import { useStatusStyles } from '../hooks/useStatusStyles';

const InvoiceView = ({ order, setView }: { order: any, setView: (view: string, data?: any) => void }) => {
    const { t, i18n } = useTranslation(['orders', 'common', 'buyCredits']);
    const { user } = useAuth();
    const { config } = useConfiguration();
    const { getStatusStyle } = useStatusStyles();

    if (!order) {
        return (
            <div className="invoice-container">
                <p>{t('noOrderSelected')}</p>
            </div>
        );
    }
    
    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        sessionStorage.setItem('account-tab', 'orders');
        setView('Account');
    };

    const logoUrl = config?.app_logo && config?.app_backend ? `${config.app_backend}/assets/${config.app_logo}` : '';
    const appName = config?.app_name || t('appName');

    return (
        <div className="invoice-view-container">
            <div className="invoice-actions">
                <button className="btn btn-secondary" onClick={handleBack}>
                    {/* FIX: Changed path prop to children for Icon component */}
                    <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                    <span>{t('backToOrders', { ns: 'buyCredits' })}</span>
                </button>
                <button className="btn btn-primary" onClick={handlePrint}>
                    {/* FIX: Changed path prop to children for Icon component */}
                    <Icon>{ICONS.DOWNLOAD}</Icon>
                    <span>{t('print')}</span>
                </button>
            </div>
            <div className="invoice-paper">
                <header className="invoice-header">
                    <div className="invoice-company-info">
                        {logoUrl && <img src={logoUrl} alt={appName} className="invoice-logo" />}
                        <h2>{appName}</h2>
                        {config?.app_support && <p>{config.app_support}</p>}
                        {config?.app_phone && <p>{config.app_phone}</p>}
                    </div>
                    <div className="invoice-title-section">
                        <h1>{t('invoiceTitle')}</h1>
                        <p>#{order.id}</p>
                    </div>
                </header>
                
                <section className="invoice-meta">
                    <div className="invoice-bill-to">
                        <h4>{t('billTo')}</h4>
                        {user?.company && <p><strong>{user.company}</strong></p>}
                        <p>{user?.first_name} {user?.last_name}</p>
                        <p>{user?.email}</p>
                        {user?.mobile && <p>{user.mobile}</p>}
                        {user?.website && <p><a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer">{user.website}</a></p>}
                    </div>
                    <div className="invoice-dates">
                        <p><strong>{t('issueDate')}:</strong> {formatDateForDisplay(order.date_created, i18n.language)}</p>
                    </div>
                </section>
                
                <section className="invoice-items">
                    <div className="table-container-simple">
                        <table className="simple-table">
                            <thead>
                                <tr>
                                    <th>{t('description')}</th>
                                    <th style={{textAlign: 'center'}}>{t('quantity')}</th>
                                    <th style={{textAlign: 'right'}}>{t('unitPrice')}</th>
                                    <th style={{textAlign: 'right'}}>{t('amount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{order.order_note}</td>
                                    <td style={{textAlign: 'center'}}>1</td>
                                    <td style={{textAlign: 'right'}}>${order.order_total.toLocaleString('en-US')} USD</td>
                                    <td style={{textAlign: 'right'}}>${order.order_total.toLocaleString('en-US')} USD</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
                
                <section className="invoice-summary">
                    <div className="invoice-status">
                         <Badge text={t('paid')} type="success" iconPath={ICONS.CHECK} />
                    </div>
                    <div className="invoice-totals">
                        <div className="total-row">
                            <span>{t('subtotal')}</span>
                            <span>${order.order_total.toLocaleString('en-US')} USD</span>
                        </div>
                        <div className="total-row">
                            <span>{t('tax')}</span>
                            <span>$0.00 USD</span>
                        </div>
                        <div className="total-row grand-total">
                            <span>{t('total')}</span>
                            <span>${order.order_total.toLocaleString('en-US')} USD</span>
                        </div>
                    </div>
                </section>
                
                <footer className="invoice-footer">
                    <p>{t('thankYouForYourBusiness')}</p>
                </footer>
            </div>
        </div>
    );
};

export default InvoiceView;