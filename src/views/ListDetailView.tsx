
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { Contact, List } from '../api/types';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Icon, { ICONS } from '../components/Icon';
import Badge from '../components/Badge';
import { useStatusStyles } from '../hooks/useStatusStyles';
import AddContactToListModal from '../components/AddContactToListModal';
import { apiFetchV4 } from '../api/elasticEmail';
import { useToast } from '../contexts/ToastContext';
import ExportContactsModal from '../components/ExportContactsModal';
import EmptyState from '../components/EmptyState';
import ImportWizardModal from '../components/ImportWizardModal';

const ListDetailView = ({ apiKey, list, onBack, setView }: {
    apiKey: string;
    list: List | null;
    onBack: () => void;
    setView: (view: string, data?: any) => void;
}) => {
    const { t, i18n } = useTranslation(['emailLists', 'common', 'contacts']);
    const { getStatusStyle } = useStatusStyles();
    const { addToast } = useToast();
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [offset, setOffset] = useState(0);
    const [refetchIndex, setRefetchIndex] = useState(0);

    const CONTACTS_PER_PAGE = 20;
    const listName = list?.ListName || '';

    const { data: allContacts, loading, error } = useApiV4(
        listName ? `/lists/${encodeURIComponent(listName)}/contacts` : '',
        apiKey,
        { limit: 10000 }, // Fetch a large number for client-side search/pagination
        refetchIndex
    );
    
    const refetch = () => setRefetchIndex(i => i + 1);

    const handleAddContacts = async (emails: string[]) => {
        try {
            await apiFetchV4(`/lists/${encodeURIComponent(listName)}/contacts`, apiKey, {
                method: 'POST',
                body: { Emails: emails }
            });
            addToast(t('contactsAddedSuccess', { count: emails.length, listName }), 'success');
            setIsAddContactModalOpen(false);
            refetch();
        } catch (err: any) {
            addToast(t('contactsAddedError', { error: err.message }), 'error');
        }
    };
    
    const filteredContacts = React.useMemo(() => {
        if (!Array.isArray(allContacts)) return [];
        const lowercasedQuery = searchQuery.toLowerCase();
        if (!lowercasedQuery) return allContacts;
        
        return allContacts.filter(c =>
            c.Email.toLowerCase().includes(lowercasedQuery) ||
            (c.FirstName || '').toLowerCase().includes(lowercasedQuery) ||
            (c.LastName || '').toLowerCase().includes(lowercasedQuery)
        );
    }, [allContacts, searchQuery]);
    
    const paginatedContacts = React.useMemo(() => {
        return filteredContacts.slice(offset, offset + CONTACTS_PER_PAGE);
    }, [filteredContacts, offset]);

    if (!list) {
        return (
            <CenteredMessage>
                <div className="info-message warning">
                    <p>No list selected.</p>
                </div>
            </CenteredMessage>
        );
    }
    
    return (
        <div>
            <AddContactToListModal
                isOpen={isAddContactModalOpen}
                onClose={() => setIsAddContactModalOpen(false)}
                onSubmit={handleAddContacts}
                listName={listName}
            />
             <ExportContactsModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                apiKey={apiKey}
                listName={listName}
                onSuccess={() => {
                    setIsExportModalOpen(false);
                    addToast(t('exportStartedSuccess', { ns: 'contacts' }), 'success');
                }}
                onError={(message) => {
                    addToast(t('exportFailedError', { ns: 'contacts', error: message }), 'error');
                }}
            />
            <ImportWizardModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                apiKey={apiKey}
                onSuccess={() => {
                    setIsImportModalOpen(false);
                    addToast(t('importSuccessMessage', { ns: 'contacts' }), 'success');
                    setTimeout(refetch, 2000);
                }}
                onError={(message) => {
                    addToast(t('importFailedError', { ns: 'contacts', error: message }), 'error');
                }}
                initialListName={listName}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button className="btn btn-secondary" onClick={onBack} style={{whiteSpace: 'nowrap'}}>
                    <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                    <span>{t('emailLists')}</span>
                </button>
                <h2 className="content-header" style={{margin: 0, borderBottom: 'none', fontSize: '2rem'}}>{t('contactsInList', { listName })}</h2>
            </div>

            <div className="view-header">
                <div className="search-bar" style={{flexGrow: 1}}>
                    <Icon>{ICONS.SEARCH}</Icon>
                    <input
                        type="search"
                        placeholder={t('searchContactsPlaceholder', { ns: 'contacts' })}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setOffset(0);
                        }}
                        disabled={loading}
                    />
                </div>
                <div className="header-actions">
                    <button className="btn" onClick={() => setIsExportModalOpen(true)}>
                        <Icon>{ICONS.DOWNLOAD}</Icon> {t('export', { ns: 'contacts' })}
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsAddContactModalOpen(true)}>
                        <Icon>{ICONS.USER_PLUS}</Icon> {t('addContact', { ns: 'contacts' })}
                    </button>
                </div>
            </div>
            
            {loading && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}
            
            {!loading && !error && (
                 (paginatedContacts.length === 0) ? (
                    searchQuery ? (
                         <CenteredMessage style={{height: '50vh'}}>
                            <p>{t('noContactsForQuery', { ns: 'contacts', query: searchQuery })}</p>
                        </CenteredMessage>
                    ) : (
                        <EmptyState
                            icon={ICONS.CONTACTS}
                            title={t('listIsEmptyTitle')}
                            message={t('listIsEmptyMessage')}
                            ctaText={t('addContact', { ns: 'contacts' })}
                            onCtaClick={() => setIsAddContactModalOpen(true)}
                            secondaryCtaText={t('importContacts', { ns: 'contacts' })}
                            onSecondaryCtaClick={() => setIsImportModalOpen(true)}
                        />
                    )
                ) : (
                    <>
                    <div className="table-container">
                        <table className="simple-table">
                            <thead>
                                <tr>
                                    <th>{t('email')}</th>
                                    <th>{t('name')}</th>
                                    <th>{t('status')}</th>
                                    <th style={{ textAlign: i18n.dir() === 'rtl' ? 'left' : 'right' }}>{t('action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedContacts.map((contact: Contact) => {
                                    const statusStyle = getStatusStyle(contact.Status);
                                    return (
                                        <tr key={contact.Email}>
                                            <td>
                                                <button 
                                                    className="table-link-button" 
                                                    onClick={() => setView('ContactDetail', { contactEmail: contact.Email, origin: { view: 'ListDetail', data: { list } } })}
                                                >
                                                    <strong>{contact.Email}</strong>
                                                </button>
                                            </td>
                                            <td>{`${contact.FirstName || ''} ${contact.LastName || ''}`.trim() || '-'}</td>
                                            <td><Badge text={statusStyle.text} type={statusStyle.type} color={statusStyle.color} iconPath={statusStyle.iconPath} /></td>
                                            <td>
                                                <div className="action-buttons" style={{justifyContent: 'flex-end'}}>
                                                   <button className="btn-icon btn-icon-danger" aria-label={t('deleteContact', { ns: 'contacts' })}><Icon>{ICONS.DELETE}</Icon></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {(filteredContacts.length > CONTACTS_PER_PAGE || offset > 0) && (
                        <div className="pagination-controls">
                            <button onClick={() => setOffset(o => Math.max(0, o - CONTACTS_PER_PAGE))} disabled={offset === 0 || loading}>
                                <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                                <span>{t('previous')}</span>
                            </button>
                            <span className="pagination-page-info">{t('page', { page: offset / CONTACTS_PER_PAGE + 1 })}</span>
                            <button onClick={() => setOffset(o => o + CONTACTS_PER_PAGE)} disabled={offset + CONTACTS_PER_PAGE >= filteredContacts.length || loading}>
                                <span>{t('next')}</span>
                                <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                            </button>
                        </div>
                    )}
                    </>
                )
            )}
        </div>
    );
};
export default ListDetailView;