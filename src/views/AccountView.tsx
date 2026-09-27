

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import useApi from './useApi';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import { ICONS } from '../components/Icon';
import Tabs from '../components/Tabs';
import GeneralTab from './account/GeneralTab';
import ProfileTab from './account/ProfileTab';
import SecurityTab from './account/SecurityTab';
import OrdersTab from './account/OrdersTab';
import ModulesTab from './account/ModulesTab';
import NotificationsTab from './account/NotificationsTab';

const AccountView = ({ apiKey, user, setView, allModules, hasModuleAccess, isAppInstalled, handleInstallClick }: { apiKey: string, user: any, setView: (view: string, data?: any) => void, allModules: any, hasModuleAccess: (moduleName: string, allModules: any) => boolean, isAppInstalled: boolean, handleInstallClick: () => void }) => {
    const { t } = useTranslation(['account', 'common', 'orders']);
    const { data: accountData, loading: accountLoading, error: accountError } = useApi('/account/load', apiKey, {}, apiKey ? 1 : 0);
    const { data: contactsCountData, loading: contactsCountLoading } = useApi('/contact/count', apiKey, { allContacts: true }, apiKey ? 1 : 0);
    const [activeTab, setActiveTab] = useState('general');

    const tabs = useMemo(() => {
        const baseTabs = [
            { id: 'general', label: t('general'), icon: ICONS.DASHBOARD, component: <GeneralTab accountData={accountData} contactsCountData={contactsCountData} contactsCountLoading={contactsCountLoading} isAppInstalled={isAppInstalled} handleInstallClick={handleInstallClick} /> },
            { id: 'profile', label: t('profile'), icon: ICONS.ACCOUNT, component: <ProfileTab accountData={accountData} user={user} /> },
            { id: 'orders', label: t('orders'), icon: ICONS.BUY_CREDITS, component: <OrdersTab setView={setView} /> },
            { id: 'modules', label: t('modules'), icon: ICONS.BOX, component: <ModulesTab setView={setView} /> },
            { id: 'notifications', label: t('notifications'), icon: ICONS.BELL, component: <NotificationsTab /> },
            { id: 'security', label: t('security'), icon: ICONS.LOCK, component: <SecurityTab user={user} /> },
        ];

        return baseTabs;
    }, [t, accountData, contactsCountData, contactsCountLoading, isAppInstalled, handleInstallClick, user, setView]);
    
    useEffect(() => {
        const initialTab = sessionStorage.getItem('account-tab');
        if (initialTab) {
            // Check if the tab from session storage is a valid tab to prevent errors
            if (tabs.some(tab => tab.id === initialTab)) {
                setActiveTab(initialTab);
            }
            sessionStorage.removeItem('account-tab');
        }
        // This effect should only run once on mount to check for an initial tab.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    

    if (!apiKey) {
        return (
            <div className="account-view-container">
                <CenteredMessage>
                    <div className="info-message">
                        <strong>{t('noApiKeyFound')}</strong>
                        <p>{t('addKeyToViewAccount')}</p>
                    </div>
                </CenteredMessage>
            </div>
        );
    }

    if (accountLoading) {
        return <div className="account-view-container"><CenteredMessage><Loader /></CenteredMessage></div>;
    }
    
    return (
        <div className="account-view-container">
            <Tabs
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />
        </div>
    );
};

export default AccountView;