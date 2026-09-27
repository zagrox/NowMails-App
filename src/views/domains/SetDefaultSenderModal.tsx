
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../components/Modal';
import Loader from '../../components/Loader';
import { apiFetchV4 } from '../../api/elasticEmail';
import { useToast } from '../../contexts/ToastContext';

const SetDefaultSenderModal = ({ isOpen, onClose, domain, apiKey, onSuccess }: { isOpen: boolean; onClose: () => void; domain: any; apiKey: string; onSuccess: () => void; }) => {
    const { t } = useTranslation(['domains', 'common', 'auth']);
    const [localPart, setLocalPart] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const defaultSender = domain?.DefaultSender || domain?.defaultsender;
        if (defaultSender) {
            setLocalPart(defaultSender.split('@')[0]);
        } else {
            setLocalPart(''); // Default value
        }
    }, [domain]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const fullEmail = `${localPart}@${domain.Domain}`;
        try {
            await apiFetchV4(`/domains/${encodeURIComponent(domain.Domain)}`, apiKey, {
                method: 'PUT',
                body: { DefaultSender: fullEmail }
            });

            addToast('Default sender updated successfully!', 'success');
            onSuccess();
        } catch (err: any) {
            addToast(`Failed to update: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!domain) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('defaultSenderTitle')}>
            <form onSubmit={handleSubmit} className="modal-form">
                <p>{t('defaultSenderDescription')}</p>
                <div className="form-group">
                    <label htmlFor="email-local-part">{t('emailAddress', { ns: 'auth' })}</label>
                    <div className="from-email-composer">
                        <input
                            id="email-local-part"
                            type="text"
                            value={localPart}
                            onChange={e => setLocalPart(e.target.value.trim())}
                            required
                        />
                        <span className="from-email-at">@{domain.Domain}</span>
                    </div>
                </div>
                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="btn" onClick={onClose} disabled={isSaving}>{t('cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving || !localPart}>
                        {isSaving ? <Loader /> : t('saveChanges')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default SetDefaultSenderModal;
