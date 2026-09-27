
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Loader from './Loader';
import Icon, { ICONS } from './Icon';

interface AddContactToListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (emails: string[]) => Promise<void>;
    listName: string;
}

const AddContactToListModal = ({ isOpen, onClose, onSubmit, listName }: AddContactToListModalProps) => {
    const { t } = useTranslation(['contacts', 'common']);
    const [emails, setEmails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const emailArray = emails
            .split(/[\s,;\n]+/)
            .map(email => email.trim())
            .filter(email => email.length > 0 && email.includes('@'));
        
        if (emailArray.length === 0) return;

        setIsSubmitting(true);
        try {
            await onSubmit(emailArray);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setEmails('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('addContactsToListTitle', { listName })}
        >
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                    <label htmlFor="emails-input">{t('emailAddressesLabel')}</label>
                    <textarea
                        id="emails-input"
                        value={emails}
                        onChange={e => setEmails(e.target.value)}
                        rows={5}
                        placeholder={t('emailsPlaceholder')}
                        disabled={isSubmitting}
                    />
                    <p style={{ fontSize: '0.8rem', color: 'var(--subtle-text-color)', marginTop: '0.5rem' }}>
                        {t('emailsHelpText')}
                    </p>
                </div>
                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>
                        {t('cancel', { ns: 'common' })}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting || !emails.trim()}>
                        {isSubmitting ? <Loader /> : <><Icon>{ICONS.USER_PLUS}</Icon><span>{t('addContact')}</span></>}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddContactToListModal;
