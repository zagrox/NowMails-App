import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import EmbedCodeCard from '../../components/EmbedCodeCard';
import Icon, { ICONS } from '../../components/Icon';
import Modal from '../../components/Modal';

const ShareTab = ({ apiKey }: { apiKey: string }) => {
    const { t } = useTranslation(['account', 'common']);
    const [showEmbedCode, setShowEmbedCode] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isAcknowledged, setIsAcknowledged] = useState(false);

    const handleGenerateClick = () => {
        setIsConfirmModalOpen(true);
    };

    const handleModalConfirm = () => {
        setShowEmbedCode(true);
        setIsConfirmModalOpen(false);
    };

    const handleModalClose = () => {
        setIsConfirmModalOpen(false);
        setIsAcknowledged(false); // Reset checkbox on close
    };

    if (showEmbedCode) {
        return <EmbedCodeCard apiKey={apiKey} />;
    }

    return (
        <>
            <Modal isOpen={isConfirmModalOpen} onClose={handleModalClose} title={t('securityWarningTitle')}>
                <div className="modal-form">
                    <p>{t('embedFeatureSecurityNotice')}</p>
                    <div className="form-group">
                        <label className="custom-checkbox" style={{ alignItems: 'flex-start', gap: '0.5rem' }}>
                            <input type="checkbox" checked={isAcknowledged} onChange={(e) => setIsAcknowledged(e.target.checked)} />
                            <span className="checkbox-checkmark" style={{ marginTop: '4px' }}></span>
                            <span className="checkbox-label" style={{ fontWeight: 'normal' }}>{t('iUnderstandTheRisks')}</span>
                        </label>
                    </div>
                    <div className="form-actions" style={{justifyContent: 'flex-end'}}>
                        <button type="button" className="btn" onClick={handleModalClose}>{t('cancel')}</button>
                        <button className="btn btn-danger" disabled={!isAcknowledged} onClick={handleModalConfirm}>
                            {t('proceed')}
                        </button>
                    </div>
                </div>
            </Modal>
        
            <div className="account-tab-content">
                <div className="account-tab-card">
                    <div className="account-tab-card-header">
                        <h3>{t('embedFeatureInfoTitle')}</h3>
                    </div>
                    <div className="account-tab-card-body">
                        <p>{t('embedFeatureInfoBody')}</p>
                        <div className="info-message warning">
                            <p><strong>{t('warning')}:</strong> {t('embedWarning')}</p>
                        </div>
                    </div>
                    <div className="form-actions" style={{justifyContent: 'flex-end'}}>
                        <button className="btn btn-primary" onClick={handleGenerateClick}>
                            <Icon>{ICONS.SHARE}</Icon>
                            <span>{t('generateEmbedCode')}</span>
                        </button>
                    </div>
                </div>

                <div className="account-tab-card">
                    <div className="account-tab-card-header">
                        <h3>{t('whitelabelAndCustomSetup')}</h3>
                    </div>
                    <div className="account-tab-card-body">
                        <p>{t('whitelabelInfo')}</p>
                        <a
                            href="https://zagrox.com/contact/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ maxWidth: '250px' }}
                        >
                            <Icon>{ICONS.MAIL}</Icon>
                            <span>{t('contactUsForDetails')}</span>
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ShareTab;