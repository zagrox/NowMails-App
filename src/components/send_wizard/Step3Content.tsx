

import React, { useState, useMemo } from 'react';
import WizardLayout from './WizardLayout';
import Icon, { ICONS } from '../Icon';
import Modal from '../Modal';
import Loader from '../Loader';
import useApiV4 from '../../hooks/useApiV4';
import { apiFetchV4 } from '../../api/elasticEmail';
import { Template } from '../../api/types';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import CenteredMessage from '../CenteredMessage';
import EmptyState from '../EmptyState';

// Decode a Base64 string to UTF-8 using modern browser APIs
const decodeState = (base64: string): string => {
    const binary_string = window.atob(base64);
    const bytes = new Uint8Array(binary_string.length);
    for (let i = 0; i < binary_string.length; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
};

const Step3Content = ({ onNext, onBack, data, updateData, apiKey, setView, domains, domainsLoading }: { onNext: () => void; onBack: () => void; data: any; updateData: (d: any) => void; apiKey: string; setView: (view: string, data?: any) => void; domains: any[], domainsLoading: boolean }) => {
    const { t } = useTranslation(['send-wizard', 'templates', 'sendEmail', 'common']);
    const { addToast } = useToast();
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [templateToPreview, setTemplateToPreview] = useState<Template | null>(null);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
    const [templateSearchTerm, setTemplateSearchTerm] = useState('');

    const { data: templates, loading: templatesLoading } = useApiV4(
        '/templates',
        apiKey,
        { scopeType: 'Personal', templateTypes: 'RawHTML', limit: 1000 },
        isTemplateModalOpen ? 1 : 0
    );

    const filteredTemplates = useMemo(() => {
        if (!Array.isArray(templates)) return [];
        return templates.filter((t: Template) => t.Name.toLowerCase().includes(templateSearchTerm.toLowerCase()));
    }, [templates, templateSearchTerm]);

    const handleSelectTemplate = async (templateName: string) => {
        setIsTemplateModalOpen(false);
        setIsLoadingTemplate(true);
        try {
            const fullTemplate = await apiFetchV4(`/templates/${encodeURIComponent(templateName)}`, apiKey);
            const htmlContent = fullTemplate.Body?.[0]?.Content;
            let fromName = '';
            let subject = fullTemplate.Subject || '';

            if (htmlContent) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlContent, 'text/html');
                    const stateContainer = doc.getElementById('mailzila-template-state');
                    const base64State = stateContainer?.getAttribute('data-state');

                    if (base64State) {
                        const jsonState = decodeState(base64State);
                        const state = JSON.parse(jsonState);
                        fromName = state.fromName || '';
                        subject = state.subject || fullTemplate.Subject || '';
                    }
                } catch (e) {
                    console.error("Failed to parse template state from HTML.", e);
                }
            }
            
            updateData({
                template: fullTemplate.Name,
                subject: subject,
                fromName: fromName,
                campaignName: subject || fullTemplate.Name,
            });
        } catch (err: any) {
            addToast(`Failed to load template: ${err.message}`, 'error');
        } finally {
            setIsLoadingTemplate(false);
        }
    };

    const handlePreview = async () => {
        if (!data.template) return;
        setIsLoadingTemplate(true);
        try {
            const fullTemplate = await apiFetchV4(`/templates/${encodeURIComponent(data.template)}`, apiKey);
            setTemplateToPreview(fullTemplate);
            setIsPreviewModalOpen(true);
        } catch (err: any) {
            addToast(`Failed to load template preview: ${err.message}`, 'error');
        } finally {
            setIsLoadingTemplate(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        updateData({ [name]: value });
        if (name === 'subject') {
            updateData({ campaignName: value });
        }
    };
    
    const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const domainName = e.target.value;
        const domainInfo = domains.find(d => d.domain === domainName);
        
        let prefix = 'mailer';
        let currentFromName = data.fromName;

        if (domainInfo?.defaultSender) {
            const defaultSender = domainInfo.defaultSender;
            const defaultMatch = defaultSender.match(/(.*)<(.*)>/);
            if (defaultMatch) {
                if (!currentFromName) { 
                    currentFromName = defaultMatch[1].trim().replace(/"/g, '');
                }
                prefix = defaultMatch[2].trim().split('@')[0];
            } else {
                prefix = defaultSender.trim().split('@')[0];
            }
        }
        updateData({ 
            selectedDomain: domainName, 
            fromEmailPrefix: prefix,
            fromName: currentFromName
        });
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        if (name === 'enableReplyTo' && !checked) {
            updateData({ [name]: checked, replyToName: '', replyToPrefix: '' });
        } else {
            updateData({ [name]: checked });
        }
    };

    const handleGoToBuilder = () => {
        setIsTemplateModalOpen(false);
        setView('Email Builder');
    };
    
    const isNextDisabled = !data.template || !data.fromName || !data.subject || !data.selectedDomain;

    return (
        <>
            <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title={t('templates')}>
                <div className="template-selector-modal">
                    <div className="search-bar" style={{marginBottom: '1rem'}}>
                        {/* FIX: Pass icon as child to Icon component */}
                        <Icon>{ICONS.SEARCH}</Icon>
                        <input type="search" placeholder={t('searchTemplatesPlaceholder', { ns: 'templates' })} value={templateSearchTerm} onChange={e => setTemplateSearchTerm(e.target.value)} />
                    </div>
                    <div className="template-list-container">
                        {templatesLoading ? <Loader /> : (
                            !Array.isArray(templates) || templates.length === 0 ? (
                                <EmptyState icon={ICONS.ARCHIVE} title={t('noTemplatesFound', { ns: 'templates' })} message={t('noTemplatesFoundDesc', { ns: 'templates' })} ctaText={t('createTemplate', { ns: 'templates' })} onCtaClick={handleGoToBuilder} />
                            ) : filteredTemplates.length > 0 ? (
                                filteredTemplates.map((template: Template) => (
                                    <button type="button" key={template.Name} className="template-list-item" onClick={() => handleSelectTemplate(template.Name)}>
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
            
            <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title={templateToPreview?.Name || ''} size="fullscreen" bodyClassName="modal-body--no-padding">
                <iframe srcDoc={templateToPreview?.Body?.[0]?.Content || ''} className="preview-iframe" title={t('previewTemplate', { ns: 'templates' })} />
            </Modal>
            
            <WizardLayout title={t('designContent')} onNext={onNext} onBack={onBack} nextDisabled={isNextDisabled}>
                <div className="wizard-step-intro">
                    {/* FIX: Pass icon as child to Icon component */}
                    <Icon>{ICONS.MAIL}</Icon>
                    <p>{t('designContent_desc')}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label>{t('template', { ns: 'sendEmail' })}</label>
                        <div className="template-summary">
                            <Icon>{ICONS.ARCHIVE}</Icon>
                            <span>{isLoadingTemplate ? <Loader /> : (data.template || '...')}</span>
                            <button type="button" className="btn btn-secondary" onClick={() => setIsTemplateModalOpen(true)}>{t('changeTemplate')}</button>
                            <button type="button" className="btn" onClick={handlePreview} disabled={!data.template || isLoadingTemplate}><Icon>{ICONS.EYE}</Icon></button>
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>{t('fromName', { ns: 'sendEmail' })}</label>
                            <input type="text" name="fromName" value={data.fromName} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>{t('fromEmail', { ns: 'sendEmail' })}</label>
                            {domainsLoading ? <Loader /> : (
                                <div className="from-email-composer">
                                    <input type="text" value={data.fromEmailPrefix} onChange={e => updateData({ fromEmailPrefix: e.target.value.trim() })} />
                                    <span className="from-email-at">@</span>
                                    <select value={data.selectedDomain} onChange={handleDomainChange}>
                                        {domains.map(d => ( <option key={d.domain} value={d.domain}>{d.domain}</option> ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label className="custom-checkbox">
                            <input type="checkbox" name="enableReplyTo" checked={!!data.enableReplyTo} onChange={handleCheckboxChange} />
                            <span className="checkbox-checkmark"></span>
                            <span className="checkbox-label" style={{ fontWeight: 'normal' }}>{t('setDifferentReplyTo')}</span>
                        </label>
                    </div>
                    {data.enableReplyTo && (
                         <div className="form-grid">
                            <div className="form-group">
                                <label>{t('replyToName')}</label>
                                <input type="text" name="replyToName" value={data.replyToName} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>{t('replyToEmail')}</label>
                                <div className="from-email-composer">
                                    <input type="text" value={data.replyToPrefix} onChange={e => updateData({ replyToPrefix: e.target.value.trim() })} />
                                    <span className="from-email-at">@</span>
                                    <select value={data.replyToDomain} onChange={e => updateData({ replyToDomain: e.target.value })}>
                                        {domains.map(d => (<option key={d.domain} value={d.domain}>{d.domain}</option>))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="form-group">
                        <label>{t('subject', { ns: 'sendEmail' })}</label>
                        <input type="text" name="subject" value={data.subject} onChange={handleChange} />
                    </div>

                </div>
            </WizardLayout>
        </>
    );
};

export default Step3Content;
