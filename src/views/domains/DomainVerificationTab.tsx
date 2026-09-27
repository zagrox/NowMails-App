
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../../hooks/useApiV4';
import useApi from '../useApi';
import { apiFetchV4 } from '../../api/elasticEmail';
import CenteredMessage from '../../components/CenteredMessage';
import Loader from '../../components/Loader';
import ErrorMessage from '../../components/ErrorMessage';
import { useToast } from '../../contexts/ToastContext';
import Icon, { ICONS } from '../../components/Icon';
import Badge from '../../components/Badge';
import ConfirmModal from '../../components/ConfirmModal';
import { useStatusStyles } from '../../hooks/useStatusStyles';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import SetDefaultSenderModal from './SetDefaultSenderModal';
import SetAccountDefaultSenderModal from './SetAccountDefaultSenderModal';

const cleanDomain = (domainStr: string) => {
    if (!domainStr) return '';
    const match = domainStr.match(/^([a-zA-Z0-9.-]+)/);
    return match ? match[0] : domainStr;
};

const GuideStep = ({ step, title, desc }: { step: number, title: string, desc: string }) => (
    <div className="step-item">
        <div className="step-number">{step}</div>
        <div className="step-content">
            <h4>{title}</h4>
            <p dangerouslySetInnerHTML={{ __html: desc }} />
        </div>
    </div>
);

const HowToModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { t } = useTranslation('guides');
    const title = t('guideDomainTitle');
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="step-by-step-list">
                <GuideStep step={1} title={t('guideDomainStep1Title')} desc={t('guideDomainStep1Desc')} />
                <GuideStep step={2} title={t('guideDomainStep2Title')} desc={t('guideDomainStep2Desc')} />
                <GuideStep step={3} title={t('guideDomainStep3Title')} desc={t('guideDomainStep3Desc')} />
                <GuideStep step={4} title={t('guideDomainStep4Title')} desc={t('guideDomainStep4Desc')} />
            </div>
        </Modal>
    );
};

