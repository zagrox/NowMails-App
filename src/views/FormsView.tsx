
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useApi from './useApi';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Icon, { ICONS } from '../components/Icon';
import Button from '../components/Button';
import useApiV4 from '../hooks/useApiV4';
import { List } from '../api/types';

const FormsView = ({ apiKey }: { apiKey: string }) => {
    const { t } = useTranslation(['common', 'forms', 'emailLists']);
    const [copied, setCopied] = useState(false);
    const [selectedList, setSelectedList] = useState('');
    const { data: accountData, loading: accountLoading, error: accountError } = useApi('/account/load', apiKey);
    const { data: listsData, loading: listsLoading, error: listsError } = useApiV4('/lists', apiKey, {}, apiKey ? 1 : 0);
    
    const lists: List[] = useMemo(() => Array.isArray(listsData) ? listsData : [], [listsData]);

    useEffect(() => {
        if (lists.length > 0 && !selectedList) {
            setSelectedList(lists[0].ListName);
        }
    }, [lists, selectedList]);

    const publicAccountId = accountData?.publicaccountid;
    const subscribeUrl = publicAccountId 
        ? `https://api.elasticemail.com/v2/contact/subscribe?publicAccountID=${publicAccountId}&showLogo=false${selectedList ? `&listName=${encodeURIComponent(selectedList)}` : ''}` 
        : '';

    const handleCopy = () => {
        if (!subscribeUrl) return;
        navigator.clipboard.writeText(subscribeUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const loading = accountLoading || listsLoading;
    const error = accountError || listsError;

    if (loading) {
        return <CenteredMessage><Loader /></CenteredMessage>;
    }

    if (error) {
        return <ErrorMessage error={error} />;
    }

    if (!publicAccountId) {
        return (
            <CenteredMessage>
                <div className="info-message warning">
                    <p>{t('publicIdUnavailable')}</p>
                </div>
            </CenteredMessage>
        );
    }

    return (
        <div className="forms-view-container">
            <div className="card subscribe-form-card">
                <div className="card-header">
                    <h3>{t('yourSubscriptionForm')}</h3>
                </div>
                <div className="card-body">
                    <p>{t('subscriptionFormDesc')}</p>
                    
                    <div className="form-group">
                        <label htmlFor="list-select">{t('addContactsToList')}</label>
                        <select 
                            id="list-select" 
                            value={selectedList} 
                            onChange={(e) => setSelectedList(e.target.value)}
                            disabled={loading || lists.length === 0}
                        >
                            {lists.length === 0 && <option>{t('noListsFound', { ns: 'emailLists' })}</option>}
                            {lists.map(list => (
                                <option key={list.ListName} value={list.ListName}>
                                    {list.ListName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-url-display">
                        <code>{subscribeUrl}</code>
                        <Button className="btn-secondary" onClick={handleCopy}>
                            {/* FIX: Updated Icon component to accept children instead of a prop. */}
                            <Icon>{copied ? ICONS.CHECK : ICONS.COPY}</Icon>
                            <span>{copied ? t('copied') : t('copyLink')}</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="card form-preview-container">
                 <div className="card-header">
                    <h3>{t('formPreview')}</h3>
                </div>
                <div className="card-body" style={{padding: 0}}>
                    <iframe
                        key={subscribeUrl}
                        src={subscribeUrl}
                        className="form-preview-iframe"
                        title={t('formPreview')}
                    />
                </div>
            </div>
        </div>
    );
};

export default FormsView;
