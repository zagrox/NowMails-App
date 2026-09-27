import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { apiFetchV4, apiFetch } from '../api/elasticEmail';
import { List, Segment, Template } from '../api/types';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import CenteredMessage from '../components/CenteredMessage';
import Modal from '../components/Modal';
import MultiSelectSearch from '../components/MultiSelectSearch';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';

const cleanDomain = (domainStr: string) => {
    if (!domainStr) return '';
    const match = domainStr.match(/^([a-zA-Z0-9.-]+)/);
    return match ? match[0] : domainStr;
};

const emptyContent = { From: '', FromName: '', ReplyTo: '', Subject: '', TemplateName: '', Body: null, Utm: null };
const initialCampaignState = {
    Name: '',
    Content: [JSON.parse(JSON.stringify(emptyContent))],
    Recipients: { ListNames: [], SegmentNames: [] },
    Options: { 
        TrackOpens: true, 
        TrackClicks: true, 
        DeliveryOptimization: 'None',
        EnableSendTimeOptimization: false,
        ScheduleFor: null,
        TriggerFrequency: 0,
        TriggerCount: 0,
    }
};

const decodeState = (base64: string): string => {
    const binary_string = window.atob(base64);
    const bytes = new Uint8Array(binary_string.length);
    for (let i = 0; i < binary_string.length; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

const SendEmailView = ({ apiKey, setView, campaignToLoad }: { apiKey: string, setView: (view: string, data?: any) => void; campaignToLoad?: any }) => {
    const { t, i18n } = useTranslation(['sendEmail', 'templates', 'common', 'send-wizard', 'domains']);
    const { addToast } = useToast();
    
    const [isSending, setIsSending] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [activeContent, setActiveContent] = useState(0);
    const [recipientTarget, setRecipientTarget] = useState< 'list' | 'segment' | 'all' | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templateSearchTerm, setTemplateSearchTerm] = useState('');
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [isCountLoading, setIsCountLoading] = useState(false);
    const [campaign, setCampaign] = useState(JSON.parse(JSON.stringify(initialCampaignState)));
    const [segmentCounts, setSegmentCounts] = useState<Record<string, number | null>>({});
    const [enableReplyTo, setEnableReplyTo] = useState(false);

    // New state for replyTo composer
    const [replyToName, setReplyToName] = useState('');
    const [replyToPrefix, setReplyToPrefix] = useState('');
    const [replyToDomain, setReplyToDomain] = useState('');
    
    const { data: lists, loading: listsLoading } = useApiV4('/lists', apiKey, { limit: 1000 });
    const { data: segments, loading: segmentsLoading } = useApiV4('/segments', apiKey, {});
    const { data: domains, loading: domainsLoading } = useApiV4('/domains', apiKey, {});
    const { data: templates, loading: templatesLoading } = useApiV4(
        '/templates',
        apiKey,
        {
            limit: 1000,
            scopeType: 'Personal',
            templateTypes: 'RawHTML',
        }
    );

    const [fromEmailPrefix, setFromEmailPrefix] = useState('mailer');
    
    const listItems = useMemo(() => (Array.isArray(lists) ? lists : []).map((l: List) => ({ id: l.ListName, name: l.ListName })), [lists]);
    
    useEffect(() => {
        if (segments && Array.isArray(segments) && apiKey) {
            segments.forEach((seg: Segment) => {
                if (segmentCounts[seg.Name] === undefined) {
                    apiFetch('/contact/count', apiKey, { params: { rule: seg.Rule } })
                        .then(count => {
                            setSegmentCounts(prev => ({ ...prev, [seg.Name]: Number(count) }));
                        })
                        .catch(() => {
                            setSegmentCounts(prev => ({ ...prev, [seg.Name]: null }));
                        });
                }
            });
        }
    }, [segments, apiKey, segmentCounts]);

    const segmentItems = useMemo(() => {
        if (!Array.isArray(segments)) return [];
        return segments.map((s: Segment) => {
            const count = segmentCounts[s.Name];
            const nameWithCount = count !== null && count !== undefined
                ? `${s.Name} (${count.toLocaleString()})`
                : s.Name;
            return { id: s.Name, name: nameWithCount };
        });
    }, [segments, segmentCounts]);

    const verifiedDomainsWithDefault = useMemo(() => {
        if (!Array.isArray(domains)) return [];
        return domains
            .filter(d => String(d.Spf).toLowerCase() === 'true' && String(d.Dkim).toLowerCase() === 'true')
            .map(d => ({
                domain: cleanDomain(d.Domain),
                defaultSender: d.DefaultSender
            }));
    }, [domains]);

    const [selectedDomain, setSelectedDomain] = useState('');

    const handleValueChange = useCallback((section: 'Campaign' | 'Content' | 'Options', key: string, value: any, contentIndex: number = 0) => {
        setCampaign(prev => {
            if (section === 'Campaign') {
                return { ...prev, [key]: value };
            }
            if (section === 'Content') {
                const newContent = [...prev.Content];
                newContent[contentIndex] = { ...newContent[contentIndex], [key]: value };
                return { ...prev, Content: newContent };
            }
            if (section === 'Options') {
                return { ...prev, Options: { ...prev.Options, [key]: value } };
            }
            return prev;
        });
    }, []);

    useEffect(() => {
        const newFromEmail = selectedDomain ? `${fromEmailPrefix}@${selectedDomain}` : '';
        if (campaign.Content[activeContent].From !== newFromEmail) {
            handleValueChange('Content', 'From', newFromEmail, activeContent);
        }
    }, [fromEmailPrefix, selectedDomain, activeContent, handleValueChange, campaign.Content]);

    const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const domainName = e.target.value;
        setSelectedDomain(domainName);
        const domainInfo = verifiedDomainsWithDefault.find(d => d.domain === domainName);
        
        let prefix = 'mailer';
        let fromName = campaign.Content[0].FromName;

        if (domainInfo?.defaultSender) {
            const defaultSender = domainInfo.defaultSender;
            const defaultMatch = defaultSender.match(/(.*)<(.*)>/);
            if (defaultMatch) {
                if (!fromName) { 
                    handleValueChange('Content', 'FromName', defaultMatch[1].trim().replace(/"/g, ''));
                }
                prefix = defaultMatch[2].trim().split('@')[0];
            } else {
                prefix = defaultSender.trim().split('@')[0];
            }
        }
        setFromEmailPrefix(prefix);
    };
        
    const filteredTemplates = useMemo(() => {
        if (!Array.isArray(templates)) return [];
        return templates.filter((t: Template) => t.Name.toLowerCase().includes(templateSearchTerm.toLowerCase()));
    }, [templates, templateSearchTerm]);
    
    const resetForm = useCallback(() => {
        setCampaign(JSON.parse(JSON.stringify(initialCampaignState)));
        setRecipientTarget(null);
        setRecipientCount(null);
        setIsEditing(false);
        setSelectedDomain('');
        setFromEmailPrefix('mailer');
        setEnableReplyTo(false);
        setReplyToName('');
        setReplyToPrefix('');
        setReplyToDomain('');
    }, []);

    useEffect(() => {
        if (domainsLoading) {
            return; 
        }

        if (campaignToLoad) {
            setIsEditing(true);
            const loadedContent = campaignToLoad.Content?.[0] || {};
            
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

            if (isEmailValid && isDomainVerified) {
                setSelectedDomain(domainPart);
                setFromEmailPrefix(prefix);
            } else {
                if (verifiedDomainsWithDefault.length > 0) {
                    const firstDomain = verifiedDomainsWithDefault[0];
                    setSelectedDomain(firstDomain.domain);
                    const defaultSender = firstDomain.defaultSender;
                    const defaultMatch = defaultSender?.match(/(.*)<(.*)>/);
                    if (defaultMatch) {
                        if (!fromName) fromName = defaultMatch[1].trim().replace(/"/g, '');
                        setFromEmailPrefix(defaultMatch[2].trim().split('@')[0] || 'mailer');
                    } else if (defaultSender) {
                        setFromEmailPrefix(defaultSender.trim().split('@')[0] || 'mailer');
                    } else {
                        setFromEmailPrefix('mailer');
                    }
                } else {
                    setSelectedDomain('');
                    setFromEmailPrefix('');
                }
            }
            
            if (loadedContent.ReplyTo) {
                setEnableReplyTo(true);
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
                setReplyToName(rName);
                setReplyToPrefix(rPrefix);
                if (verifiedDomainsWithDefault.some(d => d.domain === rDomain)) {
                    setReplyToDomain(rDomain);
                }
            } else {
                setEnableReplyTo(false);
                setReplyToName('');
                setReplyToPrefix('');
                setReplyToDomain('');
            }

            const loadedOptions = campaignToLoad.Options || {};
            const loadedRecipients = campaignToLoad.Recipients || {};

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

            const mergedOptions = {
                ...initialCampaignState.Options,
                ...loadedOptions
            };

            setCampaign({
                Name: campaignToLoad.Name || '',
                Content: [{
                    ...emptyContent,
                    FromName: fromName,
                    Subject: loadedContent.Subject || '',
                    TemplateName: loadedContent.TemplateName || '',
                    Body: loadedContent.Body || null,
                    Utm: loadedContent.Utm || null
                }],
                Recipients: {
                    ListNames: loadedRecipients.ListNames || [],
                    SegmentNames: loadedRecipients.SegmentNames || [],
                },
                Options: mergedOptions
            });
            setRecipientTarget(recipientTarget);

        } else {
            resetForm();
            if (verifiedDomainsWithDefault.length > 0) {
                const firstDomain = verifiedDomainsWithDefault[0];
                setSelectedDomain(firstDomain.domain);
                setReplyToDomain(firstDomain.domain);
                const defaultSender = firstDomain.defaultSender;
                let fromName = '';
                let prefix = 'mailer';
                if (defaultSender) {
                    const defaultMatch = defaultSender.match(/(.*)<(.*)>/);
                    if (defaultMatch) {
                        fromName = defaultMatch[1].trim().replace(/"/g, '');
                        prefix = defaultMatch[2].trim().split('@')[0] || 'mailer';
                    } else {
                        prefix = defaultSender.trim().split('@')[0] || 'mailer';
                    }
                }
                setFromEmailPrefix(prefix);
                handleValueChange('Content', 'FromName', fromName);
            }
        }
    }, [campaignToLoad, domainsLoading, resetForm, verifiedDomainsWithDefault, handleValueChange]);

    useEffect(() => {
        const calculateCount = async () => {
            if (!apiKey) return;

            if (recipientTarget === 'all' || (recipientTarget === 'list' && campaign.Recipients.ListNames.length > 0)) {
                try {
                    let countResult: number | null = null;
                    if (recipientTarget === 'all') {
                        const count = await apiFetch('/contact/count', apiKey, { params: { allContacts: 'true' } });
                        countResult = Number(count);
                    } else { // 'list'
                        const counts = await Promise.all(
                            campaign.Recipients.ListNames.map(listName =>
                                apiFetch('/contact/count', apiKey, { params: { rule: `listname = '${listName.replace(/'/g, "''")}'` } })
                            )
                        );
                        countResult = counts.reduce((sum, count) => sum + Number(count), 0);
                    }
                    setRecipientCount(countResult);
                } catch (error) {
                    console.error("Failed to calculate recipient count:", error);
                    addToast(`Failed to get recipient count: ${(error as Error).message}`, 'error');
                    setRecipientCount(null);
                }
                return;
            }

            setIsCountLoading(false); 
            if (recipientTarget === 'segment' && campaign.Recipients.SegmentNames.length > 0) {
                const total = campaign.Recipients.SegmentNames.reduce((sum, segmentName) => {
                    const count = segmentCounts[segmentName];
                    return sum + (typeof count === 'number' ? count : 0);
                }, 0);
                setRecipientCount(total);
            } else {
                setRecipientCount(0); 
            }
        };

        const debounceTimer = setTimeout(() => {
            calculateCount();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [recipientTarget, campaign.Recipients.ListNames, campaign.Recipients.SegmentNames, apiKey, segmentCounts, addToast]);
    
    const handleSelectionChange = (selectedNames: string[], type: 'ListNames' | 'SegmentNames') => {
        setCampaign(prev => {
            const otherType = type === 'ListNames' ? 'SegmentNames' : 'ListNames';
            return {
                ...prev,
                Recipients: {
                    ...prev.Recipients,
                    [otherType]: [],
                    [type]: selectedNames,
                }
            }
        });
    };

    const isRecipientSelected = useMemo(() => (
        recipientTarget === 'all' ||
        (recipientTarget === 'list' && campaign.Recipients.ListNames.length > 0) ||
        (recipientTarget === 'segment' && campaign.Recipients.SegmentNames.length > 0)
    ), [recipientTarget, campaign.Recipients]);

    const handleSubmit = async (action: 'send' | 'draft') => {
        if (action !== 'draft' && !isRecipientSelected) {
            addToast(t('selectRecipientsToSend'), 'error');
            return;
        }

        setIsSending(true);

        const content = campaign.Content[0];
        const fromEmail = content.From || '';
        const fromName = content.FromName?.trim() || '';
        const combinedFrom = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

        let combinedReplyTo = '';
        if (enableReplyTo && replyToPrefix && replyToDomain) {
            const rEmail = `${replyToPrefix}@${replyToDomain}`;
            combinedReplyTo = replyToName.trim() ? `${replyToName.trim()} <${rEmail}>` : rEmail;
        } else if (combinedFrom) {
            // Default ReplyTo to From address if not otherwise specified and From is set
            combinedReplyTo = combinedFrom;
        }

        const contentPayload = {
            From: combinedFrom,
            ReplyTo: combinedReplyTo,
            Subject: content.Subject || undefined,
            TemplateName: content.TemplateName || undefined,
        };

        const finalRecipients: { ListNames: string[]; SegmentNames: string[] } = { ListNames: [], SegmentNames: [] };
        switch (recipientTarget) {
            case 'list':
                finalRecipients.ListNames = campaign.Recipients.ListNames || [];
                break;
            case 'segment':
                finalRecipients.SegmentNames = campaign.Recipients.SegmentNames || [];
                break;
            case 'all':
                finalRecipients.SegmentNames = ['All Contacts'];
                break;
            default:
                if (action === 'draft') {
                    finalRecipients.ListNames = campaign.Recipients.ListNames || [];
                    finalRecipients.SegmentNames = campaign.Recipients.SegmentNames || [];
                }
                break;
        }

        const payload = {
            Name: campaign.Name || undefined,
            Status: action === 'send' && isRecipientSelected ? 'Active' : 'Draft',
            Content: [contentPayload],
            Recipients: finalRecipients,
            Options: campaign.Options
        };

        try {
            const method = isEditing ? 'PUT' : 'POST';
            const endpoint = isEditing ? `/campaigns/${encodeURIComponent(campaignToLoad.Name)}` : '/campaigns';

            await apiFetchV4(endpoint, apiKey, { method, body: JSON.parse(JSON.stringify(payload)) });
            
            addToast(payload.Status === 'Draft' ? t('draftSavedSuccess') : t('emailSentSuccess'), 'success');
            setView('Campaigns');
        } catch (err: any) {
            addToast(t('emailSentError', { error: err.message }), 'error');
        } finally {
            setIsSending(false);
        }
    };
    
    const handleSelectTemplate = async (templateName: string) => {
        setIsTemplateModalOpen(false);
        setIsSending(true);
        try {
            const fullTemplate = await apiFetchV4(`/templates/${encodeURIComponent(templateName)}`, apiKey);
            const htmlContent = fullTemplate.Body?.[0]?.Content;
            let fromName = '';
            let subject = fullTemplate.Subject || '';
    
            if (htmlContent) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');
                const stateContainer = doc.getElementById('mailzila-template-state');
                const base64State = stateContainer?.getAttribute('data-state');
    
                if (base64State) {
                    try {
                        const jsonState = decodeState(base64State);
                        const state = JSON.parse(jsonState);
                        fromName = state.fromName || '';
                        subject = state.subject || fullTemplate.Subject || '';
                    } catch (e) {
                        console.error("Failed to parse template state from HTML.", e);
                    }
                }
            }
            
            setCampaign(prev => ({
                ...prev,
                Content: prev.Content.map((item, idx) => 
                    idx === activeContent ? { 
                        ...item, 
                        TemplateName: fullTemplate.Name,
                        Subject: subject,
                        FromName: fromName
                    } : item
                )
            }));
    
        } catch (err: any) {
            addToast(`Failed to load template: ${err.message}`, 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleGoToDomains = () => {
        sessionStorage.setItem('settings-tab', 'domains');
        setView('Settings');
    };

    const handleGoToBuilder = () => {
        setIsTemplateModalOpen(false);
        setView('Email Builder');
    };
    
    const currentContent = campaign.Content[activeContent] || {};

    const handleEnableReplyToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isEnabled = e.target.checked;
        setEnableReplyTo(isEnabled);
        if (!isEnabled) {
            setReplyToName('');
            setReplyToPrefix('');
            if (verifiedDomainsWithDefault.length > 0) {
                setReplyToDomain(verifiedDomainsWithDefault[0].domain);
            }
        }
    };
        
    if (domainsLoading) return <CenteredMessage><Loader /></CenteredMessage>;
    
    return (
        <div className="quick-send-container">
             <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title={t('templates')}>
                <div className="template-selector-modal">
                    <div className="search-bar" style={{marginBottom: '1rem'}}>
                        <Icon>{ICONS.SEARCH}</Icon>
                        <input
                            type="search"
                            placeholder={t('searchTemplatesPlaceholder')}
                            value={templateSearchTerm}
                            onChange={e => setTemplateSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="template-list-container">
                        {templatesLoading ? <Loader /> : (
                            !Array.isArray(templates) || templates.length === 0 ? (
                                <EmptyState
                                    icon={ICONS.ARCHIVE}
                                    title={t('noTemplatesFound', { ns: 'templates' })}
                                    message={t('noTemplatesFoundDesc', { ns: 'templates' })}
                                    ctaText={t('createTemplate', { ns: 'templates' })}
                                    onCtaClick={handleGoToBuilder}
                                />
                            ) : filteredTemplates.length > 0 ? (
                                filteredTemplates.map((template: Template) => (
                                    <button
                                        type="button"
                                        key={template.Name}
                                        className="template-list-item"
                                        onClick={() => handleSelectTemplate(template.Name)}
                                    >
                                        <span>{template.Name}</span>
                                        <small>{template.Subject || t('noSubject', { ns: 'campaigns' })}</small>
                                    </button>
                                ))
                            ) : (
                                <CenteredMessage>{t('noTemplatesForQuery', {query: templateSearchTerm, ns: 'templates'})}</CenteredMessage>
                            )
                        )}
                    </div>
                </div>
            </Modal>
            <div className="quick-send-header">
                 <h2>{t('quickSend')}</h2>
                 <p>{t('quickSendDesc')}</p>
            </div>
            <div className="quick-send-form">
                 <div className="card">
                    <div className="card-header">
                        <h3>{`1. ${t('campaignName')}`}</h3>
                    </div>
                    <div className="card-body">
                         <div className="form-group">
                            <label>{t('campaignNameHelpText')}</label>
                            <input
                                type="text"
                                value={campaign.Name}
                                onChange={(e) => handleValueChange('Campaign', 'Name', e.target.value)}
                                required
                                placeholder={t('campaignNamePlaceholder', { ns: 'send-wizard', defaultValue: 'e.g. Welcome to our app' })}
                            />
                        </div>
                    </div>
                </div>

                <div className="card card--overflow-visible">
                    <div className="card-header">
                        <h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span>2. {t('recipients', { ns: 'common' })}</span>
                                <span className="badge-total-recipients">
                                    {isCountLoading ? <Loader /> : (recipientCount !== null ? recipientCount.toLocaleString(i18n.language) : '0')}
                                </span>
                            </div>
                        </h3>
                    </div>
                    <div className="card-body">
                        <div className="form-group recipient-target-selector">
                            <label className="custom-radio"><input type="radio" name="rt" value="all" checked={recipientTarget === 'all'} onChange={() => setRecipientTarget('all')} /><span className="radio-checkmark"></span><span className="radio-label">{t('allContacts')}</span></label>
                            <label className="custom-radio"><input type="radio" name="rt" value="list" checked={recipientTarget === 'list'} onChange={() => setRecipientTarget('list')} /><span className="radio-checkmark"></span><span className="radio-label">{t('aList')}</span></label>
                            <label className="custom-radio"><input type="radio" name="rt" value="segment" checked={recipientTarget === 'segment'} onChange={() => setRecipientTarget('segment')} /><span className="radio-checkmark"></span><span className="radio-label">{t('aSegment')}</span></label>
                        </div>
                        {recipientTarget === 'list' && (
                            <div style={{marginTop: '1.5rem'}}>
                                <MultiSelectSearch
                                    items={listItems}
                                    selectedItems={campaign.Recipients.ListNames}
                                    onSelectionChange={(selected) => handleSelectionChange(selected, 'ListNames')}
                                    placeholder={t('chooseList')}
                                    loading={listsLoading}
                                />
                            </div>
                        )}
                         {recipientTarget === 'segment' && (
                            <div style={{marginTop: '1.5rem'}}>
                                <MultiSelectSearch
                                    items={segmentItems}
                                    selectedItems={campaign.Recipients.SegmentNames}
                                    onSelectionChange={(selected) => handleSelectionChange(selected, 'SegmentNames')}
                                    placeholder={t('chooseSegment')}
                                    loading={segmentsLoading}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3>{`3. ${t('subject')} / ${t('content')}`}</h3>
                    </div>
                    <div className="card-body" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                        <div className="form-group">
                            <label>{t('template')}</label>
                            {currentContent.TemplateName ? (
                                <div className="template-summary">
                                    <Icon>{ICONS.ARCHIVE}</Icon>
                                    <span>{currentContent.TemplateName}</span>
                                    <button type="button" className="btn btn-secondary" onClick={() => setIsTemplateModalOpen(true)}>{t('changeTemplate')}</button>
                                </div>
                            ) : (
                                <button type="button" className="btn-choose-template" onClick={() => setIsTemplateModalOpen(true)}>
                                    <Icon>{ICONS.ARCHIVE}</Icon>
                                    <span>{t('useTemplate')}</span>
                                </button>
                            )}
                        </div>

                        {currentContent.TemplateName && (
                            <>
                                 <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('fromName')}</label>
                                        <input type="text" value={currentContent.FromName} onChange={e => handleValueChange('Content', 'FromName', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('fromEmail')}</label>
                                        {verifiedDomainsWithDefault.length > 0 ? (
                                            <div className="from-email-composer">
                                                <input
                                                    type="text"
                                                    value={fromEmailPrefix}
                                                    onChange={e => setFromEmailPrefix(e.target.value.trim())}
                                                />
                                                <span className="from-email-at">@</span>
                                                <select value={selectedDomain} onChange={handleDomainChange}>
                                                    {verifiedDomainsWithDefault.map(d => (
                                                        <option key={d.domain} value={d.domain}>{d.domain}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="info-message warning">
                                                <p>{t('noVerifiedDomainsToSendError')}</p>
                                                <Button className="btn" onClick={handleGoToDomains}>{t('addDomainNow')}</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label className="custom-checkbox">
                                        <input type="checkbox" checked={enableReplyTo} onChange={handleEnableReplyToChange} />
                                        <span className="checkbox-checkmark"></span>
                                        <span className="checkbox-label" style={{ fontWeight: 'normal' }}>{t('setDifferentReplyTo', { ns: 'send-wizard' })}</span>
                                    </label>
                                </div>
                                {enableReplyTo && (
                                     <div className="form-grid">
                                        <div className="form-group">
                                            <label>{t('replyToName', {ns: 'send-wizard'})}</label>
                                            <input type="text" value={replyToName} onChange={e => setReplyToName(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('replyToEmail', {ns: 'send-wizard'})}</label>
                                            <div className="from-email-composer">
                                                <input
                                                    type="text"
                                                    value={replyToPrefix}
                                                    onChange={e => setReplyToPrefix(e.target.value.trim())}
                                                />
                                                <span className="from-email-at">@</span>
                                                <select value={replyToDomain} onChange={e => setReplyToDomain(e.target.value)}>
                                                    {verifiedDomainsWithDefault.map(d => (
                                                        <option key={d.domain} value={d.domain}>{d.domain}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="form-group">
                                    <label>{t('subject')}</label>
                                    <input type="text" value={currentContent.Subject} onChange={e => handleValueChange('Content', 'Subject', e.target.value)} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="quick-send-actions">
                    <p>{t('finalSummaryText', { template: currentContent.TemplateName || '...', count: recipientCount || 0 })}</p>
                    <div className="action-buttons">
                        <Button className="btn-secondary" onClick={() => handleSubmit('draft')} disabled={isSending}>
                            <Icon>{ICONS.SAVE_CHANGES}</Icon> <span>{t('saveAsDraft')}</span>
                        </Button>
                        <Button className="btn-primary" onClick={() => handleSubmit('send')} disabled={isSending || verifiedDomainsWithDefault.length === 0}>
                            {isSending ? <Loader /> : <><Icon>{ICONS.SEND_EMAIL}</Icon> <span>{t('sendNow')}</span></>}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default SendEmailView;