const DomainVerificationTab = ({ apiKey, setView }: { apiKey: string, setView: (view: string, data?: any) => void }) => {
    const { t, i18n } = useTranslation(['domains', 'common']);
    const { addToast } = useToast();
    const [refetchIndex, setRefetchIndex] = useState(0);
    const [newDomain, setNewDomain] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [domainToDelete, setDomainToDelete] = useState<string | null>(null);
    const [domainToEdit, setDomainToEdit] = useState<any | null>(null);
    const [isAddingDomain, setIsAddingDomain] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
    const [isAccountDefaultModalOpen, setIsAccountDefaultModalOpen] = useState(false);
    const newDomainInputRef = useRef<HTMLInputElement>(null);

    const { getStatusStyle } = useStatusStyles();

    const { data, loading, error, refetch: refetchDomains } = useApiV4('/domains', apiKey, {}, refetchIndex);
    const { data: accountData, loading: accountLoading, refetch: refetchAccount } = useApi('/account/load', apiKey, {}, refetchIndex);
    
    const refetch = () => {
        refetchDomains();
        refetchAccount();
    }

    const handleNewDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
            .trim()
            .replace(/^(https?:\/\/)?(www\.)?/i, '')
            .split('/')[0];
        setNewDomain(value);
    };

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomain) return;
        setIsSubmitting(true);
        try {
            await apiFetchV4('/domains', apiKey, { method: 'POST', body: { Domain: newDomain } });
            addToast(t('domainAddedSuccess', { domain: newDomain }), 'success');
            setNewDomain('');
            setIsAddingDomain(false);
            refetch();
        } catch (err: any) {
            addToast(t('domainAddedError', { error: err.message }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const confirmDeleteDomain = async () => {
        if (!domainToDelete) return;
        try {
            await apiFetchV4(`/domains/${encodeURIComponent(domainToDelete)}`, apiKey, { method: 'DELETE' });
            addToast(t('domainDeletedSuccess', { domainName: domainToDelete }), 'success');
            refetch();
        } catch (err: any) {
            addToast(t('domainDeletedError', { error: err.message }), 'error');
        } finally {
            setDomainToDelete(null);
        }
    };
    
    const handleReverifyDomain = async (domainName: string) => {
        setVerifyingDomain(domainName);
        try {
            await apiFetchV4(`/domains/${encodeURIComponent(domainName)}/verify`, apiKey, { method: 'PUT' });
            addToast(`Verification check triggered for ${domainName}. Results will update shortly.`, 'success');
            setTimeout(() => {
                refetch();
                setVerifyingDomain(null);
            }, 3000); 
        } catch (err: any) {
            addToast(`Failed to trigger verification for ${domainName}: ${err.message}`, 'error');
            setVerifyingDomain(null);
        }
    };

    const domainsList = Array.isArray(data) ? data : (data && Array.isArray(data.Data)) ? data.Data : [];

    return (
        <div className="domains-view-container">
            <ConfirmModal
                isOpen={!!domainToDelete}
                onClose={() => setDomainToDelete(null)}
                onConfirm={confirmDeleteDomain}
                title={t('deleteDomain', { domainName: domainToDelete })}
                isDestructive
            >
                <p>{t('confirmDeleteDomain', { domainName: domainToDelete })}</p>
            </ConfirmModal>
            {domainToEdit && (
                <SetDefaultSenderModal
                    isOpen={!!domainToEdit}
                    onClose={() => setDomainToEdit(null)}
                    domain={domainToEdit}
                    apiKey={apiKey}
                    onSuccess={() => {
                        setDomainToEdit(null);
                        refetch();
                    }}
                />
            )}
            <SetAccountDefaultSenderModal
                isOpen={isAccountDefaultModalOpen}
                onClose={() => setIsAccountDefaultModalOpen(false)}
                apiKey={apiKey}
                onSuccess={() => {
                    setIsAccountDefaultModalOpen(false);
                    refetch();
                }}
            />
            <HowToModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />

            <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Icon style={{ color: 'var(--warning-color)', width: '2rem', height: '2rem' }}>{ICONS.STAR}</Icon>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('accountDefaultSender')}</h3>
                            {accountLoading ? <Loader/> : <strong style={{fontSize: '1.1rem'}}>{accountData?.defaultsender || t('notSet')}</strong>}
                        </div>
                    </div>
                    <Button className="btn-secondary" onClick={() => setIsAccountDefaultModalOpen(true)}>{t('change')}</Button>
                </div>
            </div>

            <div className="domains-description-header">
                <h2>{t('sendingDomains', {ns: 'domains'})}</h2>
                <p>{t('sendingDomainsDesc', {ns: 'domains'})}</p>
            </div>

            {loading && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}
            
            {!loading && !error && domainsList.length === 0 && (
                <EmptyState
                    icon={ICONS.DOMAINS}
                    title={t('noDomainsFound')}
                    message={t('noDomainsFoundDesc')}
                />
            )}

            {!loading && !error && domainsList.length > 0 && 
            <div className="table-container">
                <table className="simple-table">
                    <thead>
                        <tr>
                            <th>{t('domains')}</th>
                            <th>{t('status')}</th>
                            <th style={{ width: '1%', whiteSpace: 'nowrap', textAlign: i18n.dir() === 'rtl' ? 'left' : 'right' }}>{t('action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {domainsList.map((domain: any) => {
                             const domainName = domain.Domain || domain.domain;
                             if (!domainName) return null;

                             const cleanDomainName = cleanDomain(domainName);
                             
                             const getVerificationStyle = (isVerified: boolean) => isVerified ? getStatusStyle('Verified') : getStatusStyle('Missing');
                             
                             const isSpfVerified = String(domain.Spf || domain.spf).toLowerCase() === 'true';
                             const isDkimVerified = String(domain.Dkim || domain.dkim).toLowerCase() === 'true';
                             const isMxVerified = String(domain.MX || domain.mx).toLowerCase() === 'true';
                             const trackingStatus = domain.TrackingStatus || domain.trackingstatus;
                             const isTrackingVerified = String(trackingStatus).toLowerCase() === 'validated';
                             
                             return (
                                <React.Fragment key={domainName}>
                                <tr>
                                    <td><strong>{cleanDomainName}</strong></td>
                                    <td>
                                        <div className="domain-status-pills">
                                            <Badge text="SPF" type={getVerificationStyle(isSpfVerified).type} />
                                            <Badge text="DKIM" type={getVerificationStyle(isDkimVerified).type} />
                                            <Badge text="Tracking" type={getVerificationStyle(isTrackingVerified).type} />
                                            <Badge text="MX" type={getVerificationStyle(isMxVerified).type} />
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                                            <Button 
                                                className="btn-secondary" 
                                                onClick={() => setView('DomainVerification', { domain: cleanDomainName })}
                                            >
                                                <Icon>{ICONS.SETTINGS}</Icon>
                                                <span>{t('manage', { ns: 'domains' })}</span>
                                            </Button>
                                            <Button 
                                                className="btn-icon-danger" 
                                                onClick={() => setDomainToDelete(domainName)} 
                                                aria-label={t('deleteDomain', { domainName })}
                                            >
                                                <Icon>{ICONS.DELETE}</Icon>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                                </React.Fragment>
                             )
                        })}
                    </tbody>
                </table>
            </div>}
            
            <div className="add-domain-section">
                {isAddingDomain ? (
                    <form className="add-domain-form" onSubmit={handleAddDomain}>
                        <input
                            ref={newDomainInputRef}
                            type="text"
                            placeholder="example.com"
                            value={newDomain}
                            onChange={handleNewDomainChange}
                            disabled={isSubmitting}
                            autoFocus
                        />
                        <Button type="submit" className="btn-primary" disabled={!newDomain || isSubmitting} action="add_domain">
                            {isSubmitting ? <Loader /> : <>{t('addDomain')}</>}
                        </Button>
                    </form>
                ) : (
                    <Button className="btn-primary" onClick={() => setIsAddingDomain(true)} action="add_domain" style={{ padding: '0.75rem 2rem' }}>
                        <Icon>{ICONS.PLUS}</Icon> {t('newDomainButton', {ns: 'domains'})}
                    </Button>
                )}
                <button className="link-button" onClick={() => setIsHelpModalOpen(true)}>{t('howToAddDomainLink', {ns: 'domains'})}</button>
            </div>

        </div>
    );
};

export default DomainVerificationTab;
