import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from '../components/Icon';
import Button from '../components/Button';
import { AppActions } from '../config/actions';

const ApiKeyView = ({ apiKey: initialApiKey }: { apiKey: string, user: any }) => {
    const { t } = useTranslation(['account', 'common']);
    const [isKeyVisible, setIsKeyVisible] = useState(false);

    const maskedKey = initialApiKey ? `••••••••••••••••••••••••••••${initialApiKey.slice(-4)}` : '';

    return (
        <div>
            <div className="account-tab-card" style={{ marginBottom: '2rem' }}>
                <div className="account-tab-card-header">
                    <h3>{t('currentApiKey')}</h3>
                </div>
                <div className="account-tab-card-body">
                    <p>{t('apiKeyHiddenForSecurity')}</p>
                    <div className="secret-value-wrapper">
                        <input type="text" value={isKeyVisible ? initialApiKey : maskedKey} readOnly />
                    </div>
                    <div className="info-message warning" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                        <p style={{ margin: 0 }}><strong>{t('warning', { ns: 'common' })}:</strong> {t('apiKeyWarning')}</p>
                    </div>
                </div>
                <div className="form-actions" style={{ backgroundColor: 'var(--subtle-background)', justifyContent: 'flex-end' }}>
                    <Button
                        className="btn-secondary"
                        onClick={() => setIsKeyVisible(!isKeyVisible)}
                        action={AppActions.REVEAL_API_KEY}
                    >
                        <Icon>{isKeyVisible ? ICONS.EYE_OFF : ICONS.EYE}</Icon>
                        <span>{isKeyVisible ? t('hideKey') : t('revealKey')}</span>
                    </Button>
                </div>
            </div>

            <div className="account-tab-card">
                <div className="account-tab-card-header">
                    <h3>{t('exploreApiTitle')}</h3>
                </div>
                <div className="account-tab-card-body">
                    <p style={{ color: 'var(--subtle-text-color)', fontSize: '0.9rem', marginTop: 0, marginBottom: '1.5rem' }}>
                        {t('exploreApiDesc')}
                    </p>
                </div>
                <div className="form-actions" style={{ backgroundColor: 'var(--subtle-background)' }}>
                     <a href="https://megamail.readme.io/reference/" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                        <Icon>{ICONS.FILE_TEXT}</Icon>
                        <span>{t('apiDocs')}</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyView;