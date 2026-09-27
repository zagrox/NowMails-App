
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { apiFetchV4 } from '../api/elasticEmail';
import { useToast } from '../contexts/ToastContext';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Icon, { ICONS } from '../components/Icon';
import Badge from '../components/Badge';
import { useStatusStyles } from '../hooks/useStatusStyles';
import { formatDateForDisplay } from '../utils/helpers';
import Modal from '../components/Modal';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';

const DetailItem: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value }) => (
    (value || value === 0) ? (
        <>
            <dt>{label}</dt>
            <dd>{value}</dd>
        </>
    ) : null
);

const EditContactModal = ({ isOpen, onClose, contact, apiKey, onSaveSuccess }: { isOpen: boolean, onClose: () => void, contact: any, apiKey: string, onSaveSuccess: () => void }) => {
    const { t } = useTranslation(['contacts', 'common', 'auth']);
    const { addToast } = useToast();
    const [formData, setFormData] = useState({ FirstName: '', LastName: '', CustomFields: {} as Record<string, any> });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (contact) {
            setFormData({
                FirstName: contact.FirstName || '',
                LastName: contact.LastName || '',
                CustomFields: { ...(contact.CustomFields || {}) }
            });
        }
    }, [contact, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCustomFieldChange = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            CustomFields: {
                ...prev.CustomFields,
                [key]: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Construct the payload, ensuring CustomFields is included even if empty,
            // as the API might expect it to clear fields.
            const payload = {
                FirstName: formData.FirstName,
                LastName: formData.LastName,
                CustomFields: formData.CustomFields
            };
            
            await apiFetchV4(`/contacts/${encodeURIComponent(contact.Email)}`, apiKey, {
                method: 'PUT',
                body: payload
            });
            addToast(t('contactUpdateSuccess'), 'success');
            onSaveSuccess();
            onClose();
        } catch (err: any) {
            addToast(t('contactUpdateError', { error: err.message }), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!contact) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('editContactDetails')}>
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="FirstName">{t('firstName', { ns: 'auth' })}</label>
                        <input id="FirstName" name="FirstName" type="text" value={formData.FirstName} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="LastName">{t('lastName', { ns: 'auth' })}</label>
                        <input id="LastName" name="LastName" type="text" value={formData.LastName} onChange={handleInputChange} />
                    </div>
                </div>
                {Object.keys(formData.CustomFields).length > 0 && (
                    <div className="form-group" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <h4 style={{ marginBottom: '1rem' }}>{t('customFields')}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {Object.entries(formData.CustomFields).map(([key, value]) => (
                                <div className="form-group" key={key}>
                                    <label htmlFor={`custom-${key}`}>{key}</label>
                                    <input id={`custom-${key}`} type="text" value={String(value)} onChange={(e) => handleCustomFieldChange(key, e.target.value)} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="form-actions" style={{ marginTop: '1rem' }}>
                    <Button type="button" className="btn" onClick={onClose} disabled={isSaving}>{t('cancel', { ns: 'common' })}</Button>
                    <Button type="submit" className="btn-primary" disabled={isSaving}>
                        {isSaving ? <Loader /> : t('saveChanges', { ns: 'common' })}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};


const ContactDetailView = ({ apiKey, contactEmail, onBack }: {
    apiKey: string;
    contactEmail: string;
    onBack: () => void;
}) => {
    const { t, i18n } = useTranslation(['contacts', 'common']);
    const { getStatusStyle } = useStatusStyles();
    const { addToast } = useToast();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const { data: contact, loading, error, refetch } = useApiV4(
        contactEmail ? `/contacts/${encodeURIComponent(contactEmail)}` : '',
        apiKey
    );

    const handleDeleteContact = async () => {
        if (!contact) return;
        try {
            await apiFetchV4(`/contacts/${encodeURIComponent(contact.Email)}`, apiKey, { method: 'DELETE' });
            addToast(t('contactDeletedSuccess', { email: contact.Email }), 'success');
            onBack();
        } catch (err: any) {
            addToast(t('contactDeletedError', { error: err.message }), 'error');
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    if (!contactEmail) {
        return (
            <CenteredMessage>
                <div className="info-message warning">
                    <p>{t('noContactSelected')}</p>
                </div>
            </CenteredMessage>
        );
    }

    const statusStyle = contact ? getStatusStyle(contact.Status) : getStatusStyle('unknown');
    
    const fName = contact?.FirstName || (contact as any)?.firstname;
    const lName = contact?.LastName || (contact as any)?.lastname;
    const fullName = [fName, lName].filter(Boolean).join(' ');

    return (
        <div>
            {contact && (
                <>
                    <EditContactModal 
                        isOpen={isEditModalOpen} 
                        onClose={() => setIsEditModalOpen(false)}
                        contact={contact}
                        apiKey={apiKey}
                        onSaveSuccess={refetch}
                    />
                    <ConfirmModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => setIsDeleteModalOpen(false)}
                        onConfirm={handleDeleteContact}
                        title={t('deleteContact')}
                        isDestructive
                    >
                        <p>{t('confirmDeleteContact', { email: contact?.Email })}</p>
                    </ConfirmModal>
                </>
            )}
            <div className="view-header" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={onBack} style={{ marginLeft: 'auto' }}>
                    {i18n.dir() === 'rtl' ? (
                        <>
                            <span>{t('back', { ns: 'common' })}</span>
                            <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                        </>
                    ) : (
                        <>
                            <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                            <span>{t('back', { ns: 'common' })}</span>
                        </>
                    )}
                </button>
                <div className="header-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    {contact && (
                        <>
                            <Button className="btn-primary" onClick={() => setIsEditModalOpen(true)}>
                                <Icon>{ICONS.PENCIL}</Icon>
                                <span>{t('edit', { ns: 'common' })}</span>
                            </Button>
                            <Button className="btn-danger" onClick={() => setIsDeleteModalOpen(true)}>
                                <Icon>{ICONS.DELETE}</Icon>
                                <span>{t('delete', { ns: 'common' })}</span>
                            </Button>
                            
                        </>
                    )}
                </div>
            </div>
            {loading && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}
            {contact && (
                <div className="account-tab-content">
                    <div className="profile-hero">
                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexGrow: 1 }}>
                            <div className="profile-avatar">
                                <Icon>{ICONS.ACCOUNT}</Icon>
                            </div>
                            <div className="profile-info">
                                <h3>{fullName || contact.Email}</h3>
                                <p className="profile-email">{contact.Email}</p>
                                <div className="profile-meta">
                                    <Badge text={statusStyle.text} type={statusStyle.type} iconPath={statusStyle.iconPath} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-grid contact-detail-grid">
                        <div className="account-tab-card">
                            <div className="account-tab-card-header"><h3>{t('contactDetails')}</h3></div>
                            <div className="account-tab-card-body">
                                <dl className="contact-details-grid">
                                    <DetailItem label={t('firstName')} value={fName} />
                                    <DetailItem label={t('lastName')} value={lName} />
                                    <DetailItem label={t('source')} value={contact.Source} />
                                    <DetailItem label={t('dateAdded')} value={formatDateForDisplay(contact.DateAdded, i18n.language)} />
                                    <DetailItem label={t('dateUpdated')} value={formatDateForDisplay(contact.DateUpdated, i18n.language)} />
                                    <DetailItem label={t('statusChangeDate')} value={formatDateForDisplay(contact.StatusChangeDate, i18n.language)} />
                                </dl>
                            </div>
                        </div>

                        <div className="account-tab-card">
                            <div className="account-tab-card-header"><h3>{t('activity')}</h3></div>
                            <div className="account-tab-card-body">
                                <dl className="contact-details-grid">
                                    <DetailItem label={t('totalSent')} value={contact.Activity?.TotalSent?.toLocaleString(i18n.language)} />
                                    <DetailItem label={t('totalOpened')} value={contact.Activity?.TotalOpened?.toLocaleString(i18n.language)} />
                                    <DetailItem label={t('totalClicked')} value={contact.Activity?.TotalClicked?.toLocaleString(i18n.language)} />
                                    <DetailItem label={t('totalFailed')} value={contact.Activity?.TotalFailed?.toLocaleString(i18n.language)} />
                                    <DetailItem label={t('lastSent')} value={formatDateForDisplay(contact.Activity?.LastSent, i18n.language)} />
                                    <DetailItem label={t('lastOpened')} value={formatDateForDisplay(contact.Activity?.LastOpened, i18n.language)} />
                                    <DetailItem label={t('lastClicked')} value={formatDateForDisplay(contact.Activity?.LastClicked, i18n.language)} />
                                </dl>
                            </div>
                        </div>

                        {contact.CustomFields && Object.keys(contact.CustomFields).length > 0 && (
                            <div className="account-tab-card">
                                <div className="account-tab-card-header"><h3>{t('customFields')}</h3></div>
                                <div className="account-tab-card-body">
                                    <dl className="contact-details-grid">
                                        {Object.entries(contact.CustomFields).map(([key, value]) => (
                                            <DetailItem key={key} label={key} value={String(value)} />
                                        ))}
                                    </dl>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactDetailView;