
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { apiFetch, apiFetchV4 } from '../api/elasticEmail';
import { List } from '../api/types';
import { formatDateRelative } from '../utils/helpers';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../contexts/ToastContext';
import RenameModal from '../components/RenameModal';
import Icon, { ICONS } from '../components/Icon';
import ConfirmModal from '../components/ConfirmModal';
import LineLoader from '../components/LineLoader';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';


const CreateListModal = ({ isOpen, onClose, apiKey, onSuccess }: { isOpen: boolean, onClose: () => void, apiKey: string, onSuccess: (listName: string) => void }) => {
    const { t } = useTranslation(['emailLists', 'common']);
    const [newListName, setNewListName] = useState('');
    const [allowUnsubscribe, setAllowUnsubscribe] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName) return;
        setIsSubmitting(true);
        try {
            await apiFetchV4('/lists', apiKey, {
                method: 'POST',
                body: {
                    ListName: newListName,
                    AllowUnsubscribe: allowUnsubscribe
                }
            });
            onSuccess(newListName);
        } catch (err: any) {
            addToast(t('listCreatedError', { error: err.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setNewListName('');
            setAllowUnsubscribe(true);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('createList')}>
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                    <label htmlFor="new-list-name">{t('newListNamePlaceholder')}</label>
                    <input
                        id="new-list-name"
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        disabled={isSubmitting}
                        required
                    />
                </div>
                <div className="form-group">
                     <label className="custom-checkbox" style={{flexDirection: 'row', alignItems: 'center', gap: '0.75rem'}}>
                        <input
                            type="checkbox"
                            checked={allowUnsubscribe}
                            onChange={(e) => setAllowUnsubscribe(e.target.checked)}
                            disabled={isSubmitting}
                        />
                        <span className="checkbox-checkmark"></span>
                        <span className="checkbox-label" style={{fontWeight: 'normal'}}>{t('allowUnsubscribe')}</span>
                    </label>
                    <p className="field-hint">{t('allowUnsubscribeHelpText')}</p>
                </div>
                <div className="form-actions">
                    <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>{t('cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={!newListName || isSubmitting}>
                        {isSubmitting ? <Loader /> : t('createList')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};


const EmailListView = ({ apiKey, setView }: { apiKey: string, setView: (view: string, data?: any) => void }) => {
    const { t, i18n } = useTranslation(['emailLists', 'common', 'segments']);
    const { addToast } = useToast();
    const [refetchIndex, setRefetchIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const [listToRename, setListToRename] = useState<List | null>(null);
    const [listToDelete, setListToDelete] = useState<List | null>(null);
    const [listCounts, setListCounts] = useState<Record<string, { count: number | null; loading: boolean; error: boolean }>>({});
    const [updatingList, setUpdatingList] = useState<string | null>(null);


    const LISTS_PER_PAGE = 25;
    const [currentPage, setCurrentPage] = useState(1);
    
    const { data: lists, loading, error } = useApiV4('/lists', apiKey, { limit: 1000 }, refetchIndex);
    const refetch = () => setRefetchIndex(i => i + 1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const handleToggleUnsubscribe = async (list: List) => {
        setUpdatingList(list.ListName);
        const newAllowUnsubscribe = !list.AllowUnsubscribe;

        try {
            await apiFetchV4(`/lists/${encodeURIComponent(list.ListName)}`, apiKey, {
                method: 'PUT',
                body: { 
                    NewListName: list.ListName,
                    AllowUnsubscribe: newAllowUnsubscribe 
                }
            });
            addToast(`'${list.ListName}' updated successfully.`, 'success');
            refetch(); // Refetch data to get the latest state
        } catch (err: any) {
            addToast(`Failed to update list: ${err.message}`, 'error');
        } finally {
            setUpdatingList(null);
        }
    };

    const handleCreateSuccess = (listName: string) => {
        setIsCreateModalOpen(false);
        addToast(t('listCreatedSuccess', { listName }), 'success');
        refetch();
    };
    
    const confirmDeleteList = async () => {
        if (!listToDelete) return;
        const listName = listToDelete.ListName;
        try {
            await apiFetchV4(`/lists/${encodeURIComponent(listName)}`, apiKey, { method: 'DELETE' });
            addToast(t('listDeletedSuccess', { listName }), 'success');
            refetch();
        } catch (err: any) {
            addToast(t('listDeletedError', { error: err.message }), 'error');
        } finally {
            setListToDelete(null);
        }
    };

    const handleRenameList = async (newName: string) => {
        if (!listToRename) return;
        try {
            await apiFetchV4(`/lists/${encodeURIComponent(listToRename.ListName)}`, apiKey, {
                method: 'PUT',
                body: { 
                    NewListName: newName,
                    AllowUnsubscribe: listToRename.AllowUnsubscribe
                }
            });
            addToast(t('listRenamedSuccess', { newName }), 'success');
            setListToRename(null);
            refetch();
        } catch (err: any) {
            addToast(t('listRenamedError', { error: err.message }), 'error');
            setListToRename(null);
        }
    };
    
    const filteredLists: List[] = (lists || [])
        .filter((list: List) =>
            list.ListName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => new Date(b.DateAdded).getTime() - new Date(a.DateAdded).getTime());
    
    const totalPages = Math.ceil(filteredLists.length / LISTS_PER_PAGE);
    const paginatedLists = filteredLists.slice(
        (currentPage - 1) * LISTS_PER_PAGE,
        currentPage * LISTS_PER_PAGE
    );

    useEffect(() => {
        if (paginatedLists && apiKey) {
            paginatedLists.forEach((list: List) => {
                const listName = list.ListName;
                if (!listCounts[listName]) { // Fetch only if not already fetched/fetching
                    setListCounts(prev => ({ ...prev, [listName]: { count: null, loading: true, error: false } }));
    
                    apiFetch('/contact/count', apiKey, { params: { rule: `listname = '${listName.replace(/'/g, "''")}'` } })
                        .then(count => {
                            setListCounts(prev => ({ ...prev, [listName]: { count: Number(count), loading: false, error: false } }));
                        })
                        .catch(err => {
                            console.error(`Failed to fetch count for list ${listName}:`, err);
                            setListCounts(prev => ({ ...prev, [listName]: { count: null, loading: false, error: true } }));
                        });
                }
            });
        }
    }, [paginatedLists, apiKey, listCounts]);


    return (
        <div>
            <CreateListModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                apiKey={apiKey}
                onSuccess={handleCreateSuccess}
            />
            {listToRename && (
                 <RenameModal
                    isOpen={!!listToRename}
                    onClose={() => setListToRename(null)}
                    entityName={listToRename.ListName}
                    entityType={t('list')}
                    onSubmit={handleRenameList}
                />
            )}

            {listToDelete && (
                <ConfirmModal
                    isOpen={!!listToDelete}
                    onClose={() => setListToDelete(null)}
                    onConfirm={confirmDeleteList}
                    title={t('deleteList')}
                    isDestructive={true}
                    confirmText={t('delete')}
                >
                    <p>{t('confirmDeleteList', { listName: listToDelete.ListName })}</p>
                </ConfirmModal>
            )}

            <div className="view-header">
                <div className="search-bar" style={{flexGrow: 1}}>
                    <Icon>{ICONS.SEARCH}</Icon>
                    <input
                        type="search"
                        placeholder={t('searchListsPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div className="header-actions">
                    <Button className="btn-primary" onClick={() => setIsCreateModalOpen(true)} action="create_list">
                        <Icon>{ICONS.PLUS}</Icon>
                        <span>{t('createList')}</span>
                    </Button>
                    <Button className="btn-secondary" onClick={() => setView('Segments')}>
                        <Icon>{ICONS.SEGMENTS}</Icon>
                        <span>{t('segments')}</span>
                    </Button>
                    <Button className="btn-secondary" onClick={() => setView('Custom Fields')}>
                        <Icon>{ICONS.HASH}</Icon>
                        <span>{t('customFields')}</span>
                    </Button>
                </div>
            </div>
            
            {loading && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}
            
            {!loading && !error && (
                filteredLists.length === 0 ? (
                    searchQuery ? (
                        <CenteredMessage>{t('noListsForQuery', { query: searchQuery })}</CenteredMessage>
                    ) : (
                        <EmptyState
                            icon={ICONS.EMAIL_LISTS}
                            title={t('noListsFound')}
                            message={t('noListsFoundDesc')}
                            ctaText={t('createList')}
                            onCtaClick={() => setIsCreateModalOpen(true)}
                        />
                    )
                ) : (
                    <>
                    <div className="table-container">
                        <table className="simple-table">
                            <thead>
                                <tr>
                                    <th>{t('name')}</th>
                                    <th style={{ textAlign: 'center' }}>{t('contacts')}</th>
                                    <th style={{ textAlign: 'center' }}>{t('allowUnsubscribe')}</th>
                                    <th>{t('dateAdded')}</th>
                                    <th style={{ textAlign: i18n.dir() === 'rtl' ? 'left' : 'right' }}>{t('action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedLists.map((list: List) => {
                                    const countInfo = listCounts[list.ListName];
                                    const isUpdating = updatingList === list.ListName;
                                    return (
                                        <tr key={list.ListName}>
                                            <td>
                                                <button className="table-link-button" onClick={() => setView('ListDetail', { list })}>
                                                    <strong>{list.ListName}</strong>
                                                </button>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {countInfo?.loading || !countInfo ? <div style={{maxWidth: '50px', margin: '0 auto'}}><LineLoader/></div> :
                                                 countInfo.error ? 'N/A' :
                                                 countInfo.count !== null ? countInfo.count.toLocaleString(i18n.language) : '-'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!list.AllowUnsubscribe}
                                                        onChange={() => handleToggleUnsubscribe(list)}
                                                        disabled={isUpdating}
                                                    />
                                                    <span className="toggle-slider"></span>
                                                </label>
                                            </td>
                                            <td>{formatDateRelative(list.DateAdded, i18n.language)}</td>
                                            <td>
                                                <div className="action-buttons" style={{justifyContent: 'flex-end'}}>
                                                    <button className="btn-icon btn-icon-primary" onClick={() => setView('ListDetail', { list })} aria-label={t('viewContactsInList')}><Icon>{ICONS.EYE}</Icon></button>
                                                    <button className="btn-icon btn-icon-primary" onClick={() => setListToRename(list)} aria-label={t('renameList')}><Icon>{ICONS.PENCIL}</Icon></button>
                                                    <button className="btn-icon btn-icon-danger" onClick={() => setListToDelete(list)} aria-label={t('deleteList')}><Icon>{ICONS.DELETE}</Icon></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                     {totalPages > 1 && (
                        <div className="pagination-controls">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading}>
                                <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                                <span>{t('previous')}</span>
                            </button>
                            <span className="pagination-page-info">Page {currentPage} of {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading}>
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

export default EmailListView;
