import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Tabs from '../components/Tabs';
import DomainVerificationTab from './domains/DomainVerificationTab';
import { ICONS } from '../components/Icon';

const DomainsView = ({ apiKey, setView }: { apiKey: string, setView: (view: string, data?: any) => void }) => {
    const { t } = useTranslation(['domains', 'common']);
    const [activeTab, setActiveTab] = useState('domains');

    const tabs = [
        { 
            id: 'domains', 
            label: t('domainVerification'), 
            icon: ICONS.DOMAINS,
            component: <DomainVerificationTab apiKey={apiKey} setView={setView} /> 
        }
    ];

    return (
        <div className="account-tab-content">
             <Tabs
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />
        </div>
    );
};

export default DomainsView;