
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { apiFetchV4 } from '../api/elasticEmail';
import { formatDateForDisplay } from '../utils/helpers';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import Icon, { ICONS } from '../components/Icon';
import ConfirmModal from '../components/ConfirmModal';
import { Template } from '../api/types';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';

// Helper to decode a Base64 string to UTF-8
const decodeState = (base64: string): string => {
    const binary_string = window.atob(base64);
    const bytes = new Uint8Array(binary_string.length);
    for (let i = 0; i < binary_string.length; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
};

// Helper function to extract state from template HTML
const extractStateFromHtml = (htmlContent: string) => {
    if (!htmlContent) return null;
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const stateContainer = doc.getElementById('mailzila-template-state');
        const base64State = stateContainer?.getAttribute('data-state');
        if (base64State) {
            const jsonState = decodeState(base64State);
            return JSON.parse(jsonState);
        }
    } catch (e) {
        console.error("Failed to parse template state from HTML.", e);
    }
    return null;
};


const TemplatePreviewModal = ({ isOpen, onClose, template }: { isOpen: boolean; onClose: () => void; template: Template | null }) => {
    const { t } = useTranslation(['templates', 'common']);
    const htmlContent = template?.Body?.[0]?.Content || '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={template?.Name || t('previewTemplate')} size="fullscreen" bodyClassName="modal-body--no-padding" >
            <iframe srcDoc={htmlContent} className="preview-iframe" title={t('previewTemplate')} />
        </Modal>
    );
};

const CreateCampaignModal = ({ isOpen, onClose, onSelect, templateName }: { isOpen: boolean, onClose: () => void, onSelect: (type: 'quick' | 'advanced') => void, templateName: string }) => {
    const { t } = useTranslation(['templates', 'send-wizard']);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('createCampaignFrom', { templateName })}>
            <div className="selection-grid" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div
                    className="selection-card selection-card--row"
                    onClick={() => onSelect('quick')}
                >
                    <Icon>{ICONS.SEND_EMAIL}</Icon>
                    <div className="selection-card__content">
                        <h3>{t('quickSendCampaign')}</h3>
                        <p>{t('quickSendCampaignDesc')}</p>
                    </div>
                </div>
                <div
                    className="selection-card selection-card--row"
                    onClick={() => onSelect('advanced')}
                >
                    <Icon>{ICONS.TARGET}</Icon>
                    <div className="selection-card__content">
                        <h3>{t('advancedMarketingCampaign')}</h3>
                        <p>{t('advancedMarketingCampaignDesc')}</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

interface TemplateCardProps {
    template: Template & { fromName?: string, Body?: { Content: string }[] }; 
    onPreview: () => void; 
    onEdit: () => void; 
    onDelete: () => void;
    onCreateCampaign: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onPreview, onEdit, onDelete, onCreateCampaign }) => {
    const { t, i18n } = useTranslation(['templates', 'common']);
    const detailsLoaded = !!template.Body && template.Body.length > 0;
    const htmlContent = detailsLoaded ? template.Body[0].Content : '';

    return (
        <div className="card template-card">
            <div className="template-card-preview-wrapper" onClick={detailsLoaded ? onPreview : undefined}>
                {detailsLoaded ? (
                    <iframe
                        srcDoc={htmlContent}
                        title={template.Name}
                        sandbox=""
                        scrolling="no"
                    />
                ) : (
                    <CenteredMessage><Loader/></CenteredMessage>
                )}
            </div>
            <div className="template-card-content">
                <h3>{template.Name}</h3>
                <p className="template-card-subject">{template.Subject || t('noSubject', { ns: 'campaigns' })}</p>
                <p className="template-card-date">{formatDateForDisplay(template.DateAdded, i18n.language)}</p>
            </div>
            <div className="template-card-actions">
                <Button className="btn" onClick={onEdit} disabled={!detailsLoaded}>
                    <Icon>{ICONS.PENCIL}</Icon> {t('edit')}
                </Button>
                <button className="btn-icon" onClick={onDelete} disabled={!detailsLoaded} aria-label={t('deleteTemplate')}>
                    <Icon>{ICONS.DELETE}</Icon>
                </button>
                <Button className="btn-primary" onClick={onCreateCampaign} disabled={!detailsLoaded}>
                    <Icon>{ICONS.SEND_EMAIL}</Icon> {t('createCampaign')}
                </Button>
            </div>
        </div>
    );
};

interface TemplateRowProps {
    template: Template & { fromName?: string, Body?: { Content: string }[] };
    onPreview: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onCreateCampaign: () => void;
}

