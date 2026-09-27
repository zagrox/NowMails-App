
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetchV4 } from '../api/elasticEmail';
import useApiV4 from '../hooks/useApiV4';
import { useToast } from '../contexts/ToastContext';
import Step1SelectType from '../components/send_wizard/Step1SelectType';
import Step2Recipients from '../components/send_wizard/Step2Recipients';
import Step3Content from '../components/send_wizard/Step3Content';
import Step4Settings from '../components/send_wizard/Step4Settings';
import Step5Sending from '../components/send_wizard/Step5Sending';
import Icon, { ICONS } from '../components/Icon';

const cleanDomain = (domainStr: string) => {
    if (!domainStr) return '';
    const match = domainStr.match(/^([a-zA-Z0-9.-]+)/);
    return match ? match[0] : domainStr;
};

const MarketingView = ({ apiKey, setView, campaignToLoad }: { apiKey: string, setView: (view: string, data?: any) => void, campaignToLoad?: any }) => {
    const { t } = useTranslation(['send-wizard', 'sendEmail', 'common']);
    const { addToast } = useToast();
    const [step, setStep] = useState(1);
    const [maxStep, setMaxStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { data: domains, loading: domainsLoading } = useApiV4('/domains', apiKey, {});

    const [campaignData, setCampaignData] = useState({
        type: '',
        recipientTarget: null as 'all' | 'list' | 'segment' | null,
        recipients: { listNames: [] as string[], segmentNames: [] as string[] },
        recipientCount: null as number | null,
        isCountLoading: false,
        template: null as string | null,
        fromName: '',
        fromEmailPrefix: 'mailer',
        selectedDomain: '',
        subject: '',
        enableReplyTo: false,
        replyToName: '',
        replyToPrefix: '',
        replyToDomain: '',
        campaignName: '',
        sendTimeOptimization: false,
        deliveryOptimization: 'None',
        enableSendTimeOptimization: false,
        trackOpens: true,
        trackClicks: true,
        utmEnabled: false,
        utm: {
            Source: '',
            Medium: '',
            Campaign: '',
            Content: '',
        },
        sendAction: 'schedule',
        scheduleDateTime: ''
    });

    const updateData = useCallback((newData: Partial<typeof campaignData>) => {
        setCampaignData(prev => ({ ...prev, ...newData }));
    }, []);

    const verifiedDomains = useMemo(() => {
        if (!Array.isArray(domains)) return [];
        return domains.filter(d => String(d.Spf).toLowerCase() === 'true' && String(d.Dkim).toLowerCase() === 'true');
    }, [domains]);

    const verifiedDomainsWithDefault = useMemo(() => {
        if (!Array.isArray(domains)) return [];
        return domains
            .filter(d => String(d.Spf).toLowerCase() === 'true' && String(d.Dkim).toLowerCase() === 'true')
            .map(d => ({
                domain: cleanDomain(d.Domain),
                defaultSender: d.DefaultSender
            }));
    }, [domains]);

    useEffect(() => {
        if (campaignToLoad && !domainsLoading) {
            const loadedContent = campaignToLoad.Content?.[0] || {};
            const loadedRecipients = campaignToLoad.Recipients || {};
            const loadedOptions = campaignToLoad.Options || {};

            let recipientTarget: 'all' | 'list' | 'segment' | null = null;
            if (loadedRecipients.ListNames?.length > 0) {
                recipientTarget = 'list';
            } else if (loadedRecipients.SegmentNames?.includes('All Contacts')) {
                recipientTarget = 'all';
            } else if (loadedRecipients.SegmentNames?.length > 0) {
                recipientTarget = 'segment';
            } else if (campaignToLoad.Status?.toLowerCase() === 'draft' && Object.keys(loadedRecipients).length === 0) {
                recipientTarget = 'all';
            }

            const fromString = loadedContent.From || '';
            let fromName = loadedContent.FromName || '';
            let fromEmail = fromString;

            if (!fromName) {
                const angleBracketMatch = fromString.match(/(.*)<(.*)>/);
                if (angleBracketMatch && angleBracketMatch.length === 3) {
                    fromName = angleBracketMatch[1].trim().replace(/"/g, '');
                    fromEmail = angleBracketMatch[2].trim();
                }
            }
            
            const isEmailValid = fromEmail && fromEmail.includes('@') && !fromEmail.endsWith('@');
            const [prefix, domainPart] = isEmailValid ? fromEmail.split('@') : ['', ''];
            const isDomainVerified = verifiedDomainsWithDefault.some(d => d.domain === domainPart);
            
            let finalFromName = fromName;
            let finalPrefix = 'mailer';
            let finalDomain = '';

            if (isEmailValid && isDomainVerified) {
                finalDomain = domainPart;
                finalPrefix = prefix;
            } else {
                if (verifiedDomainsWithDefault.length > 0) {
                    const firstDomain = verifiedDomainsWithDefault[0];
                    finalDomain = firstDomain.domain;
                    const defaultSender = firstDomain.defaultSender;
                    const defaultMatch = defaultSender?.match(/(.*)<(.*)>/);
                    if (defaultMatch) {
                        if (!finalFromName) finalFromName = defaultMatch[1].trim().replace(/"/g, '');
                        finalPrefix = defaultMatch[2].trim().split('@')[0] || 'mailer';
                    } else if (defaultSender) {
                        finalPrefix = defaultSender.trim().split('@')[0] || 'mailer';
                    }
                }
            }

            let replyToName = '';
            let replyToPrefix = '';
            let replyToDomain = '';
            if (loadedContent.ReplyTo) {
                const replyToString = loadedContent.ReplyTo;
                let rName = '';
                let rEmail = '';

                const replyToMatch = replyToString.match(/(.*)<(.*)>/);
                if (replyToMatch) {
                    rName = replyToMatch[1].trim().replace(/"/g, '');
                    rEmail = replyToMatch[2].trim();
                } else {
                    rEmail = replyToString.trim();
                }

                const [rPrefix, rDomain] = rEmail.includes('@') ? rEmail.split('@') : ['', ''];
                replyToName = rName;
                replyToPrefix = rPrefix;
                if (verifiedDomainsWithDefault.some(d => d.domain === rDomain)) {
                    replyToDomain = rDomain;
                } else if (verifiedDomainsWithDefault.length > 0) {
                    replyToDomain = verifiedDomainsWithDefault[0].domain;
                }
            }


            const newCampaignData = {
                type: 'regular',
                recipientTarget,
                recipients: {
                    listNames: loadedRecipients.ListNames || [],
                    segmentNames: loadedRecipients.SegmentNames || [],
                },
                template: loadedContent.TemplateName || null,
                fromName: finalFromName,
                fromEmailPrefix: finalPrefix,
                selectedDomain: finalDomain,
                subject: loadedContent.Subject || '',
                enableReplyTo: !!loadedContent.ReplyTo,
                replyToName,
                replyToPrefix,
                replyToDomain,
                campaignName: campaignToLoad.Name || '',
                trackOpens: loadedOptions.TrackOpens !== false,
                trackClicks: loadedOptions.TrackClicks !== false,
                sendTimeOptimization: loadedOptions.DeliveryOptimization !== 'None' || loadedOptions.EnableSendTimeOptimization,
                deliveryOptimization: loadedOptions.DeliveryOptimization || 'None',
                enableSendTimeOptimization: loadedOptions.EnableSendTimeOptimization || false,
                utmEnabled: !!loadedContent.Utm,
                utm: loadedContent.Utm || { Source: '', Medium: '', Campaign: '', Content: '' },
            };

            setCampaignData(prev => ({ ...prev, ...newCampaignData }));
            setStep(2);
            setMaxStep(5);
        } else if (!campaignToLoad && verifiedDomainsWithDefault.length > 0) {
            const firstDomain = verifiedDomainsWithDefault[0];
            let fromName = '';
            let prefix = 'mailer';
            if (firstDomain.defaultSender) {
                const defaultMatch = firstDomain.defaultSender.match(/(.*)<(.*)>/);
                if (defaultMatch) {
                    fromName = defaultMatch[1].trim().replace(/"/g, '');
                    prefix = defaultMatch[2].trim().split('@')[0] || 'mailer';
                } else {
                    prefix = firstDomain.defaultSender.trim().split('@')[0] || 'mailer';
                }
            }
            updateData({
                selectedDomain: firstDomain.domain,
                replyToDomain: firstDomain.domain,
                fromEmailPrefix: prefix,
                fromName: fromName,
            });
        }
    }, [campaignToLoad, verifiedDomains, domainsLoading, verifiedDomainsWithDefault, updateData]);


    const nextStep = () => setStep(s => {
        const next = s + 1;
        setMaxStep(ms => Math.max(ms, next));
        return next;
    });
    const prevStep = () => setStep(s => s - 1);
    const goToStep = (targetStep: number) => {
        if (targetStep <= maxStep) {
            setStep(targetStep);
        }
    };
    const goToDashboard = () => setView('Dashboard');

    const stepsInfo = [
        { number: 1, title: t('selectCampaignType') },
        { number: 2, title: t('selectAudience') },
        { number: 3, title: t('designContent') },
        { number: 4, title: t('campaignSettings') },
        { number: 5, title: t('reviewAndSend') },
    ];

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const action = campaignData.sendAction === 'later' ? 'draft' : 'send';
    
        try {
            if (action === 'send') {
                const isRecipientSelected =
                    campaignData.recipientTarget === 'all' ||
                    (campaignData.recipientTarget === 'list' && campaignData.recipients.listNames.length > 0) ||
                    (campaignData.recipientTarget === 'segment' && campaignData.recipients.segmentNames.length > 0);
    
                if (!isRecipientSelected) {
                    throw new Error(t('selectRecipientsToSend', { ns: 'sendEmail' }));
                }
            }
    
            const fromEmail = `${campaignData.fromEmailPrefix}@${campaignData.selectedDomain}`;
            const fromName = campaignData.fromName?.trim() || '';
            const combinedFrom = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

            let combinedReplyTo = '';
            if (campaignData.enableReplyTo && campaignData.replyToPrefix && campaignData.replyToDomain) {
                const rEmail = `${campaignData.replyToPrefix}@${campaignData.replyToDomain}`;
                combinedReplyTo = campaignData.replyToName.trim() ? `${campaignData.replyToName.trim()} <${rEmail}>` : rEmail;
            } else if (combinedFrom) {
                combinedReplyTo = combinedFrom;
            }
    
            const contentPayload = {
                From: combinedFrom,
                ReplyTo: combinedReplyTo,
                Subject: campaignData.subject || undefined,
                TemplateName: campaignData.template || undefined,
                Utm: campaignData.utmEnabled ? campaignData.utm : undefined,
                Body: null
            };
    
            const optionsPayload = {
                TrackOpens: campaignData.trackOpens,
                TrackClicks: campaignData.trackClicks,
                DeliveryOptimization: campaignData.sendTimeOptimization ? campaignData.deliveryOptimization : 'None',
                EnableSendTimeOptimization: campaignData.sendTimeOptimization ? campaignData.enableSendTimeOptimization : false,
                ScheduleFor: (action === 'send' && campaignData.sendAction === 'schedule' && campaignData.scheduleDateTime)
                    ? new Date(campaignData.scheduleDateTime).toISOString()
                    : undefined,
            };
    
            const finalRecipients: { ListNames: string[]; SegmentNames: string[] } = { ListNames: [], SegmentNames: [] };
            switch (campaignData.recipientTarget) {
                case 'list':
                    finalRecipients.ListNames = campaignData.recipients.listNames || [];
                    break;
                case 'segment':
                    finalRecipients.SegmentNames = campaignData.recipients.segmentNames || [];
                    break;
                case 'all':
                    finalRecipients.SegmentNames = ['All Contacts'];
                    break;
                default:
                    if (action === 'draft') {
                        finalRecipients.ListNames = campaignData.recipients.listNames || [];
                        finalRecipients.SegmentNames = campaignData.recipients.segmentNames || [];
                    }
                    break;
            }
    
            const payload = {
                Name: campaignData.campaignName || undefined,
                Status: action === 'send' ? 'Active' : 'Draft',
                Content: [contentPayload],
                Recipients: finalRecipients,
                Options: optionsPayload,
            };
    
            const method = campaignToLoad ? 'PUT' : 'POST';
            const endpoint = campaignToLoad ? `/campaigns/${encodeURIComponent(campaignToLoad.Name)}` : '/campaigns';
    
            await apiFetchV4(endpoint, apiKey, { method, body: JSON.parse(JSON.stringify(payload)) });
    
            addToast(payload.Status === 'Draft' ? t('draftSavedSuccess', { ns: 'sendEmail' }) : t('emailSentSuccess', { ns: 'sendEmail' }), 'success');
            setView('Campaigns');
    
        } catch (err: any) {
            const errorKey = action === 'draft' ? 'draftSaveError' : 'emailSentError';
            addToast(t(errorKey, { ns: 'sendEmail', error: err.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // FIX: A `payloadForDisplay` prop was missing for the `Step5Sending` component. This `useMemo` hook constructs the necessary payload from the current campaign data and formats it as a JSON string for display, resolving the TypeScript error.
    const payloadForDisplay = useMemo(() => {
        const action = campaignData.sendAction === 'later' ? 'draft' : 'send';
        const isRecipientSelected =
            campaignData.recipientTarget === 'all' ||
            (campaignData.recipientTarget === 'list' && campaignData.recipients.listNames.length > 0) ||
            (campaignData.recipientTarget === 'segment' && campaignData.recipients.segmentNames.length > 0);
        
        const fromEmail = `${campaignData.fromEmailPrefix}@${campaignData.selectedDomain}`;
        const fromName = campaignData.fromName?.trim() || '';
        const combinedFrom = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

        let combinedReplyTo = '';
        if (campaignData.enableReplyTo && campaignData.replyToPrefix && campaignData.replyToDomain) {
            const rEmail = `${campaignData.replyToPrefix}@${campaignData.replyToDomain}`;
            combinedReplyTo = campaignData.replyToName.trim() ? `${campaignData.replyToName.trim()} <${rEmail}>` : rEmail;
        } else if (combinedFrom) {
            combinedReplyTo = combinedFrom;
        }

        const contentPayload = {
            From: combinedFrom,
            ReplyTo: combinedReplyTo,
            Subject: campaignData.subject || undefined,
            TemplateName: campaignData.template || undefined,
            Utm: campaignData.utmEnabled ? campaignData.utm : undefined,
            Body: null
        };

        const optionsPayload = {
            TrackOpens: campaignData.trackOpens,
            TrackClicks: campaignData.trackClicks,
            DeliveryOptimization: campaignData.sendTimeOptimization ? campaignData.deliveryOptimization : 'None',
            EnableSendTimeOptimization: campaignData.sendTimeOptimization ? campaignData.enableSendTimeOptimization : false,
            ScheduleFor: (action === 'send' && campaignData.sendAction === 'schedule' && campaignData.scheduleDateTime)
                ? new Date(campaignData.scheduleDateTime).toISOString()
                : undefined,
        };

        const finalRecipients: { ListNames: string[]; SegmentNames: string[] } = { ListNames: [], SegmentNames: [] };
        switch (campaignData.recipientTarget) {
            case 'list':
                finalRecipients.ListNames = campaignData.recipients.listNames || [];
                break;
            case 'segment':
                finalRecipients.SegmentNames = campaignData.recipients.segmentNames || [];
                break;
            case 'all':
                finalRecipients.SegmentNames = ['All Contacts'];
                break;
            default:
                if (action === 'draft') {
                    finalRecipients.ListNames = campaignData.recipients.listNames || [];
                    finalRecipients.SegmentNames = campaignData.recipients.segmentNames || [];
                }
                break;
        }

        const payload = {
            Name: campaignData.campaignName || undefined,
            Status: action === 'send' && isRecipientSelected ? 'Active' : 'Draft',
            Content: [contentPayload],
            Recipients: finalRecipients,
            Options: optionsPayload,
        };

        const cleanedPayload = JSON.parse(JSON.stringify(payload));
        return JSON.stringify(cleanedPayload, null, 2);
    }, [campaignData]);

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return <Step1SelectType onNext={nextStep} onBack={goToDashboard} data={campaignData} updateData={updateData} />;
            case 2:
                return <Step2Recipients onNext={nextStep} onBack={prevStep} data={campaignData} updateData={updateData} apiKey={apiKey} />;
            case 3:
                return <Step3Content onNext={nextStep} onBack={prevStep} data={campaignData} updateData={updateData} apiKey={apiKey} setView={setView} domains={verifiedDomainsWithDefault} domainsLoading={domainsLoading} />;
            case 4:
                return <Step4Settings onNext={nextStep} onBack={prevStep} data={campaignData} updateData={updateData} />;
            case 5:
                return <Step5Sending onSubmit={handleSubmit} onBack={prevStep} data={campaignData} updateData={updateData} apiKey={apiKey} isSubmitting={isSubmitting} payloadForDisplay={payloadForDisplay} />;
            default:
                return <Step1SelectType onNext={nextStep} onBack={goToDashboard} data={campaignData} updateData={updateData} />;
        }
    };

    return (
        <div className="wizard-layout-container">
            <aside className="wizard-sidebar">
                <div className="wizard-sidebar-header">
                    <h4>{t('campaignSteps')}</h4>
                </div>
                <div className="wizard-sidebar-steps">
                    {stepsInfo.map(({ number, title }) => {
                        const isCompleted = number < step;
                        const isActive = number === step;
                        const isNavigable = number <= maxStep;

                        let statusClass = '';
                        if (isActive) statusClass = 'active';
                        else if (isCompleted) statusClass = 'completed';

                        return (
                            <button
                                key={number}
                                className={`wizard-sidebar-step ${statusClass}`}
                                onClick={() => goToStep(number)}
                                disabled={!isNavigable}
                                aria-current={isActive ? 'step' : undefined}
                            >
                                <div className="wizard-step-number">
                                    {isCompleted ? <Icon>{ICONS.CHECK}</Icon> : <span>{number}</span>}
                                </div>
                                <span className="wizard-step-title">{title}</span>
                            </button>
                        );
                    })}
                </div>
            </aside>
            <main className="wizard-content">
                {renderStepContent()}
            </main>
        </div>
    );
};

export default MarketingView;
