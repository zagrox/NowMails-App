import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api/elasticEmail';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useTheme } from '../contexts/ThemeContext';
import { getErrorMessage } from '../utils/helpers';

const TOTAL_STEPS = 4;

const Step1 = ({ config, loading }: { config: any, loading: boolean }) => {
    const { t } = useTranslation(['onboarding', 'common']);
    const appName = t('appName');
    const logoUrl = config?.app_logo && config?.app_backend ? `${config.app_backend}/assets/${config.app_logo}` : '';

    return (
        <div className="onboarding-step">
            {loading ? (
                <div style={{ height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Loader />
                </div>
            ) : (
                logoUrl && <img src={logoUrl} alt={`${appName} Logo`} className="onboarding-logo" />
            )}
            <h2>{t('welcomeTitle', { appName })}</h2>
            <p>{t('welcomeSubtitle')}</p>
        </div>
    );
};

const Step2 = () => {
    const { t } = useTranslation(['onboarding', 'common', 'dashboard']);
    const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

    const features = [
        { icon: ICONS.SEND_EMAIL, title: t('emailBuilder', { ns: 'common' }), desc: t('emailBuilderDesc', { ns: 'dashboard' }) },
        { icon: ICONS.ACCOUNT, title: t('contacts', { ns: 'common' }), desc: t('contactsDesc', { ns: 'dashboard' }) },
        { icon: ICONS.TRENDING_UP, title: t('statistics', { ns: 'common' }), desc: t('statisticsDesc', { ns: 'dashboard' }) },
        { icon: ICONS.BELL, title: t('campaigns', { ns: 'common' }), desc: t('campaignsDesc', { ns: 'dashboard' }) },
        { icon: ICONS.SEGMENTS, title: t('segments', { ns: 'common' }), desc: t('segmentsDesc', { ns: 'dashboard' }) },
        { icon: ICONS.EMAIL_LISTS, title: t('emailLists', { ns: 'common' }), desc: t('emailListsDesc', { ns: 'dashboard' }) },
        { icon: ICONS.AI_ICON, title: t('aiAssistant'), desc: t('aiAssistantDesc'), isComingSoon: true },
        { icon: ICONS.VERIFY, title: t('validation'), desc: t('validationDesc'), isComingSoon: true },
    ];

    const activeFeature = features[activeFeatureIndex];

    const handleFeatureSelect = (index: number) => {
        // Allow selecting "coming soon" features to view their description,
        // but the button itself will appear disabled.
        setActiveFeatureIndex(index);
    };

    return (
        <div className="onboarding-step">
            <h2>{t('featuresTitle')}</h2>
            <p>{t('featuresSubtitle')}</p>
            <div className="onboarding-features-layout">
                <div className="features-list">
                    {features.map((feature, index) => (
                        <button
                            key={feature.title}
                            className={`feature-trigger ${index === activeFeatureIndex ? 'active' : ''} ${feature.isComingSoon ? 'coming-soon' : ''}`}
                            onClick={() => handleFeatureSelect(index)}
                        >
                            <Icon>{feature.icon}</Icon>
                            <div className="feature-trigger-text">
                                <span>{feature.title}</span>
                                {feature.isComingSoon && <span className="soon-badge">{t('soon')}</span>}
                            </div>
                        </button>
                    ))}
                </div>
                <div className="feature-display-panel">
                    {activeFeature && (
                        <div className="feature-display-content" key={activeFeature.title}>
                            <div className="feature-display-icon">
                                <Icon>{activeFeature.icon}</Icon>
                            </div>
                            <h3>{activeFeature.title}</h3>
                            <p>{activeFeature.desc}</p>
                            {activeFeature.isComingSoon && (
                                <>
                                    <div className="onboarding-feature-separator"></div>
                                    <button className="btn btn-soon" disabled>{t('comingSoon')}</button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Step3 = ({ data, setData }: { data: any, setData: Function }) => {
    const { t } = useTranslation(['onboarding', 'common', 'account']);
    const { setTheme } = useTheme();
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleTypeChange = (type: 'personal' | 'business') => {
        setData({ ...data, type });
    };
    
    const handleDisplayChange = (display: 'light' | 'dark' | 'auto') => {
        setTheme(display);
        setData({ ...data, display });
    };

    return (
        <div className="onboarding-step">
            <h2>{t('profileTitle')}</h2>
            <p>{t('profileSubtitle')}</p>
            <form className="auth-form" style={{maxWidth: '550px', margin: '0 auto', textAlign: 'start'}}>
                <div className="form-group">
                    <label>{t('accountType')}</label>
                    <div className="segmented-control" style={{width: '100%'}}>
                        <button type="button" onClick={() => handleTypeChange('personal')} className={data.type === 'personal' ? 'active' : ''}>{t('personal')}</button>
                        <button type="button" onClick={() => handleTypeChange('business')} className={data.type === 'business' ? 'active' : ''}>{t('business')}</button>
                    </div>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="mobile">{t('mobile', { ns: 'account' })}*</label>
                        <input id="mobile" name="mobile" type="tel" placeholder="+1 (555) 000-0000" value={data.mobile} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                        <label>{t('displayMode')}</label>
                        <div className="theme-switcher">
                            <button type="button" className={`theme-btn ${data.display === 'light' ? 'active' : ''}`} onClick={() => handleDisplayChange('light')}>
                                <Icon>{ICONS.SUN}</Icon>
                                <span>{t('light')}</span>
                            </button>
                            <button type="button" className={`theme-btn ${data.display === 'dark' ? 'active' : ''}`} onClick={() => handleDisplayChange('dark')}>
                                <Icon>{ICONS.MOON}</Icon>
                                <span>{t('dark')}</span>
                            </button>
                            <button type="button" className={`theme-btn ${data.display === 'auto' ? 'active' : ''}`} onClick={() => handleDisplayChange('auto')}>
                                <Icon>{ICONS.DESKTOP}</Icon>
                                <span>{t('auto')}</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                 {data.type === 'business' && (
                    <div className="form-group full-width">
                        <label htmlFor="company">{t('company', { ns: 'account' })}</label>
                        <input id="company" name="company" type="text" placeholder={t('company', { ns: 'account' })} value={data.company} onChange={handleInputChange} />
                    </div>
                )}

                <div className="form-group full-width">
                    <label htmlFor="website">{t('website', { ns: 'account' })}</label>
                    <input id="website" name="website" type="url" placeholder="https://example.com" value={data.website} onChange={handleInputChange} />
                </div>
            </form>
        </div>
    );
};

const Step4 = () => {
    const { t } = useTranslation(['onboarding', 'common']);
    return (
        <div className="onboarding-step">
            <div className="feature-display-icon">
                <Icon>{ICONS.VERIFY}</Icon>
            </div>
            <h2>{t('finalizeSetupTitle')}</h2>
            <p>{t('finalizeSetupSubtitle')}</p>
        </div>
    );
};

const OnboardingFlowView = ({ onComplete }: { onComplete: () => void }) => {
    const { t, i18n } = useTranslation(['onboarding', 'common', 'account', 'auth']);
    const { user, updateUser, updateUserEmail, createElasticSubaccount } = useAuth();
    const { addToast } = useToast();
    const { config, loading: configLoading } = useConfiguration();
    
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);

    const [profileData, setProfileData] = useState({
        type: 'personal',
        mobile: user?.mobile || '',
        language: 'english',
        display: 'auto',
        website: user?.website || '',
        company: user?.company || '',
    });

    const [apiKey, setApiKey] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [newUserFlowFailed, setNewUserFlowFailed] = useState(false);
    const [accountExistsState, setAccountExistsState] = useState<'none' | 'prompt' | 'newEmail' | 'apiKey'>('none');
    const [newEmail, setNewEmail] = useState('');

    const handleNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
    const handleBack = () => setStep(s => Math.max(s - 1, 1));

    const handleProfileSubmit = async () => {
        if (!profileData.type || !profileData.mobile) {
            addToast(t('pleaseFillRequiredFields', { ns: 'common' }), 'error');
            return;
        }
        setLoading(true);
        try {
            // Create a payload from the form state.
            const payload: any = { ...profileData, language: 'english', text_direction: 'ltr' };
    
            // Set theme_light and theme_dark for the main user record based on display choice.
            // The 'display' field itself will be passed through to be saved in the profile record.
            if (profileData.display === 'dark') {
                payload.theme_light = false;
                payload.theme_dark = true;
            } else {
                // Default to light theme for 'light' and 'auto' settings.
                payload.theme_light = true;
                payload.theme_dark = false;
            }

            await updateUser(payload);
            addToast(t('profileUpdateSuccess', { ns: 'account' }), 'success');
            handleNext();
        } catch (err: any) {
            addToast(t('profileUpdateError', { error: getErrorMessage(err), ns: 'account' }), 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const handleApiKeySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiFetch('/account/load', apiKey); // Validate key
            await updateUser({ elastickey: apiKey });
            addToast(t('apiKeyUpdateSuccess', { ns: 'account' }), 'success');
            onComplete();
        } catch (err: any) {
            addToast(getErrorMessage(err) || t('invalidApiKey'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setDemoLoading(true);
        const DEMO_API_KEY = 'CAA7DE853FEDA01F7D314E018B78FFD163F0C328F93352CAF663C2BDA732CBE91C7E0A6E218464A17EDD5A474668EBE5';
        try {
            await apiFetch('/account/load', DEMO_API_KEY); // Validate key
            await updateUser({ elastickey: DEMO_API_KEY });
            addToast(t('welcomeToDemo'), 'success');
            onComplete();
        } catch (err: any) {
            addToast(getErrorMessage(err) || t('invalidApiKey'), 'error');
        } finally {
            setDemoLoading(false);
        }
    };

    const handleFinalizeSetup = async () => {
        if (!user || !user.email) {
            addToast(t('userEmailNotFound'), 'error');
            return;
        }

        setLoading(true);
        setNewUserFlowFailed(false);
        setAccountExistsState('none');
        try {
            const randomPassword = Math.random().toString(36).slice(-12);
            await createElasticSubaccount(user.email, randomPassword);
            addToast(t('accountConnectedSuccess'), 'success');
        } catch (err: any) {
            const errorMessage = getErrorMessage(err);
            if (
                errorMessage.includes('AN ACCOUNT ALREADY EXISTS FOR THAT EMAIL ADDRESS') ||
                errorMessage.includes('Account creation timed out')
            ) {
                setAccountExistsState('prompt');
            } else {
                addToast(errorMessage, 'error');
                setNewUserFlowFailed(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateEmailAndRetry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !newEmail.includes('@')) {
            addToast("Please enter a valid email address.", 'error');
            return;
        }
        setLoading(true);
        try {
            await updateUserEmail(newEmail);
            addToast("Email updated successfully. Retrying account creation...", 'info');
            const randomPassword = Math.random().toString(36).slice(-12);
            await createElasticSubaccount(newEmail, randomPassword);
            addToast(t('accountConnectedSuccess'), 'success');
        } catch (err: any) {
            addToast(getErrorMessage(err), 'error');
            setAccountExistsState('newEmail');
        } finally {
            setLoading(false);
        }
    };
    
    const isProfileStepComplete = profileData.type && profileData.mobile && profileData.language;

    return (
        <div className="onboarding-container">
            <div className="onboarding-box">
                <div className="onboarding-progress">
                    <div className="progress-bar-wrapper">
                        <div className="progress-bar-inner" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}></div>
                    </div>
                </div>
                <div className="onboarding-content">
                    {step === 1 && <Step1 config={config} loading={configLoading} />}
                    {step === 2 && <Step2 />}
                    {step === 3 && <Step3 data={profileData} setData={setProfileData} />}
                    {step === 4 && (
                        <div className="onboarding-step">
                            {accountExistsState === 'none' && !newUserFlowFailed && <Step4 />}

                            {accountExistsState === 'prompt' && (
                                <div className="onboarding-step">
                                    <div className="feature-display-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                        <Icon style={{ color: 'var(--warning-color)' }}>{ICONS.COMPLAINT}</Icon>
                                    </div>
                                    <h2>{t('accountExistsTitle')}</h2>
                                    <p>{t('accountExistsSubtitle', { email: user?.email })}</p>
                                    <div className="onboarding-choice-group">
                                        <button className="btn btn-primary" onClick={() => setAccountExistsState('newEmail')}>
                                            {t('useDifferentEmail')}
                                        </button>
                                        <button className="btn" onClick={() => setAccountExistsState('apiKey')}>
                                            {t('useApiKey')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {accountExistsState === 'newEmail' && (
                                <form className="onboarding-api-key-form" onSubmit={handleUpdateEmailAndRetry}>
                                    <h2>{t('updateEmailTitle')}</h2>
                                    <p>{t('updateEmailSubtitle', { appName: t('appName') })}</p>
                                    <div className="input-group">
                                        <span className="input-icon"><Icon>{ICONS.MAIL}</Icon></span>
                                        <input name="newEmail" type="email" placeholder={t('emailAddress', { ns: 'auth' })} required value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                                    </div>
                                    <div className="form-actions" style={{ justifyContent: 'center', border: 'none', padding: '1rem 0 0' }}>
                                        <button type="button" className="btn btn-secondary" onClick={() => setAccountExistsState('prompt')} disabled={loading}>{t('back')}</button>
                                        <button type="submit" className="btn btn-primary" disabled={loading}>
                                            {loading ? <Loader /> : t('updateAndRetry')}
                                        </button>
                                    </div>
                                </form>
                            )}
                            
                            {accountExistsState === 'apiKey' && (
                                <form className="onboarding-api-key-form" onSubmit={handleApiKeySubmit}>
                                    <h2>{t('connectWithApiKeyTitle')}</h2>
                                    <p>{t('connectWithApiKeySubtitle')}</p>
                                    <div className="input-group has-btn">
                                        <span className="input-icon"><Icon>{ICONS.KEY}</Icon></span>
                                        <input name="apikey" type={showPassword ? "text" : "password"} placeholder={t('enterYourApiKey')} required value={apiKey} onChange={e => setApiKey(e.target.value)} />
                                        <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                            <Icon>{showPassword ? ICONS.EYE_OFF : ICONS.EYE}</Icon>
                                        </button>
                                    </div>
                                    <div className="form-actions" style={{ justifyContent: 'center', border: 'none', padding: '1rem 0 0' }}>
                                        <button type="button" className="btn btn-secondary" onClick={() => setAccountExistsState('prompt')} disabled={loading}>{t('back')}</button>
                                        <button type="submit" className="btn btn-primary" disabled={loading}>
                                            {loading ? <Loader /> : t('verifyAndFinish')}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {newUserFlowFailed && (
                                <form className="onboarding-api-key-form" onSubmit={handleApiKeySubmit}>
                                    <div className="info-message warning" style={{textAlign: 'left', maxWidth: '400px', margin: '2rem auto 0'}}>
                                        <strong>{t('setupFailed')}</strong>
                                        <p>{t('setupFailedManualPrompt')}</p>
                                    </div>
                                    <div className="input-group has-btn" style={{ maxWidth: '400px', margin: '1rem auto 0' }}>
                                        <span className="input-icon"><Icon>{ICONS.KEY}</Icon></span>
                                        <input name="apikey" type={showPassword ? "text" : "password"} placeholder={t('enterYourApiKey')} required value={apiKey} onChange={e => setApiKey(e.target.value)} />
                                        <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                            <Icon>{showPassword ? ICONS.EYE_OFF : ICONS.EYE}</Icon>
                                        </button>
                                    </div>
                                    <div className="form-actions" style={{ justifyContent: 'center', border: 'none', padding: '1rem 0 0', flexDirection: 'column', maxWidth: '400px', margin: '0 auto' }}>
                                        <button type="submit" className="btn btn-primary full-width" disabled={loading || demoLoading} style={{ marginBottom: '0.75rem' }}>
                                            {loading ? <Loader /> : t('verifyAndFinish')}
                                        </button>
                                        <button type="button" className="btn btn-secondary full-width" onClick={handleDemoLogin} disabled={loading || demoLoading}>
                                            {demoLoading ? <Loader /> : t('visitDemo')}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
                <div className="onboarding-actions">
                    <button className="btn btn-secondary" onClick={handleBack} disabled={step === 1 || loading || demoLoading} style={{ visibility: (step > 1 && accountExistsState === 'none' && !newUserFlowFailed) ? 'visible' : 'hidden' }}>
                        {t('back')}
                    </button>
                    {accountExistsState === 'none' && !newUserFlowFailed && (
                        <>
                            {step < 3 && <button className="btn btn-primary" onClick={handleNext}>{step === 1 ? t('getStarted') : t('nextStep')}</button>}
                            {step === 3 && <button className="btn btn-primary" onClick={handleProfileSubmit} disabled={loading || !isProfileStepComplete}>{loading ? <Loader/> : t('saveAndContinue')}</button>}
                            {step === 4 && (
                                <button className="btn btn-primary" onClick={handleFinalizeSetup} disabled={loading}>
                                    {loading ? <Loader /> : t('finishSetup')}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingFlowView;