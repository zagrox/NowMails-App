import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import { useConfiguration } from '../contexts/ConfigurationContext';

const ResetPasswordView = () => {
    const { resetPassword } = useAuth();
    const { t } = useTranslation(['auth', 'common']);
    const { addToast } = useToast();
    const { config } = useConfiguration();
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const hash = window.location.hash.substring(1);
        const hashQueryString = hash.split('?')[1] || '';
        const searchQueryString = window.location.search.substring(1) || '';
        const params = new URLSearchParams(hashQueryString || searchQueryString);
        const tokenFromUrl = params.get('token');

        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        }
    }, []);

    const handleResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!token) {
            addToast(t('invalidResetToken'), 'error');
            return;
        }

        const form = e.currentTarget;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
        const confirm_password = (form.elements.namedItem('confirm_password') as HTMLInputElement).value;

        if (password !== confirm_password) {
            addToast(t('passwordsDoNotMatch'), 'error');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token, password);
            addToast(t('passwordResetSuccessMessage'), 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } catch (err: any) {
            let errorMessage = err.message;
            if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
                errorMessage = err.errors[0].message;
            }
            addToast(errorMessage || t('unknownError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const goToLogin = () => {
        window.location.href = '/';
    }
    
    const appName = config?.app_name || 'MegaMail';
    const logoUrl = config?.app_logo && config?.app_backend ? `${config.app_backend}/assets/${config.app_logo}` : '';

    if (token) {
        return (
            <div className="auth-container">
                <div className="auth-split-layout">
                    <div className="auth-branding-panel">
                        <div className="auth-branding-content">
                            {logoUrl && <img src={logoUrl} alt={`${appName} logo`} className="auth-logo" />}
                            <h1>{t('brandingTitle', { ns: 'auth' })}</h1>
                            <p>{t('brandingSubtitle', { ns: 'auth', appName: appName })}</p>
                        </div>
                    </div>
                    <div className="auth-form-panel">
                        <div className="auth-box">
                            <h2>{t('resetPassword')}</h2>
                            <p>{t('resetPasswordSubtitle')}</p>
                            <form className="auth-form" onSubmit={handleResetSubmit}>
                                <fieldset disabled={loading} style={{ border: 'none', padding: 0, margin: 0, display: 'contents' }}>
                                    <div className="input-group has-btn">
                                        <Icon>{ICONS.LOCK}</Icon>
                                        <input name="password" type={showPassword ? "text" : "password"} placeholder={t('newPassword')} required autoComplete="new-password" />
                                        <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                            <Icon>{showPassword ? ICONS.EYE_OFF : ICONS.EYE}</Icon>
                                        </button>
                                    </div>
                                    <div className="input-group">
                                        <Icon>{ICONS.LOCK}</Icon>
                                        <input name="confirm_password" type="password" placeholder={t('confirmPassword')} required autoComplete="new-password" />
                                    </div>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? <Loader /> : t('resetPassword')}
                                    </button>
                                </fieldset>
                            </form>
                            <div className="auth-switch">
                                <button onClick={goToLogin} className="link-button">{t('backToSignIn')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="auth-container">
             <div className="auth-split-layout">
                <div className="auth-branding-panel">
                     <div className="auth-branding-content">
                        {logoUrl && <img src={logoUrl} alt={`${appName} logo`} className="auth-logo" />}
                        <h1>{t('brandingTitle', { ns: 'auth' })}</h1>
                        <p>{t('brandingSubtitle', { ns: 'auth', appName: appName })}</p>
                    </div>
                </div>
                <div className="auth-form-panel">
                    <div className="auth-box">
                        <h2>{t('resetPassword')}</h2>
                        <p>{t('resetPasswordSubtitle')}</p>
                        <div className="info-message warning">
                            <p>{t('invalidResetToken')}</p>
                        </div>
                        <div className="auth-switch">
                            <button onClick={goToLogin} className="link-button">{t('backToSignIn')}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordView;