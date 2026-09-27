

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Loader from './Loader';
import Button from './Button';

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onLeave: () => void;
    onSaveAndLeave: () => Promise<void>;
    zIndex?: number;
}

const UnsavedChangesModal = ({
    isOpen,
    onCancel,
    onLeave,
    onSaveAndLeave,
    zIndex,
}: UnsavedChangesModalProps) => {
    const { t } = useTranslation('emailBuilder');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveAndLeave();
        setIsSaving(false);
    };

    return (
        <div className="unsaved-changes-modal">
            <Modal
                isOpen={isOpen}
                onClose={onCancel}
                title={t('unsavedChangesTitle')}
                zIndex={zIndex}
            >
                <div className="modal-form">
                    <p style={{ marginBottom: '1rem', textAlign: 'center', lineHeight: 1.6 }}>{t('unsavedChangesMessage')}</p>
                    <div className="form-actions">
                        <Button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader /> : t('saveAndClose')}
                        </Button>
                        <Button type="button" className="btn-danger" onClick={onLeave}>
                            {t('leave')}
                        </Button>
                        <Button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>
                            {t('cancel', { ns: 'common' })}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UnsavedChangesModal;