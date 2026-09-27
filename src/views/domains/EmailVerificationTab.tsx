
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../../hooks/useApiV4';
import { apiFetchV4, apiFetch } from '../../api/elasticEmail';
import CenteredMessage from '../../components/CenteredMessage';
import Loader from '../../components/Loader';
import ErrorMessage from '../../components/ErrorMessage';
import { useToast } from '../../contexts/ToastContext';
import Icon, { ICONS } from '../../components/Icon';
import Badge from '../../components/Badge';
import ConfirmModal from '../../components/ConfirmModal';
import { useStatusStyles } from '../../hooks/useStatusStyles';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import useApi from '../useApi';

const EmailVerificationTab = ({ apiKey }: { apiKey: string }) => {
    const { t } = useTranslation(['domains', 'common']);
    const { addToast } = useToast();
    const [refetchIndex, setRefetchIndex] = useState(0);
    const [newSenderEmail, setNewSenderEmail] = useState('');
    const [newSenderName, setNewSenderName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processingEmail, setProcessingEmail] = useState<string | null>(null);
    const [senderToDelete, setSenderToDelete] = useState<string | null>(null);
    const { getStatusStyle } = useStatusStyles();

    const { data: senders, loading, error, refetch } = useApiV4('/senders', apiKey, { limit: 1000 }, refetchIndex);
    const { data: accountData, refetch: refetchAccount } = useApi('/account/load', apiKey, {}, refetchIndex);

    const handleAddSender = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiFetchV4('/senders', apiKey, {
                method: 'POST',
                body: { Email: newSenderEmail, Name: newSenderName || null }
            });
            addToast(t('senderAddedSuccess', { email: newSenderEmail }), 'success');
            setNewSenderEmail('');
            setNewSenderName('');
            refetch();
        } catch (err: any) {
            addToast(t('senderAddedError', { error: err.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSender = async () => {
        if (!senderToDelete) return;
        setProcessingEmail(senderToDelete);
        try {
            await apiFetchV4(`/senders/${encodeURIComponent(senderToDelete)}`, apiKey, { method: 'DELETE' });
            addToast(t('senderDeletedSuccess', { email: senderToDelete }), 'success');
            refetch();
        } catch (err: any) {
            addToast(t('senderDeletedError', { error: err.message }), 'error');
        } finally {
            setProcessingEmail(null);
            setSenderToDelete(null);
        }
    };

    const handleSetAsDefault = async (email: string) => {
        setProcessingEmail(email);
        try {
            await apiFetch('/domain/setdefault', apiKey, {
                method: 'POST',
                params: { email }
            });
            addToast(t('defaultSenderSetSuccess', { email }), 'success');
            refetchAccount();
        } catch (err: any) {
            addToast(t('defaultSenderSetError', { error: err.message }), 'error');
        } finally {
            setProcessingEmail(null);
        }
    };
    
    const sendersList = Array.isArray(senders) ? senders : [];

    return (
        <div className="domains-view-container">
            <ConfirmModal
                isOpen={!!senderToDelete}
                onClose={() => setSenderToDelete(null)}
                onConfirm={handleDeleteSender}
                title={t('deleteSender')}
                isDestructive
            >
                <p>{t('confirmDeleteSender', { email: senderToDelete })}</p>
            </ConfirmModal>

            <div className="card">
                <div className="card-header">
                    <h3>{t('addSender')}</h3>
                </div>
                <form onSubmit={handleAddSender}>
                    <div className="card-body">
                        <p style={{marginTop: 0}}>{t('addSenderDesc')}</p>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="sender-email">{t('senderEmail')}</label>
                                <input id="sender-email" type="email" value={newSenderEmail} onChange={e => setNewSenderEmail(e.target.value)} required />
                            </div>
                             <div className="form-group">
                                <label htmlFor="sender-name">{t('senderName')}</label>
                                <input id="sender-name" type="text" value={newSenderName} onChange={e => setNewSenderName(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="form-actions" style={{ backgroundColor: 'var(--subtle-background)' }}>
                        <Button type="submit" className="btn-primary" disabled={isSubmitting || !newSenderEmail}>
                            {isSubmitting ? <Loader /> : t('addSender')}
                        </Button>
                    </div>
                </form>
            </div>

            <h3 style={{marginTop: '1.5rem'}}>{t('verifiedSenders')}</h3>

            {loading && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}
            
            {!loading && !error && sendersList.length === 0 && (
                <EmptyState
                    icon={ICONS.MAIL}
                    title={t('noSenders')}
                    message={t('noSendersDesc')}
                />
            )}

            {!loading && !error && sendersList.length > 0 && (
                <div className="table-container">
                    <table className="simple-table">
                        <thead>
                            <tr>
                                <th>{t('senderEmail')}</th>
                                <th>{t('senderName')}</th>
                                <th>{t('status')}</th>
                                <th style={{ textAlign: 'right' }}>{t('action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sendersList.map((sender: any) => {
                                const isVerified = sender.Status === 'Verified';
                                const isDefault = accountData?.defaultsender === sender.Email;
                                const isProcessing = processingEmail === sender.Email;
                                return (
                                    <tr key={sender.Email}>
                                        <td>
                                            <strong>{sender.Email}</strong>
                                            {isDefault && <Badge text="Default" type="info" />}
                                        </td>
                                        <td>{sender.Name || '-'}</td>
                                        <td>
                                            <Badge 
                                                text={isVerified ? t('verified') : t('pendingVerification')} 
                                                type={isVerified ? 'success' : 'warning'} 
                                            />
                                        </td>
                                        <td>
                                            <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                                                {isProcessing ? <Loader /> : (
                                                    <>
                                                        {isVerified && !isDefault && (
                                                            <Button className="btn-secondary" onClick={() => handleSetAsDefault(sender.Email)}>
                                                                {t('setAsDefault')}
                                                            </Button>
                                                        )}
                                                        <Button className="btn-icon-danger" onClick={() => setSenderToDelete(sender.Email)}>
                                                            <Icon>{ICONS.DELETE}</Icon>
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EmailVerificationTab;