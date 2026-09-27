
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import AccountDataCard from '../../components/AccountDataCard';
import Icon, { ICONS } from '../../components/Icon';
import Badge from '../../components/Badge';
import { useStatusStyles } from '../../hooks/useStatusStyles';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeSwitcher from '../../components/ThemeSwitcher';

const GeneralTab = ({ accountData, contactsCountData, contactsCountLoading, isAppInstalled, handleInstallClick }: { accountData: any, contactsCountData: any, contactsCountLoading: boolean, isAppInstalled: boolean, handleInstallClick: () => void }) => {
    const { t, i18n } = useTranslation(['account', 'common']);
    const { logout } = useAuth();
    const { config } = useConfiguration();
    const { setTheme } = useTheme();
    const { getStatusStyle } = useStatusStyles();
    
    const getReputationInfo = (reputation: number) => {
        const score = Number(reputation || 0);
        if (score >= 80) return { text: t('reputationExcellent'), className: 'good' };
        if (score >= 60) return { text: t('reputationGood'), className: 'good' };
        if (score >= 40) return { text: t('reputationAverage'), className: 'medium' };
        if (score >= 20) return { text: t('reputationPoor'), className: 'bad' };
        return { text: t('reputationVeryPoor'), className: 'bad' };
    };

    const handleLogout = () => {
        setTheme('auto'); // Reset theme to auto-detect on logout
        logout();
    };
    
    const accountStatus = accountData?.status || 'Active';
    const statusStyle = getStatusStyle(accountStatus);
    const reputation = getReputationInfo(accountData?.reputation);
    const appName = config?.app_name || t('appName');
    
    return (
        <div className="account-tab-content">
            <div className="card-grid account-grid">
                <AccountDataCard title={t('accountStatus')} iconPath={ICONS.VERIFY}>
                    <Badge text={statusStyle.text} type={statusStyle.type} iconPath={statusStyle.iconPath} />
                </AccountDataCard>
                <AccountDataCard title={t('reputation')} iconPath={ICONS.AWARD}>
                    <span className={`reputation-score ${reputation.className}`}>{accountData?.reputation ?? 0}%</span>
                    <span className="reputation-text">{reputation.text}</span>
                </AccountDataCard>
                 <AccountDataCard title={t('remainingCredits')} iconPath={ICONS.BUY_CREDITS}>
                    {(accountData?.emailcredits === undefined) ? 'N/A' : Number(accountData.emailcredits).toLocaleString(i18n.language)}
                </AccountDataCard>
                <AccountDataCard title={t('totalContacts', { ns: 'dashboard' })} iconPath={ICONS.CONTACTS}>
                    {contactsCountLoading ? '...' : (contactsCountData?.toLocaleString(i18n.language) ?? '0')}
                </AccountDataCard>
            </div>

            <div className="account-tab-card">
                <div className="account-tab-card-header">
                    <h3>{t('displayMode')}</h3>
                </div>
                <div className="account-tab-card-body">
                    <p>{t('displayModeSubtitle', { appName: appName })}</p>
                    <ThemeSwitcher />
                </div>
            </div>

            {!isAppInstalled && (
                <div className="account-tab-card">
                    <div className="account-tab-card-header">
                        <h3>{t('installApp')}</h3>
                    </div>
                    <div className="account-tab-card-body">
                        <p>{t('installAppSubtitle')}</p>
                        <button className="btn btn-secondary" onClick={handleInstallClick} style={{maxWidth: '250px'}}>
                            <Icon>{ICONS.DOWNLOAD}</Icon> {t('installMailzila', { appName: t('appName') })}
                        </button>
                    </div>
                </div>
            )}

            <div className="account-tab-card">
                <div className="account-tab-card-header">
                    <h3>{t('logout')}</h3>
                </div>
                <div className="account-tab-card-body">
                    <p>{t('logoutDescription')}</p>
                    <button className="btn btn-secondary" onClick={handleLogout} style={{maxWidth: '250px'}}>
                        <Icon>{ICONS.LOGOUT}</Icon> {t('logout')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GeneralTab;