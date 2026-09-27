import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import WizardLayout from './WizardLayout';
import Icon, { ICONS } from '../Icon';
import useApiV4 from '../../hooks/useApiV4';
import useApi from '../../views/useApi';
import Loader from '../Loader';
import { AppActions } from '../../config/actions';

const SummaryItem = ({ label, value }: { label: string, value: React.ReactNode }) => {
    if (!value && value !== 0) return null;
    return (
        <>
            <dt>{label}</dt>
            <dd style={{ textAlign: 'right', wordBreak: 'break-all' }}>{value}</dd>
        </>
    );
};

const Step5Sending = ({ onSubmit, onBack, data, updateData, apiKey, isSubmitting, payloadForDisplay }: { onSubmit: () => void; onBack: () => void; data: any; updateData: (d: any) => void; apiKey: string; isSubmitting: boolean; payloadForDisplay: string; }) => {
    const { t, i18n } = useTranslation(['send-wizard', 'sendEmail', 'common', 'dashboard']);
    const { data: domains, loading: domainsLoading } = useApiV4('/domains', apiKey, {});
    const { data: accountData, loading: balanceLoading } = useApi('/account/load', apiKey, {}, apiKey ? 1 : 0);

    const userBalance = accountData?.emailcredits ?? 0;
    const creditsNeeded = data.recipientCount || 0;
    const hasEnoughCredits = userBalance >= creditsNeeded;

    const isSendingAction = data.sendAction === 'schedule' || data.sendAction === 'now';
    const isSubmitDisabled = (isSendingAction && !hasEnoughCredits) || domainsLoading;

    const nextAction = data.sendAction === 'later'
        ? AppActions.SAVE_MARKETING_DRAFT
        : AppActions.SEND_MARKETING_CAMPAIGN;

    const defaultFromEmail = useMemo(() => {
        if (!Array.isArray(domains)) return '................@.................';

        const verifiedDomains = domains.filter(d =>
            String(d.Spf).toLowerCase() === 'true' &&
            String(d.Dkim).toLowerCase() === 'true'
        );

        if (verifiedDomains.length > 0) {
            return verifiedDomains[0].DefaultSender || `mailer@${verifiedDomains[0].Domain}`;
        }

        return 'no-verified-domain@found.com';
    }, [domains]);

    useEffect(() => {
        if (data.sendAction === 'schedule' && !data.scheduleDateTime) {
            const now = new Date();
            now.setMinutes(now.getMinutes() + 5); // Default to 5 mins in the future
            now.setSeconds(0);
            now.setMilliseconds(0);
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const HH = String(now.getHours()).padStart(2, '0');
            const MM = String(now.getMinutes()).padStart(2, '0');
            updateData({ scheduleDateTime: `${yyyy}-${mm}-${dd}T${HH}:${MM}` });
        }
    }, [data.sendAction, data.scheduleDateTime, updateData]);

    const handleSelect = (action: string) => {
        updateData({ sendAction: action });
    };

    const trackingStatus = [data.trackOpens && t('trackOpens', { ns: 'sendEmail' }), data.trackClicks && t('trackClicks', { ns: 'sendEmail' })].filter(Boolean).join(' & ') || t('disabled');
    
    let optimizationStatus = t('disabled');
    if (data.sendTimeOptimization) {
        if (data.deliveryOptimization === 'ToEngagedFirst') {
            optimizationStatus = t('sendToEngagedFirst', { ns: 'sendEmail' });
        } else if (data.enableSendTimeOptimization) {
            optimizationStatus = t('sendAtOptimalTime', { ns: 'sendEmail' });
        }
    }

    let sendTimeStatus = '';
    if (data.sendAction === 'now') {
        sendTimeStatus = t('immediately');
    } else if (data.sendAction === 'schedule' && data.scheduleDateTime) {
        try {
            sendTimeStatus = new Date(data.scheduleDateTime).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
        } catch (e) {
            sendTimeStatus = t('invalidDate');
        }
    } else if (data.sendAction === 'later') {
        sendTimeStatus = t('savedAsDraft');
    }
    
    const recipientValueStyle: React.CSSProperties = {
        fontWeight: 'bold',
        color: hasEnoughCredits ? 'var(--secondary-color)' : 'var(--danger-color)',
    };


    return (
        <WizardLayout
            title={t('reviewAndSend')}
            onNext={onSubmit}
            onBack={onBack}
            isLastStep
            isSubmitting={isSubmitting}
            nextDisabled={isSubmitDisabled}
            nextAction={nextAction}
        >
            <div className="wizard-step-intro">
                <Icon>{ICONS.VERIFY}</Icon>
                <p>{t('reviewAndSend_desc')}</p>
            </div>
            <div className="sending-options-list">
                <label
                    htmlFor="sendAction-schedule"
                    className={`selection-card sending-option-card ${data.sendAction === 'schedule' ? 'selected' : ''} ${!hasEnoughCredits ? 'disabled' : ''}`}
                >
                    <input
                        type="radio"
                        id="sendAction-schedule"
                        name="sendAction"
                        value="schedule"
                        checked={data.sendAction === 'schedule'}
                        onChange={() => handleSelect('schedule')}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        disabled={!hasEnoughCredits}
                    />
                    <div className="sending-option-card-content">
                        <Icon className="sending-option-card-icon">{ICONS.CALENDAR}</Icon>
                        <div className="sending-option-card-details">
                            <h4 className="sending-option-card-title">{t('schedule', { ns: 'sendEmail' })}</h4>
                            {data.sendAction === 'schedule' && (
                                <input
                                    type="datetime-local"
                                    className="sending-option-datetime-input"
                                    value={data.scheduleDateTime}
                                    onChange={(e) => updateData({ scheduleDateTime: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}
                        </div>
                    </div>
                </label>
                <label
                    htmlFor="sendAction-now"
                    className={`selection-card sending-option-card ${data.sendAction === 'now' ? 'selected' : ''} ${!hasEnoughCredits ? 'disabled' : ''}`}
                >
                    <input
                        type="radio"
                        id="sendAction-now"
                        name="sendAction"
                        value="now"
                        checked={data.sendAction === 'now'}
                        onChange={() => handleSelect('now')}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        disabled={!hasEnoughCredits}
                    />
                    <div className="sending-option-card-content">
                        <Icon className="sending-option-card-icon">{ICONS.SEND_EMAIL}</Icon>
                        <h4 className="sending-option-card-title">{t('sendNow', { ns: 'sendEmail' })}</h4> 
                    </div>
                </label>
                <label
                    htmlFor="sendAction-later"
                    className={`selection-card sending-option-card ${data.sendAction === 'later' ? 'selected' : ''}`}
                >
                    <input
                        type="radio"
                        id="sendAction-later"
                        name="sendAction"
                        value="later"
                        checked={data.sendAction === 'later'}
                        onChange={() => handleSelect('later')}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <div className="sending-option-card-content">
                        <Icon className="sending-option-card-icon">{ICONS.SAVE_CHANGES}</Icon>
                        <h4 className="sending-option-card-title">{t('saveForLater')}</h4>
                    </div>
                </label>
            </div>

            <div className="final-summary">
                <h4 style={{marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem'}}>{t('finalSummary')}</h4>
                <dl className="contact-details-grid">
                    <SummaryItem label={t('fromName', { ns: 'sendEmail' })} value={data.fromName} />
                    <SummaryItem label={t('subject', { ns: 'sendEmail' })} value={data.subject} />
                    <SummaryItem 
                        label={t('recipients')} 
                        value={
                            balanceLoading || data.isCountLoading ? <Loader /> : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                                    <span style={recipientValueStyle}>
                                        {data.recipientCount?.toLocaleString(i18n.language)}
                                    </span>
                                    {!hasEnoughCredits && (
                                        <small style={{ color: 'var(--danger-color)', marginTop: '0.25rem' }}>
                                            {t('insufficientFunds')}
                                        </small>
                                    )}
                                </div>
                            )
                        } 
                    />
                    <SummaryItem label={t('fromEmail')} value={domainsLoading ? t('loading') : defaultFromEmail} />
                    <SummaryItem label={t('replyTo')} value={data.enableReplyTo ? data.replyTo : null} />
                    
                    <dt className="grid-separator"></dt>
                    
                    <SummaryItem label={t('campaignName', { ns: 'sendEmail' })} value={data.campaignName} />
                    <SummaryItem label={t('template', { ns: 'sendEmail' })} value={data.template} />
                    <SummaryItem label={t('sendTime')} value={sendTimeStatus} />
                    <SummaryItem label={t('tracking', { ns: 'sendEmail' })} value={trackingStatus} />
                    <SummaryItem label={t('timeOptimization')} value={optimizationStatus} />
                </dl>
            </div>

            <div className="card" style={{ marginTop: '2rem' }}>
                <div className="card-header">
                    <h3>API Payload for Debugging</h3>
                </div>
                <div className="card-body" style={{padding: 0}}>
                    <pre style={{
                        background: 'var(--subtle-background)',
                        padding: '1rem',
                        margin: 0,
                        borderRadius: '0 0 8px 8px',
                        fontSize: '0.8rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        maxHeight: '400px',
                        overflowY: 'auto'
                    }}><code>{payloadForDisplay}</code></pre>
                </div>
            </div>
        </WizardLayout>
    );
};

export default Step5Sending;