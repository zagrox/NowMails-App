

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { List } from '../api/types';
import Modal from './Modal';
import Loader from './Loader';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';
import { AppActions } from '../config/actions';
import Icon, { ICONS } from './Icon';

interface AddToListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (listName: string) => Promise<void>;
    apiKey: string;
}

const AddToListModal = ({ isOpen, onClose, onConfirm, apiKey }: AddToListModalProps) => {
    const { t } = useTranslation(['contacts', 'sendEmail', 'emailLists', 'common']);
    const { data: lists, loading: listsLoading } = useApiV4('/lists', apiKey, {}, isOpen ? 1 : 0);
    const [selectedList, setSelectedList] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { canPerformAction } = useAuth();

    const isCreateListLocked = !canPerformAction(AppActions.CREATE_LIST);

    React.useEffect(() => {
        if (isOpen) {
            if (lists && lists.length > 0 && !selectedList) {
                setSelectedList(lists[0].ListName);
            } else if (lists && lists.length === 0) {
                setSelectedList(''); // Clear selection if no lists are available
            }
        }
    }, [isOpen, lists, selectedList]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedList) return;
        setIsSubmitting(true);
        await onConfirm(selectedList);
        setIsSubmitting(false);
    };
    
    const noListsFound = !listsLoading && (!lists || lists.length === 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('addToListOptional')}
        >
            <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                    <label htmlFor="list-select">{t('selectList')}</label>
                    {listsLoading ? <Loader /> : (
                        <select
                            id="list-select"
                            value={selectedList}
                            onChange={(e) => setSelectedList(e.target.value)}
                            disabled={noListsFound}
                        >
                            {noListsFound && <option value="">{t('noListsFound')}</option>}
                            {lists && lists.map((list: List) => (
                                <option key={list.ListName} value={list.ListName}>{list.ListName}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    {/* Left side actions */}
                    <div>
                        {isCreateListLocked && (
                            <Button 
                                className="btn-secondary" 
                                action={AppActions.CREATE_LIST}
                                type="button"
                                // Close the current modal when the unlock flow is triggered
                                onClick={() => onClose()}
                            >
                                {/* FIX: Updated Icon component to accept children instead of a prop. */}
                                <Icon>{ICONS.PLUS}</Icon>
                                <span>{t('createList', { ns: 'emailLists' })}</span>
                            </Button>
                        )}
                    </div>

                    {/* Right side actions */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>{t('cancel')}</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting || !selectedList || listsLoading}>
                            {isSubmitting ? <Loader /> : t('add')}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default AddToListModal;