import React from 'react';
import WizardLayout from './WizardLayout';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from '../Icon';

const Step4Settings = ({ onNext, onBack, data, updateData }: { onNext: () => void; onBack: () => void; data: any; updateData: (d: any) => void; }) => {
    const { t } = useTranslation(['send-wizard', 'sendEmail', 'common']);

    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        updateData({ [name]: type === 'checkbox' ? checked : value });
    };

    const handleUtmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const utmField = name.replace('utm_', ''); // e.g., utm_Source -> Source
        updateData({
            utm: {
                ...data.utm,
                [utmField]: value
            }
        });
    };

    const handleOptimizationToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isEnabled = e.target.checked;
        if (isEnabled) {
            // Default to the first option when enabling
            updateData({
                sendTimeOptimization: true,
                deliveryOptimization: 'ToEngagedFirst',
                enableSendTimeOptimization: false,
            });
        } else {
            // Reset everything when disabling
            updateData({
                sendTimeOptimization: false,
                deliveryOptimization: 'None',
                enableSendTimeOptimization: false,
            });
        }
    };

    const handleOptimizationChoiceChange = (choice: 'engaged' | 'optimal') => {
        if (choice === 'engaged') {
            updateData({
                deliveryOptimization: 'ToEngagedFirst',
                enableSendTimeOptimization: false,
            });
        } else if (choice === 'optimal') {
            updateData({
                deliveryOptimization: 'None',
                enableSendTimeOptimization: true,
            });
        }
    };

    const optimizationChoice = data.enableSendTimeOptimization ? 'optimal' : 'engaged';

    return (
        <WizardLayout
            title={t('campaignSettings')}
            onNext={onNext}
            onBack={onBack}
            nextDisabled={!data.campaignName}
        >
            <div className="wizard-step-intro">
                {/* FIX: Pass icon as child to Icon component */}
                <Icon>{ICONS.SETTINGS}</Icon>
                <p>{t('campaignSettings_desc')}</p>
            </div>
            <div className="wizard-settings-container">
                <div className="form-group">
                    <label htmlFor="campaignName">{t('campaignName', { ns: 'sendEmail' })}</label>
                    <input type="text" id="campaignName" name="campaignName" value={data.campaignName} onChange={handleSimpleChange} placeholder={t('campaignNamePlaceholder')} />
                </div>

                <hr className="form-separator" />
                
                <div className="wizard-settings-section">
                    <h4>{t('sending', { ns: 'sendEmail' })}</h4>
                    <div className="wizard-settings-toggle-group">
                        <label className="toggle-switch">
                            <input type="checkbox" name="sendTimeOptimization" checked={!!data.sendTimeOptimization} onChange={handleOptimizationToggle} />
                            <span className="toggle-slider"></span>
                        </label>
                        <label htmlFor="sendTimeOptimization" style={{ fontWeight: 500 }}>{t('sendTimeOptimization', { ns: 'sendEmail' })}</label>
                    </div>
                    {data.sendTimeOptimization && (
                        <div className="optimization-options">
                            <label className="custom-radio">
                                <input type="radio" name="optimizationChoice" value="engaged" checked={optimizationChoice === 'engaged'} onChange={() => handleOptimizationChoiceChange('engaged')} />
                                <span className="radio-checkmark"></span>
                                <span className="radio-label">{t('sendToEngagedFirst', { ns: 'sendEmail' })}</span>
                                <p className="radio-description">{t('sendToEngagedFirstDesc', { ns: 'sendEmail' })}</p>
                            </label>
                            <label className="custom-radio">
                                <input type="radio" name="optimizationChoice" value="optimal" checked={optimizationChoice === 'optimal'} onChange={() => handleOptimizationChoiceChange('optimal')} />
                                <span className="radio-checkmark"></span>
                                <span className="radio-label">{t('sendAtOptimalTime', { ns: 'sendEmail' })}</span>
                                <p className="radio-description">{t('sendAtOptimalTimeDesc', { ns: 'sendEmail' })}</p>
                            </label>
                        </div>
                    )}
                </div>

                <hr className="form-separator" />

                <div className="wizard-settings-section">
                    <h4>{t('tracking', { ns: 'sendEmail' })}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <label className="custom-checkbox">
                            <input type="checkbox" name="trackOpens" checked={!!data.trackOpens} onChange={handleSimpleChange} />
                            <span className="checkbox-checkmark"></span>
                            <span className="checkbox-label">{t('trackOpens', { ns: 'sendEmail' })}</span>
                        </label>
                        <label className="custom-checkbox">
                            <input type="checkbox" name="trackClicks" checked={!!data.trackClicks} onChange={handleSimpleChange} />
                            <span className="checkbox-checkmark"></span>
                            <span className="checkbox-label">{t('trackClicks', { ns: 'sendEmail' })}</span>
                        </label>
                    </div>
                </div>
                
                <hr className="form-separator" />

                <div className="wizard-settings-section">
                    <label className="custom-checkbox">
                        <input type="checkbox" name="utmEnabled" checked={!!data.utmEnabled} onChange={handleSimpleChange} />
                        <span className="checkbox-checkmark"></span>
                        <h4 className="checkbox-label" style={{ display: 'inline' }}>{t('googleAnalytics', { ns: 'sendEmail' })}</h4>
                    </label>

                    {data.utmEnabled && (
                        <div className="utm-fields-container">
                            <p>{t('utmDescription', { ns: 'sendEmail' })}</p>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="utm_Source">{t('utm_source')}</label>
                                    <input type="text" id="utm_Source" name="utm_Source" value={data.utm.Source} onChange={handleUtmChange} placeholder="Source" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="utm_Medium">{t('utm_medium')}</label>
                                    <input type="text" id="utm_Medium" name="utm_Medium" value={data.utm.Medium} onChange={handleUtmChange} placeholder="Medium" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="utm_Campaign">{t('utm_campaign')}</label>
                                    <input type="text" id="utm_Campaign" name="utm_Campaign" value={data.utm.Campaign} onChange={handleUtmChange} placeholder="Campaign" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="utm_Content">{t('utm_content')}</label>
                                    <input type="text" id="utm_Content" name="utm_Content" value={data.utm.Content} onChange={handleUtmChange} placeholder="Content" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </WizardLayout>
    );
};

export default Step4Settings;