const TemplateRow: React.FC<TemplateRowProps> = ({ template, onPreview, onEdit, onDelete, onCreateCampaign }) => {
    const { t, i18n } = useTranslation(['templates', 'common']);
    const detailsLoaded = !!template.Body && template.Body.length > 0;

    return (
        <tr>
            <td>
                <strong>{template.Name}</strong>
                <div className="template-row-subject">{template.Subject || t('noSubject', { ns: 'campaigns' })}</div>
            </td>
            <td>{template.fromName || (detailsLoaded ? '—' : '...')}</td>
            <td>{formatDateForDisplay(template.DateAdded, i18n.language)}</td>
            <td>
                <div className="action-buttons" style={{justifyContent: 'flex-end'}}>
                    <button className="btn-icon" onClick={onCreateCampaign} disabled={!detailsLoaded} title={t('createCampaign')}><Icon>{ICONS.SEND_EMAIL}</Icon></button>
                    <button className="btn-icon" onClick={onPreview} disabled={!detailsLoaded}><Icon>{ICONS.EYE}</Icon></button>
                    <button className="btn-icon" onClick={onEdit} disabled={!detailsLoaded}><Icon>{ICONS.PENCIL}</Icon></button>
                    <button className="btn-icon btn-icon-danger" onClick={onDelete} disabled={!detailsLoaded}><Icon>{ICONS.DELETE}</Icon></button>
                </div>
            </td>
        </tr>
    );
};

