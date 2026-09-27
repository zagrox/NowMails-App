





import React, { useState, useMemo } from 'react';
import WizardLayout from '../../components/send_wizard/WizardLayout';
import Icon, { ICONS } from '../../components/Icon';
import Modal from '../../components/Modal';
import Loader from '../../components/Loader';
import useApiV4 from '../../hooks/useApiV4';
import { apiFetchV4 } from '../../api/elasticEmail';
import { Template } from '../../api/types';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import CenteredMessage from '../../components/CenteredMessage';
import EmptyState from '../../components/EmptyState';

// Decode a Base64 string to UTF-8 using modern browser APIs
const decodeState = (base64: string): string => {
    const binary_string = window.atob(base64);
    const bytes = new Uint8Array(binary_string.length);
    for (let i = 0; i < binary_string.length; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
};

const Step3Content = ({ onNext, onBack, data, updateData, apiKey, setView }: { onNext: () => void; onBack: () => void; data: any; updateData: (d: any) => void; apiKey: string; setView: (view: string, data?: any) => void; }) => {
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
        // If subject is changed, update campaign name as well for convenience
        if (name === 'subject') {
            updateData({ campaignName: value });
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        // If unchecking, also clear the replyTo value
        if (name === 'enableReplyTo' && !checked) {
            updateData({ [name]: checked, replyTo: '' });
        } else {
            updateData({ [name]: checked });
        }
    };

    const handleGoToBuilder = () => {
        setIsTemplateModalOpen(false);
        setView('Email Builder');
    };
    
    const isNextDisabled = !data.template || !data.fromName || !data.subject;

    return (
        <>
            <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title={t('templates')}>
                <div className="template-selector-modal">
                    <div className="search-bar" style={{marginBottom: '1rem'}}>
                        {/* FIX: Pass icon as child to Icon component */}
                        <Icon>{ICONS.SEARCH}</Icon>
                        <input
                            type="search"
                            placeholder={t('searchTemplatesPlaceholder', { ns: 'templates' })}
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
            
            <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title={templateToPreview?.Name || ''} size="fullscreen" bodyClassName="modal-body--no-padding">
                <iframe srcDoc={templateToPreview?.Body?.[0]?.Content || ''} className="preview-iframe" title={t('previewTemplate', { ns: 'templates' })} />
            </Modal>
            
            <WizardLayout
                title={t('designContent')}
                onNext={onNext}
                onBack={onBack}
                nextDisabled={isNextDisabled}
            >
                <div className="wizard-step-intro">
                    {/* FIX: Pass icon as child to Icon component */}
                    <Icon>{ICONS.MAIL}</Icon>
                    <p>{t('designContent_desc')}</p>
                </div>
                <div className="content-form-grid">
                    <label>{t('template', { ns: 'sendEmail' })}</label>
                    <div className="template-selector-display" onClick={() => setIsTemplateModalOpen(true)} style={{ gridColumn: '2 / 4' }}>
                        {isLoadingTemplate ? <Loader /> : (data.template || t('useTemplate', { ns: 'sendEmail' }))}
                    </div>
                    <button className="btn btn-secondary" onClick={handlePreview} disabled={!data.template || isLoadingTemplate}>
                        {/* FIX: Pass icon as child to Icon component */}
                        <Icon>{ICONS.EYE}</Icon> {t('previewTemplate', { ns: 'templates' })}
                    </button>

                    <label>{t('fromName', { ns: 'sendEmail' })}</label>
                    <input type="text" name="fromName" value={data.fromName} onChange={handleChange} className="full-width" style={{gridColumn: '2 / -1'}} />

                    <label>{t('subject', { ns: 'sendEmail' })}</label>
                    <input type="text" name="subject" value={data.subject} onChange={handleChange} style={{gridColumn: '2 / -1'}} />

                    <label style={{alignSelf: 'start', paddingTop: '0.5rem'}}>{t('replyTo')}</label>
                    <div style={{ gridColumn: '2 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label className="custom-checkbox">
                            <input type="checkbox" name="enableReplyTo" checked={!!data.enableReplyTo} onChange={handleCheckboxChange} />
                            <span className="checkbox-checkmark"></span>
                            <span className="checkbox-label" style={{ fontWeight: 'normal' }}>{t('setDifferentReplyTo')}</span>
                        </label>
                        {data.enableReplyTo &&
                            <input 
                                type="email" 
                                name="replyTo" 
                                value={data.replyTo} 
                                onChange={handleChange} 
                                className="full-width" 
                                placeholder={t('replyToPlaceholder')}
                            />
                        }
                    </div>
                </div>
            </WizardLayout>
        </>
    );
};

export default Step3Content;
