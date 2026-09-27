
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { apiFetchV4 } from '../api/elasticEmail';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import Icon, { ICONS } from '../components/Icon';
import Badge from '../components/Badge';
import { useStatusStyles } from '../hooks/useStatusStyles';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/Button';
import { formatDateRelative } from '../utils/helpers';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

const CampaignPreviewModal = ({ campaign, onClose }: { campaign: any | null, onClose: () => void }) => {
    const { t } = useTranslation(['templates']);
    const htmlContent = campaign?.Content?.[0]?.Body?.[0]?.Content || '';

    return (
        <Modal
            isOpen={!!campaign}
            onClose={onClose}
            title={campaign?.Name || t('previewTemplate')}
            size="fullscreen"
            bodyClassName="modal-body--no-padding"
        >
            <iframe
                srcDoc={htmlContent}
                className="preview-iframe"
                title={t('previewTemplate')}
                style={{ width: '100%', height: '100%', border: 'none' }}
            />
        </Modal>
    );
};

interface CampaignCardProps {
    campaign: any;
    onSelect: () => void;
    onEdit: () => void;
    onEditInWizard: () => void;
    onDelete: () => void;
    onPause: () => void;
    stats: { Delivered: number, Opened: number, Clicked: number } | null;
    loadingStats: boolean;
    processingCampaign: string | null;
    onPreviewTemplate: () => void;
    isLoadingPreview: boolean;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, onSelect, onEdit, onEditInWizard, onDelete, onPause, stats, loadingStats, processingCampaign, onPreviewTemplate, isLoadingPreview }) => {
    const { t, i18n } = useTranslation(['campaigns', 'sendEmail', 'common', 'mediaManager', 'templates']);
    const { getStatusStyle } = useStatusStyles();
    const statusStyle = getStatusStyle(campaign.Status);
    const isDraft = campaign.Status === 'Draft';
    const isSending = campaign.Status === 'Sending';
    const content = campaign.Content?.[0];
    const templateName = content?.TemplateName;

    const fromString = content?.From || '';
    let fromName = content?.FromName;
    if (!fromName) {
        const angleBracketMatch = fromString.match(/(.*)<.*>/);
        if (angleBracketMatch) {
            fromName = angleBracketMatch[1].trim().replace(/"/g, '');
        }
    }

    const openRate = useMemo(() => {
        if (!stats || !stats.Delivered) return '0.0%';
        return `${((stats.Opened / stats.Delivered) * 100).toFixed(1)}%`;
    }, [stats]);

    const clickRate = useMemo(() => {
        if (!stats || !stats.Delivered) return '0.0%';
        return `${((stats.Clicked / stats.Delivered) * 100).toFixed(1)}%`;
    }, [stats]);

    return (
        <div className="card campaign-card">
            <div className="campaign-card-content">
                <div className="campaign-card-header">
                    <div className="campaign-card-title-group">
                        <h3 className="campaign-card-title">{campaign.Name}</h3>
                        <p className="campaign-card-date">
                            {formatDateRelative(campaign.DateAdded, i18n.language)}
                        </p>
                    </div>
                    <Badge text={statusStyle.text} type={statusStyle.type} iconPath={statusStyle.iconPath} />
                </div>
                <div className="campaign-card-body">
                    <p className="campaign-card-subject">{content?.Subject || t('noSubject')}</p>
                    {templateName && (
                        <button className="campaign-card-template" onClick={onPreviewTemplate} disabled={isLoadingPreview || !!processingCampaign}>
                            {isLoadingPreview ? <Loader /> : <Icon>{ICONS.ARCHIVE}</Icon>}
                            <span>{templateName}</span>
                        </button>
                    )}
                </div>
                {!isDraft && (
                    <div className="campaign-card-stats">
                        {loadingStats ? (
                            <div style={{gridColumn: '1 / -1'}}><CenteredMessage><Loader /></CenteredMessage></div>
                        ) : stats ? (
                            <>
                                <div className="campaign-stat-item">
                                    <span className="stat-value">{stats.Delivered.toLocaleString(i18n.language)}</span>
                                    <span className="stat-label">{t('delivered')}</span>
                                </div>
                                <div className="campaign-stat-item">
                                    <span className="stat-value">{openRate}</span>
                                    <span className="stat-label">{t('opened')}</span>
                                </div>
                                <div className="campaign-stat-item">
                                    <span className="stat-value">{clickRate}</span>
                                    <span className="stat-label">{t('clicked')}</span>
                                </div>
                            </>
                        ) : (
                            <div style={{gridColumn: '1 / -1', textAlign: 'center', color: 'var(--subtle-text-color)', fontSize: '0.9rem'}}>
                                {t('noStatsForCampaign')}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="campaign-card-footer" style={{justifyContent: 'flex-end', gap: '0.5rem'}}>
                {isDraft ? (
                    <>
                        <Button className="btn-secondary" onClick={onEdit} disabled={loadingStats || !!processingCampaign}>
                            <Icon>{ICONS.PENCIL}</Icon>
                            <span>{t('quickEdit')}</span>
                        </Button>
                        <Button className="btn-secondary" onClick={onEditInWizard} disabled={loadingStats || !!processingCampaign}>
                            <Icon>{ICONS.TARGET}</Icon>
                            <span>{t('wizard')}</span>
                        </Button>
                         <Button className="btn-danger" onClick={onDelete} disabled={loadingStats || !!processingCampaign}>
                            {processingCampaign === campaign.Name ? <Loader /> : <Icon>{ICONS.DELETE}</Icon>}
                        </Button>
                    </>
                ) : isSending ? (
                     <>
                        <Button className="btn-secondary" onClick={onPause} disabled={loadingStats || !!processingCampaign}>
                            {processingCampaign === campaign.Name ? <Loader /> : <Icon>{ICONS.PAUSE}</Icon>}
                            <span>{t('pause', { ns: 'campaigns' })}</span>
                        </Button>
                        <Button className="btn-secondary" onClick={onSelect} disabled={loadingStats || !!processingCampaign}>
                            <Icon>{ICONS.STATISTICS}</Icon>
                            <span>{t('viewReport', { ns: 'campaigns' })}</span>
                        </Button>
                    </>
                ) : (
                    <Button className="btn-secondary" onClick={onSelect} disabled={loadingStats || !!processingCampaign}>
                        <Icon>{ICONS.STATISTICS}</Icon>
                        <span>{t('viewReport', { ns: 'campaigns' })}</span>
                    </Button>
                )}
            </div>
        </div>
    );
};

interface CampaignRowProps {
    campaign: any;
    onSelect: () => void;
    onEdit: () => void;
    onEditInWizard: () => void;
    onDelete: () => void;
    onPause: () => void;
    stats: { Delivered: number, Opened: number } | null;
    loadingStats: boolean;
    processingCampaign: string | null;
    onPreviewTemplate: () => void;
    isLoadingPreview: boolean;
}

const CampaignRow: React.FC<CampaignRowProps> = ({ campaign, onSelect, onEdit, onEditInWizard, onDelete, onPause, stats, loadingStats, processingCampaign, onPreviewTemplate, isLoadingPreview }) => {
    const { t, i18n } = useTranslation(['campaigns', 'sendEmail', 'common', 'mediaManager', 'templates']);
    const { getStatusStyle } = useStatusStyles();
    const statusStyle = getStatusStyle(campaign.Status);
    const isDraft = campaign.Status === 'Draft';
    const isSending = campaign.Status === 'Sending';
    const content = campaign.Content?.[0];
    const templateName = content?.TemplateName;

    const openRate = useMemo(() => {
        if (loadingStats || !stats || !stats.Delivered) return '-';
        return `${((stats.Opened / stats.Delivered) * 100).toFixed(1)}%`;
    }, [stats, loadingStats]);

    return (
        <tr>
            <td>
                <button className="table-link-button" onClick={isDraft ? onEdit : onSelect}>
                    <strong>{campaign.Name}</strong>
                </button>
                <div className="campaign-row-subject">{content?.Subject || t('noSubject')}</div>
                {templateName && (
                    <button className="campaign-row-template" onClick={onPreviewTemplate} disabled={isLoadingPreview || !!processingCampaign}>
                        {isLoadingPreview ? <Loader /> : <Icon>{ICONS.ARCHIVE}</Icon>}
                        <span>{templateName}</span>
                    </button>
                )}
                <div className="campaign-row-date">
                    {formatDateRelative(campaign.DateAdded, i18n.language)}
                </div>
            </td>
            <td>
                <Badge text={statusStyle.text} type={statusStyle.type} iconPath={statusStyle.iconPath} />
            </td>
            <td>
                {loadingStats ? (
                    <div style={{width: '60px'}}><Loader /></div>
                ) : !isDraft ? (
                    <div style={{fontWeight: 500}}>{openRate}</div>
                ) : (
                    <span>-</span>
                )}
            </td>
            <td>
                 <div className="action-buttons" style={{justifyContent: 'flex-end'}}>
                    {isDraft ? (
                        <>
                            <button onClick={onEdit} className="btn btn-secondary" disabled={loadingStats || !!processingCampaign} style={{padding: '0.5rem 1rem'}}>
                                <span>{t('quickEdit')}</span>
                            </button>
                             <button onClick={onEditInWizard} className="btn btn-secondary" disabled={loadingStats || !!processingCampaign} style={{padding: '0.5rem 1rem'}}>
                                <span>{t('wizard')}</span>
                            </button>
                            <button className="btn-icon btn-icon-danger" onClick={onDelete} aria-label={t('delete')} disabled={!!processingCampaign}>
                                {processingCampaign === campaign.Name ? <div style={{width: '20px', height: '20px'}}><Loader/></div> : <Icon>{ICONS.DELETE}</Icon>}
                            </button>
                        </>
                    ) : isSending ? (
                        <>
                            <button onClick={onPause} className="btn btn-secondary" disabled={loadingStats || !!processingCampaign} style={{padding: '0.5rem 1rem'}}>
                                {processingCampaign === campaign.Name ? <Loader /> : <Icon>{ICONS.PAUSE}</Icon>}
                                <span>{t('pause')}</span>
                            </button>
                            <button className="btn-icon" onClick={onSelect} aria-label={t('viewCampaignStats')}>
                                <Icon>{ICONS.EYE}</Icon>
                            </button>
                        </>
                    ) : (
                        <button className="btn-icon" onClick={onSelect} aria-label={t('viewCampaignStats')}>
                            <Icon>{ICONS.EYE}</Icon>
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

const CampaignsView = ({ apiKey, setView }: { apiKey: string, setView: (view: string, data?: any) => void }) => {
    const { t } = useTranslation(['campaigns', 'common', 'templates']);
    const { addToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [campaignStats, setCampaignStats] = useState<Record<string, { data?: any; loading: boolean; error?: any; }>>({});
    const [offset, setOffset] = useState(0);
    const [refetchIndex, setRefetchIndex] = useState(0);
    const [loadingCampaignName, setLoadingCampaignName] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [campaignToDelete, setCampaignToDelete] = useState<any | null>(null);
    const [processingCampaign, setProcessingCampaign] = useState<string | null>(null);
    const [campaignToPreview, setCampaignToPreview] = useState<any | null>(null);
    const [loadingPreview, setLoadingPreview] = useState<string | null>(null);

    const CAMPAIGNS_PER_PAGE = 20;

    const { data: campaignsData, loading, error } = useApiV4('/campaigns', apiKey, {
        limit: CAMPAIGNS_PER_PAGE,
        offset,
        search: searchQuery,
        orderBy: 'DateAdded desc',
    }, refetchIndex);

    const refetch = () => setRefetchIndex(i => i + 1);

    useEffect(() => {
        if (processingCampaign && !loading) {
            setProcessingCampaign(null);
        }
    }, [loading, processingCampaign]);

    const handlePreviewTemplate = async (campaignName: string) => {
        setLoadingPreview(campaignName);
        try {
            const fullCampaign = await apiFetchV4(`/campaigns/${encodeURIComponent(campaignName)}`, apiKey);
    
            if (fullCampaign?.Content?.[0]?.Body?.[0]?.Content) {
                setCampaignToPreview(fullCampaign);
                return; 
            }
    
            const templateName = fullCampaign?.Content?.[0]?.TemplateName;
            if (templateName) {
                const templateData = await apiFetchV4(`/templates/${encodeURIComponent(templateName)}`, apiKey);
                
                if (templateData?.Body?.[0]?.Content) {
                    const previewCampaignObject = {
                        ...fullCampaign, 
                        Content: [{
                            ...fullCampaign.Content[0],
                            Body: [{
                                Content: templateData.Body[0].Content,
                                Charset: "utf-8",
                                ContentType: "HTML"
                            }]
                        }]
                    };
                    setCampaignToPreview(previewCampaignObject);
                } else {
                    addToast(t('noPreviewAvailable'), 'info');
                }
            } else {
                addToast(t('noPreviewAvailable'), 'info');
            }
        } catch (e: any) {
            addToast(t('previewLoadError', { error: e.message }), 'error');
        } finally {
            setLoadingPreview(null);
        }
    };

    const paginatedCampaigns = useMemo(() => {
        return Array.isArray(campaignsData) ? campaignsData : [];
    }, [campaignsData]);
    
    useEffect(() => {
        setOffset(0);
    }, [searchQuery]);

    useEffect(() => {
        if (!apiKey || !paginatedCampaigns || paginatedCampaigns.length === 0) {
            return;
        }
    
        const campaignsToFetch = paginatedCampaigns.filter(
            c => c.Status !== 'Draft' && !campaignStats[c.Name]
        );
    
        if (campaignsToFetch.length > 0) {
            setCampaignStats(prev => {
                const newStats = { ...prev };
                campaignsToFetch.forEach(campaign => {
                    newStats[campaign.Name] = { loading: true };
                });
                return newStats;
            });
    
            Promise.all(
                campaignsToFetch.map(campaign =>
                    apiFetchV4(`/statistics/campaigns/${encodeURIComponent(campaign.Name)}`, apiKey)
                        .then(result => ({
                            name: campaign.Name,
                            success: true as const,
                            data: {
                                Delivered: result?.Delivered ?? 0,
                                Opened: result?.Opened ?? 0,
                                Clicked: result?.Clicked ?? 0,
                            }
                        }))
                        .catch(error => ({
                            name: campaign.Name,
                            success: false as const,
                            error
                        }))
                )
            ).then(results => {
                setCampaignStats(prev => {
                    const newStats = { ...prev };
                    for (const res of results) {
                        if (res.success === true) {
                            newStats[res.name] = { loading: false, data: res.data };
                        } else {
                            console.error(`Failed to fetch stats for campaign ${res.name}`, res.error);
                            newStats[res.name] = { loading: false, error: res.error };
                        }
                    }
                    return newStats;
                });
            });
        }
    }, [paginatedCampaigns, apiKey, campaignStats]);

    const handleSelectCampaign = (campaign: any) => {
        setView('CampaignDetail', { campaign });
    };

    const handleEditCampaign = async (campaign: any) => {
        setLoadingCampaignName(campaign.Name);
        try {
            const fullCampaign = await apiFetchV4(`/campaigns/${encodeURIComponent(campaign.Name)}`, apiKey);
            setView('Send Email', { campaignToLoad: fullCampaign });
        } catch (e: any) {
            addToast(`Failed to load draft for editing: ${e.message}`, 'error');
        } finally {
            setLoadingCampaignName(null);
        }
    };
    
    const handleEditInWizard = async (campaign: any) => {
        setLoadingCampaignName(campaign.Name);
        try {
            const fullCampaign = await apiFetchV4(`/campaigns/${encodeURIComponent(campaign.Name)}`, apiKey);
            setView('Marketing', { campaignToLoad: fullCampaign });
        } catch (e: any) {
            addToast(`Failed to load draft for editing in wizard: ${e.message}`, 'error');
        } finally {
            setLoadingCampaignName(null);
        }
    };

    const handlePauseCampaign = async (campaignName: string) => {
        setProcessingCampaign(campaignName);
        try {
            await apiFetchV4(`/campaigns/${encodeURIComponent(campaignName)}/pause`, apiKey, { method: 'PUT' });
            addToast(t('campaignPausedSuccess', { name: campaignName }), 'success');
            refetch();
        } catch (e: any) {
            addToast(t('campaignPausedError', { error: e.message }), 'error');
            setProcessingCampaign(null);
        }
    };
    
    const confirmDeleteCampaign = async () => {
        if (!campaignToDelete) return;
        setProcessingCampaign(campaignToDelete.Name);
        try {
            await apiFetchV4(`/campaigns/${encodeURIComponent(campaignToDelete.Name)}`, apiKey, { method: 'DELETE' });
            addToast(t('campaignDeletedSuccess', { name: campaignToDelete.Name }), 'success');
            refetch();
        } catch (e: any) {
            addToast(t('campaignDeletedError', { error: e.message }), 'error');
            setProcessingCampaign(null);
        } finally {
            setCampaignToDelete(null);
        }
    };

    return (
        <div>
            <CampaignPreviewModal campaign={campaignToPreview} onClose={() => setCampaignToPreview(null)} />
             <ConfirmModal
                isOpen={!!campaignToDelete}
                onClose={() => setCampaignToDelete(null)}
                onConfirm={confirmDeleteCampaign}
                title={t('deleteCampaign', { name: campaignToDelete?.Name })}
                isDestructive
            >
                <p>{t('confirmDeleteCampaign', { name: campaignToDelete?.Name })}</p>
            </ConfirmModal>
            <div className="view-header">
                <div className="search-bar" style={{ flexGrow: 1 }}>
                    <Icon>{ICONS.SEARCH}</Icon>
                    <input
                        type="search"
                        placeholder={t('searchCampaignsPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={loading || !!processingCampaign}
                        aria-label={t('searchCampaignsPlaceholder')}
                    />
                </div>
                <div className="header-actions">
                    <div className="view-switcher">
                        <button onClick={() => setViewMode('grid')} className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`} aria-label="Grid view">
                            <Icon>{ICONS.DASHBOARD}</Icon>
                        </button>
                        <button onClick={() => setViewMode('list')} className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`} aria-label="List view">
                            <Icon>{ICONS.EMAIL_LISTS}</Icon>
                        </button>
                    </div>
                    <Button className="btn-primary" onClick={() => setView('Send Email')} action="create_campaign">
                        <Icon>{ICONS.PLUS}</Icon> {t('createCampaign')}
                    </Button>
                </div>
            </div>

            {loading && !processingCampaign && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}

            {!loading && !error && (
                 (paginatedCampaigns.length === 0) ? (
                    searchQuery ? (
                        <CenteredMessage style={{height: '50vh'}}>
                            <p>{t('noCampaignsForQuery', { query: searchQuery })}</p>
                        </CenteredMessage>
                    ) : (
                        <EmptyState
                            icon={ICONS.CAMPAIGNS}
                            title={t('noCampaignsFound')}
                            message={t('noCampaignsFoundDesc')}
                            ctaText={t('createCampaign')}
                            onCtaClick={() => setView('Send Email')}
                        />
                    )
                ) : (
                    <>
                    {viewMode === 'grid' ? (
                        <div className="campaign-grid">
                            {paginatedCampaigns.map((campaign: any) => {
                               const statsInfo = campaign.Status !== 'Draft' ? campaignStats[campaign.Name] : null;
                               return (
                                   <CampaignCard
                                        key={campaign.Name}
                                        campaign={campaign}
                                        onSelect={() => handleSelectCampaign(campaign)}
                                        onEdit={() => {handleEditCampaign(campaign)}}
                                        onEditInWizard={() => {handleEditInWizard(campaign)}}
                                        onDelete={() => setCampaignToDelete(campaign)}
                                        onPause={() => {handlePauseCampaign(campaign.Name)}}
                                        stats={statsInfo?.data ?? null}
                                        loadingStats={statsInfo?.loading || loadingCampaignName === campaign.Name}
                                        processingCampaign={processingCampaign}
                                        onPreviewTemplate={() => {handlePreviewTemplate(campaign.Name)}}
                                        isLoadingPreview={loadingPreview === campaign.Name}
                                   />
                               );
                            })}
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('name', { ns: 'common' })}</th>
                                        <th>{t('status', { ns: 'common' })}</th>
                                        <th>{t('openRate', { ns: 'common' })}</th>
                                        <th style={{ textAlign: 'right' }}>{t('action', { ns: 'common' })}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCampaigns.map((campaign: any) => {
                                        const statsInfo = campaign.Status !== 'Draft' ? campaignStats[campaign.Name] : null;
                                        return (
                                            <CampaignRow
                                                key={campaign.Name}
                                                campaign={campaign}
                                                onSelect={() => handleSelectCampaign(campaign)}
                                                onEdit={() => {handleEditCampaign(campaign)}}
                                                onEditInWizard={() => {handleEditInWizard(campaign)}}
                                                onDelete={() => setCampaignToDelete(campaign)}
                                                onPause={() => {handlePauseCampaign(campaign.Name)}}
                                                stats={statsInfo?.data ?? null}
                                                loadingStats={statsInfo?.loading || loadingCampaignName === campaign.Name}
                                                processingCampaign={processingCampaign}
                                                onPreviewTemplate={() => {handlePreviewTemplate(campaign.Name)}}
                                                isLoadingPreview={loadingPreview === campaign.Name}
                                            />
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {(paginatedCampaigns.length > 0 || offset > 0) && (
                        <div className="pagination-controls">
                            <button onClick={() => setOffset(o => Math.max(0, o - CAMPAIGNS_PER_PAGE))} disabled={offset === 0 || loading}>
                                <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                                <span>{t('previous', { ns: 'common' })}</span>
                            </button>
                            <span className="pagination-page-info">{t('page', { ns: 'common', page: offset / CAMPAIGNS_PER_PAGE + 1 })}</span>
                            <button onClick={() => setOffset(o => o + CAMPAIGNS_PER_PAGE)} disabled={!paginatedCampaigns || paginatedCampaigns.length < CAMPAIGNS_PER_PAGE || loading}>
                                <span>{t('next', { ns: 'common' })}</span>
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

export default CampaignsView;