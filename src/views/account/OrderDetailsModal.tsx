
import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../components/Modal';
import { formatDateForDisplay } from '../../utils/helpers';
import Badge from '../../components/Badge';
import Icon, { ICONS } from '../../components/Icon';
import { useOrderStatuses } from '../../hooks/useOrderStatuses';
import { useStatusStyles } from '../../hooks/useStatusStyles';

interface OrderDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onContinueOrder?: (order: any) => void;
    onGoToOfflineForm?: (order: any) => void;
    onViewInvoice?: (order: any) => void;
    onCreateNewOrder?: () => void;
}

const OrderDetailsModal = ({ isOpen, onClose, order, onContinueOrder, onGoToOfflineForm, onViewInvoice, onCreateNewOrder }: OrderDetailsModalProps) => {
    const { t, i18n } = useTranslation(['orders', 'buyCredits', 'common']);
    const { statusesMap, loading: statusesLoading } = useOrderStatuses();
    const { getStatusStyle } = useStatusStyles();
    
    const valueCellStyle: React.CSSProperties = { textAlign: i18n.dir() === 'rtl' ? 'left' : 'right' };

    const showContinueButton = order.order_status === 'pending';
    const showNewOrderButton = order.order_status === 'failed';
    const showInvoiceButton = order.order_status === 'completed';

    const handleContinuePayment = () => {
        if (onContinueOrder) {
            onContinueOrder(order);
        }
    };

    const handleCreateNewOrderClick = () => {
        if (onCreateNewOrder) {
            onCreateNewOrder();
        }
    };

    const orderStatus = order.order_status;
    const statusInfo = !statusesLoading ? statusesMap[orderStatus] : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('orderDetails')}`}>
            <>
                <div className="table-container-simple" style={{ marginBottom: '1.5rem' }}>
                    <table className="simple-table">
                        <tbody>
                            <tr><td>{t('orderId')}</td><td style={valueCellStyle}><strong>#{order.id}</strong></td></tr>
                            <tr><td>{t('date')}</td><td style={valueCellStyle}>{formatDateForDisplay(order.date_created, i18n.language)}</td></tr>
                            <tr><td>{t('description')}</td><td style={valueCellStyle}>{order.order_note}</td></tr>
                            <tr><td>{t('totalAmount')}</td><td style={valueCellStyle}><strong>${order.order_total.toLocaleString('en-US')} USD</strong></td></tr>
                            <tr>
                                <td>{t('status')}</td>
                                <td style={valueCellStyle}>
                                    {statusInfo ? (
                                        <Badge text={statusInfo.text} color={statusInfo.color} iconPath={statusInfo.iconPath} />
                                    ) : (
                                        (() => {
                                            const fallbackStyle = getStatusStyle(orderStatus);
                                            return <Badge text={fallbackStyle.text} type={fallbackStyle.type} iconPath={fallbackStyle.iconPath} />;
                                        })()
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="form-actions" style={{ justifyContent: 'space-between', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', marginTop: '1.5rem' }}>
                    <button className="btn" onClick={onClose}>{t('close')}</button>
                    
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {order.order_status === 'processing' && onGoToOfflineForm && (
                            <button className="btn btn-primary" onClick={() => onGoToOfflineForm(order)}>
                                <Icon>{ICONS.PENCIL}</Icon>
                                <span>{t('submitBankInfo', { ns: 'buyCredits' })}</span>
                            </button>
                        )}

                        {showContinueButton && onContinueOrder && (
                            <button className="btn btn-primary" onClick={handleContinuePayment}>
                                <Icon>{ICONS.LOCK_OPEN}</Icon>
                                <span>{t('continueOrder')}</span>
                            </button>
                        )}

                        {showNewOrderButton && onCreateNewOrder && (
                            <button className="btn btn-primary" onClick={handleCreateNewOrderClick}>
                                <Icon>{ICONS.PLUS}</Icon>
                                <span>{t('newOrder', { ns: 'orders' })}</span>
                            </button>
                        )}
                        
                        {showInvoiceButton && onViewInvoice && (
                            <button className="btn btn-primary" onClick={() => onViewInvoice(order)}>
                                <Icon>{ICONS.FILE_TEXT}</Icon>
                                <span>{t('viewInvoice')}</span>
                            </button>
                        )}
                    </div>
                </div>
            </>
        </Modal>
    );
};

export default OrderDetailsModal;
