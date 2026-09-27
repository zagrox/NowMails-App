import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Icon, { ICONS } from '../components/Icon';
import Badge from '../components/Badge';
import { useStatusStyles } from '../hooks/useStatusStyles';
import { formatDateForDisplay } from '../utils/helpers';
import OverallActivityChart from '../components/OverallActivityChart';
import ProgressBar from '../components/ProgressBar';

const SummaryItem = React.memo(({ label, value }: { label: string, value: React.ReactNode }) => {
    if (!value && value !== 0) return null;
    return (
        <>
            <dt>{label}</dt>
            <dd>{value}</dd>
        </>
    );
});

const CampaignDetailView = ({ apiKey, campaign, onBack }: { apiKey: string, campaign: any | null, onBack: () => void }) => {
    const { t, i18n } = useTranslation(['campaigns', 'common']);
    const { getStatusStyle } = useStatusStyles();

    const campaignName = campaign?.Name;

    const { data: stats, loading: statsLoading, error: statsError } = useApiV4(
        campaignName ? `/statistics/campaigns/${encodeURIComponent(campaignName)}` : '',
        apiKey
    );

    const openRate = useMemo(() => {
        if (!stats || !stats.Delivered) return 0;
        return (stats.Opened / stats.Delivered) * 100;
    }, [stats]);

    const clickRate = useMemo(() => {
        if (!stats || !stats.Delivered) return 0;
        return (stats.Clicked / stats.Delivered) * 100;
    }, [stats]);

    if (!campaign) {
        return (
            <CenteredMessage>
                <div className="info-message warning">
                    <p>No campaign selected.</p>
                </div>
            </CenteredMessage>
        );
    }

    const statusStyle = getStatusStyle(campaign.Status);
    const content = campaign.Content?.[0];

    const fromString = content?.From || '';
    let fromName = content?.FromName;
    if (!fromName) {
        const angleBracketMatch = fromString.match(/(.*)<.*>/);
        if (angleBracketMatch) {
            fromName = angleBracketMatch[1].trim().replace(/"/g, '');
        }
    }

    const campaignStats = [
        { label: t('delivered'), value: stats?.Delivered },
        { label: t('opened'), value: stats?.Opened },
        { label: t('clicked'), value: stats?.Clicked },
        { label: t('unsubscribed', { ns: 'common' }), value: stats?.Unsubscribed },
        { label: t('complaints', { ns: 'common' }), value: stats?.Complaints },
        { label: t('bounced', { ns: 'common' }), value: stats?.Bounced },
    ];

    return (
        <div className="campaign-report-container">
            <div className="campaign-detail-header">
                <button className="btn btn-secondary" onClick={onBack}>
                    {i18n.dir() === 'rtl' ? (
                        <>
                            <span>{t('campaigns')}</span>
                            <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                        </>
                    ) : (
                        <>
                            <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                            <span>{t('campaigns')}</span>
                        </>
                    )}
                </button>
                <h2 style={{ flexGrow: 1, wordBreak: 'break-all' }}>{campaign.Name}</h2>
                <Badge text={statusStyle.text} type={statusStyle.type} iconPath={statusStyle.iconPath} />
            </div>

            {statsLoading && <CenteredMessage><Loader /></CenteredMessage>}
            {statsError && <ErrorMessage error={statsError} />}

            {stats && (
                <>
                    <div className="campaign-detail-kpi-grid">
                        <div className="card">
                            <div className="card-header"><h3>{t('openRate', { ns: 'common' })}</h3></div>
                            <div className="card-body">
                                <span className="kpi-value">{openRate.toFixed(1)}%</span>
                                <ProgressBar percentage={openRate} />
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-header"><h3>{t('clickRate', { ns: 'common' })}</h3></div>
                            <div className="card-body">
                                <span className="kpi-value">{clickRate.toFixed(1)}%</span>
                                <ProgressBar percentage={clickRate} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="card final-summary-container">
                        <h3>{t('performance')}</h3>
                        <dl className="final-summary-grid">
                            <SummaryItem label={t('sent')} value={formatDateForDisplay(campaign.DateSent, i18n.language)} />
                            <SummaryItem label={t('subject', {ns: 'sendEmail'})} value={content?.Subject} />
                            <SummaryItem label={t('from')} value={content?.From} />
                            <SummaryItem label={t('recipients', {ns: 'common'})} value={stats.Recipients?.toLocaleString(i18n.language)} />

                            <dt className="separator"></dt><dd className="separator"></dd>

                            {campaignStats.map(stat => (
                                <SummaryItem key={stat.label} label={stat.label} value={stat.value?.toLocaleString(i18n.language)} />
                            ))}
                        </dl>
                    </div>
                </>
            )}

        </div>
    );
};

export default CampaignDetailView;