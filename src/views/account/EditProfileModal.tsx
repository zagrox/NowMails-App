import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';
import Loader from '../../components/Loader';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/helpers';

// NOTE: The user's request is to fix the non-working Edit Profile modal.
// This implementation replaces the placeholder content.
export const EditProfileModal = ({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: any }) => {
    const { t } = useTranslation(['account', 'common', 'auth', 'onboarding']);
    const { updateUser } = useAuth();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        type: 'personal',
        company: '',
        website: '',
        mobile: ''
    });

    useEffect(() => {
        if (user && isOpen) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                type: user.type || 'personal',
                company: user.company || '',
                website: user.website || '',
                mobile: user.mobile || ''
            });
        }
    }, [user, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTypeChange = (type: 'personal' | 'business') => {
        setFormData(prev => ({ ...prev, type }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateUser(formData);
            addToast(t('profileUpdateSuccess'), 'success');
            onClose();
        } catch (err: any) {
            const errorMessage = getErrorMessage(err);
            addToast(t('profileUpdateError', { error: errorMessage }), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        // FIX: Explicitly pass children to Modal component
        <Modal isOpen={isOpen} onClose={onClose} title={t('editProfile')}>
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="first_name">{t('firstName', { ns: 'auth' })}</label>
                        <input id="first_name" name="first_name" type="text" value={formData.first_name} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="last_name">{t('lastName', { ns: 'auth' })}</label>
                        <input id="last_name" name="last_name" type="text" value={formData.last_name} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-group">
                    <label>{t('accountType', { ns: 'onboarding' })}</label>
                    <div className="segmented-control" style={{width: '100%'}}>
                        <button type="button" onClick={() => handleTypeChange('personal')} className={formData.type === 'personal' ? 'active' : ''}>{t('personal', { ns: 'onboarding' })}</button>
                        <button type="button" onClick={() => handleTypeChange('business')} className={formData.type === 'business' ? 'active' : ''}>{t('business', { ns: 'onboarding' })}</button>
                    </div>
                </div>
                
                {formData.type === 'business' && (
                    <div className="form-group">
                        <label htmlFor="company">{t('company')}</label>
                        <input id="company" name="company" type="text" value={formData.company} onChange={handleChange} />
                    </div>
                )}
                
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="website">{t('website')}</label>
                        <input id="website" name="website" type="url" value={formData.website} onChange={handleChange} placeholder="https://example.com" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="mobile">{t('mobile')}</label>
                        <input id="mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="btn" onClick={onClose} disabled={isSaving}>{t('cancel', { ns: 'common' })}</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? <Loader /> : t('saveChanges', { ns: 'common' })}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditProfileModal;
