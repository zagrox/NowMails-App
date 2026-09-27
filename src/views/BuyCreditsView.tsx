import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { readItems, createItem, readItem } from '@directus/sdk';
import sdk from '../api/directus';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useToast } from '../contexts/ToastContext';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import Modal from '../components/Modal';
import Button from '../components/Button';
import useApi from './useApi';

interface Package {
    id: number;
    packname: string;
    packsize: number;
    packprice: number;
    description?: string;
    sort?: number;
}

const PricingModal = ({ isOpen, onClose, packages }: { isOpen: boolean, onClose: () => void, packages: Package[] }) => {
    const { t, i18n } = useTranslation(['buyCredits', 'common', 'dashboard']);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('pricingModalTitle')}>
            <div className="table-container-simple">
                <table className="simple-table">
                    <thead>
                        <tr>
                            <th>{t('package')}</th>
                            <th>{t('credits', { ns: 'dashboard' })}</th>
                            <th>{t('priceIRT')}</th>
                            <th>{t('pricePerCreditIRT')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {packages.map(pkg => (
                            <tr key={pkg.id}>
                                <td>{pkg.packname}</td>
                                <td>{pkg.packsize.toLocaleString('en-US')}</td>
                                <td>${pkg.packprice.toLocaleString('en-US')}</td>
                                <td>${(pkg.packprice / pkg.packsize).toFixed(3)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="form-actions" style={{marginTop: '1.5rem'}}>
                <button className="btn" onClick={onClose}>{t('close', {ns: 'common'})}</button>
            </div>
        </Modal>
    );
};

const BuyCreditsView = ({ apiKey, user, setView, orderToResume }: { apiKey: string, user: any, setView: (view: string, data?: any) => void, orderToResume?: any }) => {
    const { t, i18n } = useTranslation(['buyCredits', 'common', 'dashboard', 'orders']);
    const { config } = useConfiguration();
    const { addToast } = useToast();
    
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isPaying, setIsPaying] = useState(false);
    const [modalState, setModalState] = useState<{ isOpen: boolean, title: string, message: string } | null>(null);
    const [createdOrder, setCreatedOrder] = useState<any>(orderToResume || null);
    const [showPricing, setShowPricing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('online');

    const { data: accountData, loading: accountLoading } = useApi('/account/load', apiKey, {}, apiKey ? 1 : 0);

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const response = await sdk.request(readItems('packages', {
                    sort: ['packprice'], // Sort by price/size ascending for the slider
                    filter: { status: { _eq: 'published' } }
                }));
                setPackages(response as Package[]);
                // Default to a middle package if available, or the first one
                if (response && response.length > 0) {
                     // Try to set default to index 2 (usually 10k or similar) if it exists, else 0
                     setSelectedIndex(Math.min(2, response.length - 1));
                }
            } catch (error) {
                console.error("Failed to load packages", error);
                addToast(t('failedToLoadPackages'), 'error');
            } finally {
                setLoading(false);
            }
        };

        if (!orderToResume) {
            fetchPackages();
        } else {
            setLoading(false);
        }
    }, [orderToResume, addToast, t]);

    const selectedPackage = packages[selectedIndex];

    const handleCreateOrder = async () => {
        if (!selectedPackage || !user) return;
        setIsPaying(true);
        try {
            const orderData = {
                user_created: user.id,
                order_total: selectedPackage.packprice,
                order_note: selectedPackage.packname,
                order_status: 'pending',
                project_name: config?.app_name || 'MegaMail'
            };
            
            const newOrder = await sdk.request(createItem('orders', orderData));
            setCreatedOrder(newOrder);
        } catch (error: any) {
            console.error("Failed to create order", error);
            addToast(t('failedToCreateOrder'), 'error');
        } finally {
            setIsPaying(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (paymentMethod === 'offline') {
            if (createdOrder) {
                setView('OfflinePayment', { order: createdOrder });
            }
            return;
        }

        // Online Payment Logic
        if (!config?.app_backend) {
            setModalState({ isOpen: true, title: t('error', {ns: 'common'}), message: 'Application backend is not configured.' });
            return;
        }
        
        const orderId = createdOrder?.id;
        if (!orderId) return;

        setIsPaying(true);
        setModalState(null);

        try {
            const token = await sdk.getToken();
            const FLOW_TRIGGER_URL = `${config.app_backend}/flows/trigger/26e85c7e-1413-4583-ae6f-fc0a1dedebfc`;
            
            const response = await fetch(FLOW_TRIGGER_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    order_id: orderId,
                    callbackUrl: `${config?.app_url || window.location.origin}/#/callback`
                }),
            });

            const responseText = await response.text();
            let data: any = {};
            try {
                data = JSON.parse(responseText);
            } catch (e) { /* ignore */ }

            if (!response.ok) {
                 let errorMessage = `Payment initiation failed (Status ${response.status})`;
                 if (data.errors && data.errors[0]?.message) errorMessage = data.errors[0].message;
                 else if (data.message) errorMessage = data.message;
                 throw new Error(errorMessage);
            }
            
            // Robust trackId extraction
            let trackId = data.trackId || data.trackid || data.data?.trackId || data.data?.trackid;

            if (!trackId) {
                const transactions = data.transactions || data.data?.transactions;
                if (Array.isArray(transactions) && transactions.length > 0) {
                    const lastTransaction = transactions[transactions.length - 1];
                    if (lastTransaction && typeof lastTransaction === 'object') {
                        trackId = lastTransaction.trackId || lastTransaction.trackid;
                    } else if (lastTransaction && (typeof lastTransaction === 'number' || typeof lastTransaction === 'string')) {
                        try {
                             const transactionData = await sdk.request(readItem('transactions', lastTransaction));
                             if (transactionData) trackId = transactionData.trackId || transactionData.trackid;
                        } catch (fetchErr) { console.error(fetchErr); }
                    }
                }
            }

            // Fallback: Refetch order
            if (!trackId && orderId) {
                 try {
                     const orderWithTransactions = await sdk.request(readItem('orders', orderId, { fields: ['transactions.*'] }));
                     if (orderWithTransactions?.transactions?.length > 0) {
                          const lastTrx = orderWithTransactions.transactions[orderWithTransactions.transactions.length - 1];
                          trackId = lastTrx.trackId || lastTrx.trackid;
                     }
                 } catch (refetchErr) { console.error(refetchErr); }
            }

            if (!trackId) throw new Error("Invalid response from payment server: trackId missing.");

            window.location.href = `https://gateway.zibal.ir/start/${trackId}`;

        } catch (error: any) {
            console.error('Payment initiation error:', error);
            setModalState({
                isOpen: true,
                title: t('purchaseFailed'),
                message: error.message || t('unknownError', {ns: 'common'}),
            });
            setIsPaying(false);
        }
    };

    if (loading) return <CenteredMessage><Loader /></CenteredMessage>;

    // --- Order Placed / Payment Selection View ---
    if (createdOrder) {
        return (
            <div className="buy-credits-view">
                {modalState && (
                    <Modal isOpen={modalState.isOpen} onClose={() => setModalState(null)} title={modalState.title}>
                        <div style={{padding: '1rem'}}>
                            <p>{modalState.message}</p>
                            <div style={{marginTop: '1rem', textAlign: 'right'}}>
                                <Button onClick={() => setModalState(null)}>{t('close', {ns: 'common'})}</Button>
                            </div>
                        </div>
                    </Modal>
                )}
                
                <div className="order-success-card">
                     <div className="success-icon-wrapper">
                         <Icon>{ICONS.CHECK}</Icon>
                     </div>
                     <h2>{t('orderSuccessMessage')}</h2>
                     <p className="order-success-subtitle">{t('orderSuccessSubtitle')}</p>

                     <div className="order-details-box">
                         <div className="order-detail-row">
                             <span>{t('orderId')}</span>
                             <strong>#{createdOrder.id}</strong>
                         </div>
                         <div className="order-detail-row">
                             <span>{t('package')}</span>
                             <strong>{createdOrder.order_note}</strong>
                         </div>
                         <div className="order-detail-row total">
                             <span>{t('total')}</span>
                             <strong>${Number(createdOrder.order_total).toLocaleString('en-US')} USD</strong>
                         </div>
                     </div>

                     <div className="payment-method-section">
                         <label>{t('paymentMethod')}</label>
                         <select 
                            value={paymentMethod} 
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="payment-method-select"
                         >
                             <option value="online">{t('paymentMethodCard')}</option>
                             <option value="offline">{t('paymentMethodBank')}</option>
                         </select>
                     </div>

                     <Button 
                        className="btn-primary full-width pay-button" 
                        onClick={handleConfirmPayment} 
                        disabled={isPaying}
                     >
                        {isPaying ? <Loader /> : (paymentMethod === 'online' ? t('confirmAndPay') : t('submitBankInfo'))}
                     </Button>
                     
                     <button className="link-button cancel-order-link" onClick={() => { setCreatedOrder(null); if(orderToResume) setView('Account'); }}>
                         {t('buyDifferentPackage')}
                     </button>
                </div>
            </div>
        );
    }

    // --- Slider Selection View ---
    return (
        <div className="buy-credits-view">
             <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} packages={packages} />
             
             {/* Header Section */}
             <div className="buy-credits-header">
                 <div className="header-buttons">
                     <button className="header-btn" onClick={() => { sessionStorage.setItem('account-tab', 'orders'); setView('Account'); }}>
                         <Icon>{ICONS.BOX}</Icon> {t('viewHistory')}
                     </button>
                     <button className="header-btn" onClick={() => setShowPricing(true)}>
                         <Icon>{ICONS.PRICE_TAG}</Icon> {t('pricingAndFees')}
                     </button>
                 </div>
                 
                 <div className="balance-card">
                     <div className="balance-info">
                        <span className="balance-label">{t('yourCurrentBalance')}</span>
                        <div className="balance-amount">
                             {accountLoading ? <Loader /> : (
                                 <>
                                     <span className="amount-value">{Number(accountData?.emailcredits ?? 0).toLocaleString(i18n.language)}</span>
                                     <Icon>{ICONS.BUY_CREDITS}</Icon>
                                 </>
                             )}
                        </div>
                     </div>
                 </div>
             </div>

             <h3 className="section-title">{t('choosePackage')}</h3>

             {/* Slider Card */}
             {selectedPackage && (
                 <div className="slider-card">
                     <div className="slider-display">
                         <div className="slider-value">
                             {selectedPackage.packsize.toLocaleString(i18n.language)}
                             <span className="slider-unit">{t('credits', {ns: 'dashboard'})}</span>
                         </div>
                         <div className="slider-price">
                             ${selectedPackage.packprice.toLocaleString('en-US')} USD
                         </div>
                     </div>

                     <div className="slider-container">
                         <input 
                            type="range" 
                            min="0" 
                            max={packages.length - 1} 
                            step="1" 
                            value={selectedIndex}
                            onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
                            className="package-slider"
                         />
                         <div className="slider-labels">
                             {packages.map((pkg, idx) => (
                                 <span 
                                    key={pkg.id} 
                                    className={`slider-label ${idx === selectedIndex ? 'active' : ''}`}
                                    onClick={() => setSelectedIndex(idx)}
                                 >
                                     {/* Show only some labels on mobile if needed, or simplifed format like 2k */}
                                     {pkg.packsize >= 1000 ? `${pkg.packsize/1000}k` : pkg.packsize}
                                 </span>
                             ))}
                         </div>
                     </div>
                     
                     <div className="slider-footer">
                         <div className="price-per-credit">
                             <span>{t('pricePerCreditIRT')}:</span>
                             <strong>${(selectedPackage.packprice / selectedPackage.packsize).toFixed(3)}</strong>
                         </div>
                         <Button className="btn-primary order-button" onClick={handleCreateOrder} disabled={isPaying}>
                            {isPaying ? <Loader /> : t('order')}
                         </Button>
                     </div>
                 </div>
             )}
        </div>
    );
};

export default BuyCreditsView;