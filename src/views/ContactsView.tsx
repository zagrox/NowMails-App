


import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useApi from './useApi';
import useApiV4 from '../hooks/useApiV4';
import { apiFetch, apiFetchV4 } from '../api/elasticEmail';
import { Contact, List, CustomField } from '../api/types';
import { formatDateForDisplay } from '../utils/helpers';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import Icon, { ICONS } from '../components/Icon';
import Badge from '../components/Badge';
import ConfirmModal from '../components/ConfirmModal';
import { useStatusStyles } from '../hooks/useStatusStyles';
import ExportContactsModal from '../components/ExportContactsModal';
import BulkActionsBar from '../components/BulkActionsBar';
import AddToListModal from '../components/AddToListModal';
import Button from '../components/Button';
import { AppActions } from '../config/actions';
import EmptyState from '../components/EmptyState';
import ImportWizardModal from '../components/ImportWizardModal';

const STATUS_ORDER = [
    'Active', 'Engaged', 'Transactional', 'Bounced', 'Unsubscribed',
    'Abuse', 'Inactive', 'Stale', 'NotConfirmed'
];

const STATUS_TO_V2_ENUM: { [key: string]: number } = {
    'Transactional': -2,
    'Engaged': -1,
    'Active': 0,
    'Bounced': 1,
    'Unsubscribed': 2,
    'Abuse': 3,
    'Inactive': 4,
    'Stale': 5,
    'NotConfirmed': 6
};

const V2_ENUM_TO_STATUS: { [key: number]: string } = {
    '-2': 'Transactional',
    '-1': 'Engaged',
    '0': 'Active',
    '1': 'Bounced',
    '2': 'Unsubscribed',
    '3': 'Abuse',
    '4': 'Inactive',
    '5': 'Stale',
    '6': 'NotConfirmed'
};

