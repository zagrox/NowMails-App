

import React from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from './Icon';

interface BulkActionsBarProps {
    count: number;
    onDeselectAll: () => void;
    onDelete: () => void;
    onAddToList: () => void;
}

const BulkActionsBar = ({ count, onDeselectAll, onDelete, onAddToList }: BulkActionsBarProps) => {
    const { t } = useTranslation(['contacts', 'common']);
    
    return (
        <div className="bulk-actions-bar">
            <div className="bulk-actions-bar-info">
                <span>{count} {t('selectedForExport')}</span>
                <button onClick={onDeselectAll} className="link-button" style={{ marginLeft: '1rem' }}>{t('cancel')}</button>
            </div>
            <div className="bulk-actions-bar-actions">
                <button className="btn btn-secondary" onClick={onAddToList}>
                    {/* FIX: The Icon component requires a child. The plus icon is provided. */}
                    <Icon>{ICONS.PLUS}</Icon>
                    <span>{t('addToListOptional')}</span>
                </button>
                <button className="btn btn-danger" onClick={onDelete}>
                    {/* FIX: The Icon component requires a child. The delete icon is provided. */}
                    <Icon>{ICONS.DELETE}</Icon>
                    <span>{t('delete')}</span>
                </button>
            </div>
        </div>
    );
};

export default BulkActionsBar;