const TemplatesView = ({ apiKey, setView }: { apiKey: string; setView: (view: string, data?: { template?: Template, campaignToLoad?: any }) => void }) => {
    const { t } = useTranslation(['templates', 'common', 'mediaManager']);
    const { addToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [refetchIndex, setRefetchIndex] = useState(0);
    const [templateToPreview, setTemplateToPreview] = useState<Template | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
    const [offset, setOffset] = useState(0);
    const TEMPLATES_PER_PAGE = 12;
    const [detailedTemplates, setDetailedTemplates] = useState<(Template & { fromName?: string })[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [templateForCampaign, setTemplateForCampaign] = useState<Template | null>(null);
    const [isLoadingFullTemplate, setIsLoadingFullTemplate] = useState(false);

    const { data: templatesFromApi, loading, error } = useApiV4(
        '/templates',
        apiKey,
        {
            scopeType: 'Personal',
            templateTypes: 'RawHTML',
            limit: TEMPLATES_PER_PAGE,
            offset,
            search: searchQuery
        },
        refetchIndex
    );
    
    useEffect(() => {
        if (templatesFromApi && Array.isArray(templatesFromApi)) {
            setDetailedTemplates(templatesFromApi);

            const fetchDetails = async () => {
                const templatesWithDetails = await Promise.all(
                    templatesFromApi.map(async (template: Template) => {
                        try {
                            const fullTemplate = await apiFetchV4(`/templates/${encodeURIComponent(template.Name)}`, apiKey);
                            const htmlContent = fullTemplate.Body?.[0]?.Content;
                            const state = extractStateFromHtml(htmlContent);
                            return { ...template, Body: fullTemplate.Body, fromName: state?.fromName };
                        } catch (e) {
                            console.warn(`Could not fetch details for template ${template.Name}`, e);
                            return template;
                        }
                    })
                );
                setDetailedTemplates(templatesWithDetails);
            };
            fetchDetails();
        } else {
            setDetailedTemplates([]);
        }
    }, [templatesFromApi, apiKey]);


    const refetch = () => setRefetchIndex(i => i + 1);

    const confirmDeleteTemplate = async () => {
        if (!templateToDelete) return;
        const templateName = templateToDelete.Name;
        try {
            await apiFetchV4(`/templates/${encodeURIComponent(templateName)}`, apiKey, { method: 'DELETE' });
            addToast(t('templateDeletedSuccess', { name: templateName }), 'success');
            refetch();
        } catch (err: any) {
            addToast(t('templateDeletedError', { error: err.message }), 'error');
        } finally {
            setTemplateToDelete(null);
        }
    };
    
    const handlePreview = (template: Template) => {
        setTemplateToPreview(template);
    };

    const handleEdit = (template: Template) => {
        setView('Email Builder', { template: template });
    };

    const handleCreateCampaignClick = (template: Template) => {
        setTemplateForCampaign(template);
    };
    
    const handleSelectCampaignType = async (type: 'quick' | 'advanced') => {
        if (!templateForCampaign) return;
    
        const templateName = templateForCampaign.Name;
        setTemplateForCampaign(null); // Close modal
        setIsLoadingFullTemplate(true);
        addToast(t('loadingTemplate', { ns: 'common' }), 'info');
    
        try {
            const fullTemplate = await apiFetchV4(`/templates/${encodeURIComponent(templateName)}`, apiKey);
    
            const htmlContent = fullTemplate.Body?.[0]?.Content;
            let fromName = '';
            let subject = fullTemplate.Subject || '';
            if (htmlContent) {
                const state = extractStateFromHtml(htmlContent);
                if (state) {
                    fromName = state.fromName || '';
                    subject = state.subject || fullTemplate.Subject || '';
                }
            }
    
            const campaignToLoad = {
                Name: subject || fullTemplate.Name,
                Content: [{
                    TemplateName: fullTemplate.Name,
                    Subject: subject,
                    FromName: fromName,
                    From: '',
                    ReplyTo: '',
                    Preheader: '',
                    Body: null,
                    Utm: null
                }],
                Recipients: { ListNames: [], SegmentNames: [] },
                Options: {
                    TrackOpens: true,
                    TrackClicks: true,
                    DeliveryOptimization: 'None',
                    EnableSendTimeOptimization: false
                }
            };
    
            const view = type === 'quick' ? 'Send Email' : 'Marketing';
            setView(view, { campaignToLoad });
    
        } catch (err: any) {
            addToast(`Failed to load template: ${err.message}`, 'error');
        } finally {
            setIsLoadingFullTemplate(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setOffset(0);
    };

    return (
        <div>
            {isLoadingFullTemplate && (
                <div className="page-overlay">
                    <Loader />
                </div>
            )}
            <CreateCampaignModal
                isOpen={!!templateForCampaign}
                onClose={() => setTemplateForCampaign(null)}
                onSelect={handleSelectCampaignType}
                templateName={templateForCampaign?.Name || ''}
            />
            <TemplatePreviewModal isOpen={!!templateToPreview} onClose={() => setTemplateToPreview(null)} template={templateToPreview} />
            <ConfirmModal
                isOpen={!!templateToDelete}
                onClose={() => setTemplateToDelete(null)}
                onConfirm={confirmDeleteTemplate}
                title={t('deleteTemplate')}
                confirmText={t('delete')}
                isDestructive
            >
                <p>{t('confirmDeleteTemplate', { name: templateToDelete?.Name })}</p>
            </ConfirmModal>

            <div className="view-header">
                <div className="search-bar" style={{ flexGrow: 1 }}>
                    <Icon>{ICONS.SEARCH}</Icon>
                    <input
                        type="search"
                        placeholder={t('searchTemplatesPlaceholder')}
                        value={searchQuery}
                        onChange={handleSearchChange}
                        disabled={loading}
                    />
                </div>
                <div className="header-actions">
                    <div className="view-switcher">
                        <button onClick={() => setViewMode('grid')} className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`} aria-label={t('cardView', { ns: 'mediaManager' })}>
                            <Icon>{ICONS.DASHBOARD}</Icon>
                        </button>
                        <button onClick={() => setViewMode('list')} className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`} aria-label={t('tableView', { ns: 'mediaManager' })}>
                            <Icon>{ICONS.EMAIL_LISTS}</Icon>
                        </button>
                    </div>
                    <Button className="btn-secondary" onClick={() => setView('Gallery')}>
                        <Icon>{ICONS.BOX}</Icon> {t('chooseFromGallery')}
                    </Button>
                    <Button className="btn-primary" onClick={() => setView('Email Builder')} action="create_template">
                        <Icon>{ICONS.PLUS}</Icon> {t('createTemplate')}
                    </Button>
                </div>
            </div>

            {loading && detailedTemplates.length === 0 && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}
            
            {!loading && !error && (
                (detailedTemplates.length === 0) ? (
                    searchQuery ? (
                        <CenteredMessage style={{ height: '50vh' }}>
                            <p>{t('noTemplatesForQuery', { query: searchQuery })}</p>
                        </CenteredMessage>
                    ) : (
                        <EmptyState
                            icon={ICONS.ARCHIVE}
                            title={t('noTemplatesFound')}
                            message={t('noTemplatesFoundDesc')}
                            ctaText={t('createTemplate')}
                            onCtaClick={() => setView('Email Builder')}
                        />
                    )
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <div className="templates-grid">
                                {detailedTemplates.map((template) => (
                                    <TemplateCard
                                        key={template.Name}
                                        template={template}
                                        onPreview={() => handlePreview(template)}
                                        onEdit={() => handleEdit(template)}
                                        onDelete={() => setTemplateToDelete(template)}
                                        onCreateCampaign={() => handleCreateCampaignClick(template)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>{t('name')}</th>
                                            <th>{t('fromName', {ns: 'sendEmail'})}</th>
                                            <th>{t('dateAdded')}</th>
                                            <th style={{textAlign: 'right'}}>{t('action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailedTemplates.map((template) => (
                                            <TemplateRow
                                                key={template.Name}
                                                template={template}
                                                onPreview={() => handlePreview(template)}
                                                onEdit={() => handleEdit(template)}
                                                onDelete={() => setTemplateToDelete(template)}
                                                onCreateCampaign={() => handleCreateCampaignClick(template)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                         {( (templatesFromApi && templatesFromApi.length > 0) || offset > 0) && (
                            <div className="pagination-controls">
                                <button onClick={() => setOffset(o => Math.max(0, o - TEMPLATES_PER_PAGE))} disabled={offset === 0 || loading}>
                                    <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                                    <span>{t('previous')}</span>
                                </button>
                                <span className="pagination-page-info">{t('page', { page: offset / TEMPLATES_PER_PAGE + 1 })}</span>
                                <button onClick={() => setOffset(o => o + TEMPLATES_PER_PAGE)} disabled={!templatesFromApi || templatesFromApi.length < TEMPLATES_PER_PAGE || loading}>
                                    <span>{t('next')}</span>
                                    <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                                </button>
                            </div>
                        )}
                    </>
                )
            )}
        </div>
    );
};

export default TemplatesView;