const ContactStatusFilter = ({ apiKey, selectedStatuses, onStatusChange, onExportClick }: { apiKey: string, selectedStatuses: string[], onStatusChange: (status: string) => void, onExportClick: () => void }) => {
    const { t, i18n } = useTranslation(['contacts', 'common']);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const { getStatusStyle } = useStatusStyles();

    React.useEffect(() => {
        if (!apiKey) {
            setIsLoading(false);
            return;
        }

        const fetchCounts = async () => {
            setIsLoading(true);
            setFetchError(null);
            
            const promises = STATUS_ORDER.map(status => {
                const apiStatusEnum = STATUS_TO_V2_ENUM[status];
                // Use numeric enum for rule if available, otherwise fallback to string.
                const rule = apiStatusEnum !== undefined ? `Status = ${apiStatusEnum}` : `Status = '${status}'`;
                
                return apiFetch('/contact/count', apiKey, { params: { rule } })
                    .then(count => ({ status, count: Number(count) }))
                    .catch(() => ({ status, count: -1 })); // Use -1 to flag an error
            });

            try {
                const results = await Promise.all(promises);
                const newCounts: Record<string, number> = {};
                results.forEach(result => {
                    newCounts[result.status] = result.count;
                });
                setCounts(newCounts);
            } catch (e: any) {
                setFetchError(e.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCounts();
    }, [apiKey]);
    
    const hexToRgba = (hex: string, alpha = 0.15) => {
        if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            return `rgba(128,128,128,${alpha})`; // fallback grey
        }
        let c: any = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${alpha})`;
    };

    return (
        <div className="card contact-status-filter">
            <div className="card-header">
                <h3>{t('status')}</h3>
            </div>
            <div className="card-body">
                {isLoading && <CenteredMessage><Loader /></CenteredMessage>}
                {fetchError && <p style={{fontSize: '0.8rem', color: 'var(--danger-color)', padding: '0 0.5rem'}}>{t('error')}: {fetchError}</p>}
                {!isLoading && !fetchError && STATUS_ORDER.map(status => {
                    const count = counts[status];
                    const statusStyle = getStatusStyle(status);
                    
                    const badgeStyle: React.CSSProperties = {};
                    if (statusStyle.color) {
                        badgeStyle.backgroundColor = hexToRgba(statusStyle.color, 0.15);
                        badgeStyle.color = statusStyle.color;
                    }
                    
                    return (
                        <div key={status} className="contact-status-filter-item" onClick={() => onStatusChange(status)}>
                            <label className="custom-checkbox">
                                <input
                                    type="checkbox"
                                    checked={selectedStatuses.includes(status)}
                                    onChange={() => onStatusChange(status)}
                                />
                                <span className="checkbox-checkmark"></span>
                                <span className="checkbox-label">{t(status.toLowerCase())}</span>
                            </label>
                            <span className="badge" style={badgeStyle}>
                                {count === -1 
                                 ? <Icon title={t('error')} style={{width: '1em', height: '1em', color: 'var(--danger-color)'}}>{ICONS.COMPLAINT}</Icon> 
                                 : (count !== undefined ? Number(count).toLocaleString(i18n.language) : <Loader />)
                                }
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="card-footer" style={{padding: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem'}}>
                <Button
                    className="btn-secondary full-width"
                    onClick={onExportClick}
                    disabled={selectedStatuses.length === 0}
                    action={AppActions.EXPORT_CONTACTS}
                >
                    <Icon>{ICONS.DOWNLOAD}</Icon>
                    <span>{t('exportContacts')}</span>
                </Button>
            </div>
        </div>
    );
};

const ContactCard = React.memo(({ contact, onView, onDelete, isSelected, onToggleSelect }: { contact: Contact; onView: (email: string) => void; onDelete: (email: string) => void; isSelected: boolean; onToggleSelect: (email: string) => void; }) => {
    const { t, i18n } = useTranslation(['contacts', 'common']);
    const { getStatusStyle } = useStatusStyles();
    const statusStyle = getStatusStyle(contact.Status);

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    return (
        <div className={`card contact-card ${isSelected ? 'selected' : ''}`}>
            <div className="contact-card-main" onClick={() => onToggleSelect(contact.Email)}>
                <div className="contact-card-info" onClick={(e) => handleActionClick(e, () => onView(contact.Email))} style={{ cursor: 'pointer', flexGrow: 1, minWidth: 0 }}>
                    <h4 className="contact-card-name" title={contact.Email}>{contact.FirstName || contact.LastName ? `${contact.FirstName || ''} ${contact.LastName || ''}`.trim() : contact.Email}</h4>
                    <p className="contact-card-email">{contact.Email}</p>
                </div>
                <div className="contact-card-status">
                    <Badge text={statusStyle.text} type={statusStyle.type} color={statusStyle.color} iconPath={statusStyle.iconPath} />
                </div>
            </div>
            <div className="contact-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label className="custom-checkbox" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(contact.Email)} />
                        <span className="checkbox-checkmark"></span>
                    </label>
                    <small>{t('dateAdded')}: {formatDateForDisplay(contact.DateAdded, i18n.language)}</small>
                </div>
                <div className="action-buttons">
                    <Button className="btn-icon btn-icon-danger" onClick={(e) => handleActionClick(e, () => onDelete(contact.Email))} aria-label={t('deleteContact')}>
                        <Icon>{ICONS.DELETE}</Icon>
                    </Button>
                </div>
            </div>
        </div>
    );
});


const AddContactForm = ({ apiKey, onSubmit }: { apiKey: string; onSubmit: (data: Partial<Contact>) => void }) => {
    const { t } = useTranslation(['contacts', 'common', 'auth', 'customFields']);
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dynamicFields, setDynamicFields] = useState<{ id: number; key: string; value: string }[]>([]);

    const addDynamicField = () => {
        setDynamicFields(prev => [...prev, { id: Date.now(), key: '', value: '' }]);
    };

    const updateDynamicField = (id: number, part: 'key' | 'value', fieldValue: string) => {
        setDynamicFields(prev => prev.map(f => f.id === id ? { ...f, [part]: fieldValue } : f));
    };

    const removeDynamicField = (id: number) => {
        setDynamicFields(prev => prev.filter(f => f.id !== id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Partial<Contact> = {
            Email: email,
            FirstName: firstName,
            LastName: lastName,
        };
        
        const customFieldsPayload: Record<string, string> = {};
        dynamicFields.forEach(field => {
            if (field.key.trim()) {
                customFieldsPayload[field.key.trim()] = field.value;
            }
        });

        if (Object.keys(customFieldsPayload).length > 0) {
            payload.CustomFields = customFieldsPayload;
        }
        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
                <label htmlFor="email">{t('emailAddress', { ns: 'auth' })}</label>
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-grid">
                 <div className="form-group">
                    <label htmlFor="firstName">{t('firstName', { ns: 'auth' })}</label>
                    <input id="firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                 <div className="form-group">
                    <label htmlFor="lastName">{t('lastName', { ns: 'auth' })}</label>
                    <input id="lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
            </div>
            
            <div className="form-group full-width" style={{gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)'}}>
                <h4 style={{marginBottom: 0}}>{t('customFields')}</h4>
                <div className="dynamic-fields-container">
                    {dynamicFields.map(field => (
                        <div key={field.id} className="dynamic-field-row">
                            <input type="text" placeholder={t('fieldName')} value={field.key} onChange={e => updateDynamicField(field.id, 'key', e.target.value)} />
                            <input type="text" placeholder={t('fieldValue')} value={field.value} onChange={e => updateDynamicField(field.id, 'value', e.target.value)} />
                            <button type="button" className="btn-icon btn-icon-danger" onClick={() => removeDynamicField(field.id)} aria-label={t('delete')}><Icon>{ICONS.DELETE}</Icon></button>
                        </div>
                    ))}
                </div>
                <Button type="button" className="btn-secondary" onClick={addDynamicField} style={{alignSelf: 'flex-start'}}>
                    <Icon>{ICONS.PLUS}</Icon>
                    <span>{t('addField')}</span>
                </Button>
            </div>

            <Button type="submit" className="btn-primary full-width">{t('addContact')}</Button>
        </form>
    );
};

const ContactsView = ({ apiKey, setView }: { apiKey: string, setView: (view: string, data?: any) => void; }) => {
    const { t } = useTranslation(['contacts', 'common', 'customFields']);
    const { addToast } = useToast();
    const [refetchIndex, setRefetchIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [offset, setOffset] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [contactToDelete, setContactToDelete] = useState<string | null>(null);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);


    const CONTACTS_PER_PAGE = 20;
    
    const useV2Api = selectedStatuses.length > 0;

    const v2Rule = useMemo(() => {
        const statusClauses = selectedStatuses.map(s => {
            const apiStatusEnum = STATUS_TO_V2_ENUM[s];
            if (apiStatusEnum !== undefined) {
                return `Status = ${apiStatusEnum}`;
            }
            return `Status = '${s}'`;
        });
        const statusRule = `(${statusClauses.join(' OR ')})`;

        if (searchQuery) {
            const escapedSearch = searchQuery.replace(/'/g, "''");
            const searchRule = `(Email CONTAINS '${escapedSearch}' OR FirstName CONTAINS '${escapedSearch}' OR LastName CONTAINS '${escapedSearch}')`;
            return `${statusRule} AND ${searchRule}`;
        }
        
        return statusRule;
    }, [selectedStatuses, searchQuery]);
    
    // V4 API call for when no status filter is active
    const { data: v4Data, loading: v4Loading, error: v4Error } = useApiV4(
        !useV2Api ? '/contacts' : '',
        apiKey,
        { limit: CONTACTS_PER_PAGE, offset, search: searchQuery },
        refetchIndex
    );
    
    // V2 API call for when a status filter is active
    const { data: v2Data, loading: v2Loading, error: v2Error } = useApi(
        useV2Api ? '/contact/list' : '',
        apiKey,
        { rule: v2Rule, limit: CONTACTS_PER_PAGE, offset },
        refetchIndex
    );

    const v2ContactsMapped = useMemo(() => {
        if (!v2Data) return [];
        return v2Data.map((c: any) => ({
            Email: c.email,
            FirstName: c.firstname,
            LastName: c.lastname,
            Status: V2_ENUM_TO_STATUS[c.status as number] || 'Unknown',
            Source: c.source,
            DateAdded: c.dateadded,
        }));
    }, [v2Data]);

    const contacts = useV2Api ? v2ContactsMapped : v4Data;
    const loading = useV2Api ? v2Loading : v4Loading;
    const error = useV2Api ? v2Error : v2Error;
    const paginatedContacts = Array.isArray(contacts) ? contacts : [];

    const refetch = () => setRefetchIndex(i => i + 1);

    const handleStatusChange = (status: string) => {
        setSelectedStatuses(prev => {
            const newSelection = prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status];
            
            setOffset(0); // Reset pagination on filter change
            return newSelection;
        });
    };

    const handleAddContact = async (contactData: Partial<Contact>) => {
        try {
            await apiFetchV4('/contacts', apiKey, { method: 'POST', body: [contactData] });
            addToast(t('contactAddedSuccess', { email: contactData.Email }), 'success');
            setIsAddModalOpen(false);
            refetch();
        } catch (err: any) {
            addToast(t('contactAddedError', { error: err.message }), 'error');
        }
    };
    
    const confirmDeleteContact = async () => {
        if (!contactToDelete) return;
        try {
            await apiFetchV4(`/contacts/${encodeURIComponent(contactToDelete)}`, apiKey, { method: 'DELETE' });
            addToast(t('contactDeletedSuccess', { email: contactToDelete }), 'success');
            refetch();
        } catch (err: any) {
            addToast(t('contactDeletedError', { error: err.message }), 'error');
        } finally {
            setContactToDelete(null);
        }
    };
    
    const handleViewContact = (email: string) => {
        setView('ContactDetail', { contactEmail: email, origin: { view: 'Contacts', data: {} } });
    };

    const toggleContactSelection = useCallback((email: string) => {
        setSelectedContacts(prev =>
            prev.includes(email)
                ? prev.filter(e => e !== email)
                : [...prev, email]
        );
    }, []);

    const toggleSelectAll = () => {
        const paginatedEmails = paginatedContacts.map(c => c.Email);
        const allSelectedOnPage = paginatedEmails.every(email => selectedContacts.includes(email));
        
        if (allSelectedOnPage) {
            setSelectedContacts(prev => prev.filter(email => !paginatedEmails.includes(email)));
        } else {
            setSelectedContacts(prev => [...new Set([...prev, ...paginatedEmails])]);
        }
    };
    
    const clearSelection = () => {
        setSelectedContacts([]);
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleteConfirmOpen(false);
        try {
            await apiFetchV4('/contacts/delete', apiKey, {
                method: 'POST',
                body: { Emails: selectedContacts }
            });
            addToast(`${selectedContacts.length} contacts deleted successfully.`, 'success');
            clearSelection();
            refetch();
        } catch (err: any) {
            addToast(`Failed to delete contacts: ${err.message}`, 'error');
        }
    };

    const handleBulkAddToList = async (listName: string) => {
        try {
            await apiFetchV4(`/lists/${encodeURIComponent(listName)}/contacts`, apiKey, {
                method: 'POST',
                body: { Emails: selectedContacts }
            });
            addToast(`${selectedContacts.length} contacts added to ${listName}.`, 'success');
            clearSelection();
            setIsAddToListModalOpen(false);
        } catch (err: any) {
            addToast(`Failed to add contacts to list: ${err.message}`, 'error');
        }
    };

    const isAllVisibleSelected = useMemo(() => {
        const paginatedEmails = paginatedContacts.map(c => c.Email);
        return paginatedEmails.length > 0 && paginatedEmails.every(email => selectedContacts.includes(email));
    }, [paginatedContacts, selectedContacts]);


    return (
        <div>
            <ImportWizardModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                apiKey={apiKey}
                onSuccess={() => {
                    setIsImportModalOpen(false);
                    addToast(t('importSuccessMessage'), 'success');
                    setTimeout(refetch, 2000);
                }}
                onError={(message) => {
                    addToast(t('importFailedError', { error: message }), 'error');
                }}
            />
             <ExportContactsModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                apiKey={apiKey}
                selectedStatuses={selectedStatuses}
                onSuccess={() => {
                    setIsExportModalOpen(false);
                    addToast(t('exportStartedSuccess'), 'success');
                }}
                onError={(message) => {
                    addToast(t('exportFailedError', { error: message }), 'error');
                }}
            />
            <Modal title={t('addNewContact')} isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
                <AddContactForm apiKey={apiKey} onSubmit={handleAddContact} />
            </Modal>
            <ConfirmModal
                isOpen={!!contactToDelete}
                onClose={() => setContactToDelete(null)}
                onConfirm={confirmDeleteContact}
                title={t('deleteContact')}
            >
                <p>{t('confirmDeleteContact', { email: contactToDelete })}</p>
            </ConfirmModal>
            <ConfirmModal
                isOpen={isBulkDeleteConfirmOpen}
                onClose={() => setIsBulkDeleteConfirmOpen(false)}
                onConfirm={handleBulkDelete}
                title={t('delete', { count: selectedContacts.length })}
            >
                <p>{t('confirmDeleteContact', { email: `${selectedContacts.length} contacts` })}</p>
            </ConfirmModal>
            <AddToListModal
                isOpen={isAddToListModalOpen}
                onClose={() => setIsAddToListModalOpen(false)}
                onConfirm={handleBulkAddToList}
                apiKey={apiKey}
            />

            
            <div className="contacts-view-layout">
                <ContactStatusFilter
                    apiKey={apiKey}
                    selectedStatuses={selectedStatuses}
                    onStatusChange={handleStatusChange}
                    onExportClick={() => setIsExportModalOpen(true)}
                />

                <div className="contacts-view-main">
                    <div className="contacts-view-header-sticky">
                        <div className="view-header contacts-header">
                            <div
                                className="contacts-selection-header"
                                onClick={toggleSelectAll}
                                role="button"
                                tabIndex={0}
                                aria-label={isAllVisibleSelected ? t('deselectAllOnPage') : t('selectAllOnPage')}
                                onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSelectAll()}
                            >
                                <input
                                    type="checkbox"
                                    checked={isAllVisibleSelected}
                                    onChange={() => {}} // The parent div handles the click
                                    disabled={loading || paginatedContacts.length === 0}
                                    tabIndex={-1} // Makes the checkbox itself unfocusable
                                />
                                <span className="checkbox-checkmark"></span>
                                <span>
                                    {selectedContacts.length > 0
                                        ? t('countSelected', { count: selectedContacts.length })
                                        : t('selectPage')
                                    }
                                </span>
                            </div>
                            <div className="search-bar">
                                <Icon>{ICONS.SEARCH}</Icon>
                                <input
                                    type="search"
                                    placeholder={t('searchContactsPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setOffset(0);
                                    }}
                                />
                            </div>
                            <div className="header-actions">
                                <Button className="btn-primary" onClick={() => setIsAddModalOpen(true)} action={AppActions.ADD_CONTACT}>
                                    <Icon>{ICONS.USER_PLUS}</Icon> <span className="btn-text">{t('addContact')}</span>
                                </Button>
                                <Button onClick={() => setIsImportModalOpen(true)} action={AppActions.IMPORT_CONTACTS}>
                                    <Icon>{ICONS.UPLOAD}</Icon> <span className="btn-text">{t('importContacts')}</span>
                                </Button>
                                <Button onClick={() => setView('Email Lists')} className="btn-secondary">
                                    <Icon>{ICONS.EMAIL_LISTS}</Icon> <span className="btn-text">{t('emailLists', { ns: 'common' })}</span>
                                </Button>
                                <Button onClick={() => setView('Segments')} className="btn-secondary">
                                    <Icon>{ICONS.SEGMENTS}</Icon> <span className="btn-text">{t('segments', { ns: 'common' })}</span>
                                </Button>
                                <Button onClick={() => setView('Custom Fields')} className="btn-secondary">
                                    <Icon>{ICONS.HASH}</Icon> <span className="btn-text">{t('manageCustomFields')}</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {loading && <CenteredMessage><Loader /></CenteredMessage>}
                    {error && <ErrorMessage error={error} />}

                    {!loading && !error && (
                        <>
                            {contacts?.length > 0 ? (
                                <div className="contacts-grid">
                                    {paginatedContacts.map((contact: Contact) => (
                                        <ContactCard 
                                            key={contact.Email} 
                                            contact={contact} 
                                            onView={handleViewContact} 
                                            onDelete={setContactToDelete}
                                            isSelected={selectedContacts.includes(contact.Email)}
                                            onToggleSelect={toggleContactSelection}
                                        />
                                    ))}
                                </div>
                            ) : (
                                searchQuery ? (
                                    <CenteredMessage>
                                        {t('noContactsForQuery', { query: searchQuery })}
                                    </CenteredMessage>
                                ) : (
                                    <EmptyState
                                        icon={ICONS.CONTACTS}
                                        title={t('noContactsFound')}
                                        message={t('noContactsFoundDesc')}
                                        ctaText={t('addContact')}
                                        onCtaClick={() => setIsAddModalOpen(true)}
                                        secondaryCtaText={t('importContacts')}
                                        onSecondaryCtaClick={() => setIsImportModalOpen(true)}
                                    />
                                )
                            )}

                            {contacts && (contacts.length > 0 || offset > 0) && (
                                <div className="pagination-controls">
                                    <Button onClick={() => setOffset(o => Math.max(0, o - CONTACTS_PER_PAGE))} disabled={offset === 0 || loading}>
                                        <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                                        <span>{t('previous')}</span>
                                    </Button>
                                    <span className="pagination-page-info">{t('page', { page: offset / CONTACTS_PER_PAGE + 1 })}</span>
                                    <Button onClick={() => setOffset(o => o + CONTACTS_PER_PAGE)} disabled={!contacts || contacts.length < CONTACTS_PER_PAGE || loading}>
                                        <span>{t('next')}</span>
                                        <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {selectedContacts.length > 0 && (
                <BulkActionsBar
                    count={selectedContacts.length}
                    onDeselectAll={clearSelection}
                    onDelete={() => setIsBulkDeleteConfirmOpen(true)}
                    onAddToList={() => setIsAddToListModalOpen(true)}
                />
            )}
        </div>
    );
};

export default ContactsView;
