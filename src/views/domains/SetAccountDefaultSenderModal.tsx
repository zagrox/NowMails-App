
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../components/Modal';
import Loader from '../../components/Loader';
import { apiFetch } from '../../api/elasticEmail';
import { useToast } from '../../contexts/ToastContext';

const SetAccountDefaultSenderModal = ({ isOpen, onClose, apiKey, onSuccess }: { isOpen: boolean; onClose: () => void; apiKey: string; onSuccess: () => void; }) => {
    const { t } = useTranslation(['domains', 'common', 'auth']);
    const [email, setEmail] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        
        setIsSaving(true);
        try {
            await apiFetch('/domain/setdefault', apiKey, {
                method: 'POST',
                params: { email }
            });
            addToast(t('defaultSenderSetSuccess', { email }), 'success');
            onSuccess();
        } catch (err: any) {
            addToast(t('defaultSenderSetError', { error: err.message }), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('updateDefaultSender')}>
            <form onSubmit={handleSubmit} className="modal-form">
                <p>{t('updateDefaultSenderDesc')}</p>
                <div className="form-group">
                    <label htmlFor="default-sender-email">{t('emailAddress', { ns: 'auth' })}</label>
                    <input
                        id="default-sender-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder="sender@your-verified-domain.com"
                    />
                </div>
                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="btn" onClick={onClose} disabled={isSaving}>{t('cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving || !email}>
                        {isSaving ? <Loader /> : t('saveChanges')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default SetAccountDefaultSenderModal;