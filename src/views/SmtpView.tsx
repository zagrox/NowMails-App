
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Icon, { ICONS } from '../components/Icon';
import { useToast } from '../contexts/ToastContext';
import { apiFetch } from '../api/elasticEmail';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { formatDateRelative } from '../utils/helpers';
import Button from '../components/Button';
import { AppActions } from '../config/actions';
import useApi from './useApi';

const AddSmtpCredentialModal = ({ isOpen, onClose, apiKey, onSuccess }: { isOpen: boolean, onClose: () => void, apiKey: string, onSuccess: (newKeyData: any) => void }) => {
    const { t } = useTranslation(['smtp', 'common']);
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            addToast(t('credentialNameEmptyError'), 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const newKeyData = await apiFetch('/accesstoken/add', apiKey, {
                method: 'POST',
                params: {
                    tokenName: name,
                    accessLevel: '144115188075855872' // Use ModifyAccessTokens
                }
            });
            addToast(t('credentialCreatedSuccess', { name }), 'success');
            onSuccess({ apikey: newKeyData, name: name });
        } catch (err: any) {
            addToast(t('credentialCreateError') + `: ${err.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('addSmtpCredentialTitle')}>
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                    <label htmlFor="credential-name">{t('credentialName')}</label>
                    <input id="credential-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('credentialNamePlaceholder')} required />
                    <p style={{ fontSize: '0.8rem', color: 'var(--subtle-text-color)', marginTop: '0.5rem' }}>{t('credentialNameSubtitle')}</p>
                </div>
                <div className="form-actions">
                    <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>{t('cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? <Loader /> : t('createCredential')}</button>
                </div>
            </form>
        </Modal>
    );
};

const NewApiKeyModal = ({ isOpen, onClose, newKeyData }: { isOpen: boolean, onClose: () => void, newKeyData: any }) => {
    const { t } = useTranslation(['smtp', 'common']);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('credentialCreatedSuccessTitle')}>
            <div className="new-api-key-display">
                <div className="info-message warning">{t('copyApiKeyNotice')}</div>
                <div className="form-group">
                    <label>{t('credentialName')}</label>
                    <input type="text" value={newKeyData?.name} readOnly />
                </div>
                <div className="form-group">
                    <label>{t('apiKeyPassword')}</label>
                    <input type="text" value={newKeyData?.apikey} readOnly />
                </div>
                <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-primary" onClick={onClose}>{t('done')}</button>
                </div>
            </div>
        </Modal>
    );
};

const SmtpView = ({ apiKey, user }: { apiKey: string, user: any }) => {
    const { t, i18n } = useTranslation(['smtp', 'common']);
    const { addToast } = useToast();
    const [refetchIndex, setRefetchIndex] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newKeyData, setNewKeyData] = useState<any | null>(null);
    const [keyToDelete, setKeyToDelete] = useState<any | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);

    const { data: mainCreds, loading: mainLoading, error: mainError } = useApi('/account/load', apiKey, {}, refetchIndex);
    const { data: additionalCreds, loading: additionalLoading, error: additionalError } = useApi(user?.isApiKeyUser ? '' : '/accesstoken/list', apiKey, {}, refetchIndex);
    
    const smtpCreds = useMemo(() => {
        if (!additionalCreds || !Array.isArray(additionalCreds)) {
            return [];
        }
        return additionalCreds.filter(cred => cred.AccessLevel?.includes('Smtp') || cred.AccessLevel?.includes('ModifyAccessTokens'));
    }, [additionalCreds]);

    const refetch = () => setRefetchIndex(i => i + 1);

    const handleAddSuccess = (data: any) => {
        setIsAddModalOpen(false);
        setNewKeyData(data);
    };

    const handleNewKeyModalClose = () => {
        setNewKeyData(null);
        refetch();
    };

    const confirmDelete = async () => {
        if (!keyToDelete) return;
        try {
            await apiFetch('/accesstoken/delete', apiKey, {
                method: 'POST',
                params: {
                    tokenName: keyToDelete.Name
                }
            });
            addToast(t('credentialDeletedSuccess', { name: keyToDelete.Name }), 'success');
            refetch();
        } catch (err: any) {
            addToast(t('credentialDeletedError', { error: err.message }), 'error');
        } finally {
            setKeyToDelete(null);
        }
    };

    return (
        <div>
            <AddSmtpCredentialModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} apiKey={apiKey} onSuccess={handleAddSuccess} />
            {newKeyData && <NewApiKeyModal isOpen={!!newKeyData} onClose={handleNewKeyModalClose} newKeyData={newKeyData} />}
            {keyToDelete && (
                <ConfirmModal isOpen={!!keyToDelete} onClose={() => setKeyToDelete(null)} onConfirm={confirmDelete} title={t('delete')}>
                    <p>{t('confirmDeleteCredential', { name: keyToDelete.Name })}</p>
                </ConfirmModal>
            )}

            <div className="card main-credential-card">
                <div className="card-header"><h3>{t('mainAccountCredentials')}</h3></div>
                <div className="card-body">
                    {mainLoading && <CenteredMessage><Loader /></CenteredMessage>}
                    {mainError && <ErrorMessage error={mainError} />}
                    {mainCreds && (
                        <div className="smtp-card-body">
                            <div className="smtp-detail-item"><label>{t('server')}</label><strong>{isRevealed ? 'smtp.mailzila.com' : '•••••••••••••••••'}</strong></div>
                            <div className="smtp-detail-item"><label>{t('ports')}</label><strong>{isRevealed ? '25, 2525, 587, 465' : '•••••••••••••'}</strong></div>
                            <div className="smtp-detail-item"><label>{t('username')}</label><strong className="monospace">{mainCreds.email}</strong></div>
                            <div className="smtp-detail-item full-span">
                                <label>{t('passwordMainApiKey')}</label>
                                <input type={isRevealed ? 'text' : 'password'} value={isRevealed ? apiKey : '••••••••••••••••••••••••••••••••••••••••'} readOnly />
                            </div>
                        </div>
                    )}
                </div>
                 <div className="form-actions" style={{ backgroundColor: 'var(--subtle-background)', justifyContent: 'flex-end' }}>
                    <Button
                        className="btn-secondary"
                        onClick={() => setIsRevealed(!isRevealed)}
                        action={AppActions.REVEAL_SMTP_ACCESS}
                    >
                        <Icon>{isRevealed ? ICONS.EYE_OFF : ICONS.EYE}</Icon>
                        <span>{isRevealed ? t('hideSmtp') : t('revealSmtp')}</span>
                    </Button>
                </div>
            </div>

            <div className="dashboard-section">
                <div className="view-header">
                    <h3>{t('additionalCredentials')}</h3>
                    {!user?.isApiKeyUser && (
                        <div className="header-actions">
                            <Button className="btn-primary" onClick={() => setIsAddModalOpen(true)} action="add_smtp_credential">
                                <Icon>{ICONS.PLUS}</Icon> {t('addCredential')}
                            </Button>
                        </div>
                    )}
                </div>
                
                {user?.isApiKeyUser ? (
                    <CenteredMessage><div className="info-message">{t('smtpFeatureNotAvailable')}</div></CenteredMessage>
                ) : additionalLoading ? (
                    <CenteredMessage><Loader /></CenteredMessage>
                ) : additionalError ? (
                    <ErrorMessage error={additionalError} />
                ) : !smtpCreds || smtpCreds.length === 0 ? (
                    <CenteredMessage>{t('noAdditionalCredentials')}</CenteredMessage>
                ) : (
                    <div className="card-grid smtp-additional-grid">
                        {smtpCreds.map((cred: any) => (
                            <div key={cred.Name} className="card smtp-additional-card">
                                <div className="card-header">
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <h4>{cred.Name}</h4>
                                        <button className="btn-icon btn-icon-danger" onClick={() => setKeyToDelete(cred)}><Icon>{ICONS.DELETE}</Icon></button>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="smtp-additional-detail"><label>{t('accessLevel')}</label> <strong>{cred.AccessLevel}</strong></div>
                                    <div className="smtp-additional-detail"><label>{t('lastUsed')}</label> <strong>{formatDateRelative(cred.LastUse, i18n.language) || 'Never'}</strong></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmtpView;
