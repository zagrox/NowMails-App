

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';
import Icon, { ICONS } from '../components/Icon';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { getErrorMessage } from '../utils/helpers';

type AuthMode = 'login' | 'register' | 'forgot';

const AuthView = () => {
    const { login, register, requestPasswordReset, createInitialProfile } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const { t, i18n } = useTranslation(['auth', 'common']);
    const { addToast } = useToast();
    const { config, loading: configLoading } = useConfiguration();

    const formRef = useRef<HTMLFormElement>(null);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);
    const recaptchaWidgetId = useRef<number | null>(null);

    const onRecaptchaResolved = useCallback(async (token?: string) => {
        setLoading(true);
        const form = formRef.current;
        if (!form) {
            setLoading(false);
            return;
        }

        try {
            if (mode === 'login') {
                await login({ email: loginEmail, password: loginPassword }, token);
            } else if (mode === 'register') {
                const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                const password = (form.elements.namedItem('password') as HTMLInputElement).value;
                const confirm_password = (form.elements.namedItem('confirm_password') as HTMLInputElement).value;
                const first_name = (form.elements.namedItem('first_name') as HTMLInputElement).value;
                const last_name = (form.elements.namedItem('last_name') as HTMLInputElement).value;

                if (password !== confirm_password) {
                    throw new Error(t('passwordsDoNotMatch'));
                }
                const newUser = await register({ email, password, first_name, last_name }, token, config?.user_registration_role);
                
                if (newUser && newUser.id) {
                    await createInitialProfile(newUser.id);
                }

                addToast(t('registrationSuccessMessage'), 'success');
                setLoginEmail(email);
                setLoginPassword('');
                setMode('login');
            } else if (mode === 'forgot') {
                const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                await requestPasswordReset(email, token);
                addToast(t('passwordResetEmailSent'), 'success');
                setMode('login');
            }
        } catch (err: any) {
            const errorMessage = getErrorMessage(err);
            if (errorMessage.toLowerCase().includes('has to be unique') && errorMessage.toLowerCase().includes('email')) {
                addToast(t('emailAlreadyExists'), 'error');
            } else {
                addToast(errorMessage, 'error');
            }
        } finally {
            setLoading(false);
            if (config?.app_recaptcha && (window as any).grecaptcha && recaptchaWidgetId.current !== null) {
                (window as any).grecaptcha.reset(recaptchaWidgetId.current);
            }
        }
    }, [addToast, config, login, loginEmail, loginPassword, mode, register, requestPasswordReset, t, createInitialProfile]);
    
    useEffect(() => {
        if (!config?.app_recaptcha || !config.app_recaptcha_key) {
            return;
        }
    
        const checkGrecaptcha = () => {
            if ((window as any).grecaptcha?.render && recaptchaContainerRef.current && recaptchaWidgetId.current === null) {
                clearInterval(intervalId);
                try {
                    const widgetId = (window as any).grecaptcha.render(recaptchaContainerRef.current, {
                        sitekey: config.app_recaptcha_key,
                        size: 'invisible',
                        callback: onRecaptchaResolved,
                    });
                    recaptchaWidgetId.current = widgetId;
                } catch (e) {
                    console.error("Error rendering reCAPTCHA", e);
                }
            }
        };
    
        const intervalId = setInterval(checkGrecaptcha, 100);
        return () => {
            clearInterval(intervalId);
            if (recaptchaContainerRef.current) {
                recaptchaContainerRef.current.innerHTML = '';
            }
            recaptchaWidgetId.current = null;
        };
    }, [config, onRecaptchaResolved]);


    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (config?.app_recaptcha && (window as any).grecaptcha && recaptchaWidgetId.current !== null) {
            (window as any).grecaptcha.execute(recaptchaWidgetId.current);
        } else {
            onRecaptchaResolved();
        }
    };
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.has('register')) {
            setMode('register');
        }
    }, []);

    const getSubtitle = () => {
         if (mode === 'forgot') return t('forgotPasswordSubtitle');
         if (mode === 'login') return t('signInSubtitle');
         return t('createAccountSubtitle');
    };

    if (configLoading) {
        return (
            <div className="auth-container">
                <Loader />
            </div>
        );
    }

    const logoUrl = config?.app_logo && config?.app_backend ? `${config.app_backend}/assets/${config.app_logo}` : '';
    
    return (
        <div className="auth-container">
            <div className="auth-split-layout">
                <div className="auth-form-panel">
                    <div className="auth-box">
                        <h2>{mode === 'login' ? t('signIn') : mode === 'register' ? t('signUp') : t('forgotPasswordTitle')}</h2>
                        <p>{getSubtitle()}</p>

                        <form className="auth-form" ref={formRef} onSubmit={handleSubmit}>

                            {mode === 'login' ? (
                                <>
                                    <div className="input-group">
                                        <Icon>{ICONS.MAIL}</Icon>
                                        <input 
                                            name="email" 
                                            type="email" 
                                            placeholder={t('emailAddress')} 
                                            required
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            autoComplete="username"
                                        />
                                    </div>
                                    <div className="input-group has-btn">
                                        <Icon>{ICONS.LOCK}</Icon>
                                        <input 
                                            name="password" 
                                            type={showPassword ? "text" : "password"} 
                                            placeholder={t('password')} 
                                            required 
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            autoComplete="current-password"
                                        />
                                        <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                            <Icon>{showPassword ? ICONS.EYE_OFF : ICONS.EYE}</Icon>
                                        </button>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.9rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                                        <button type="button" className="link-button" onClick={() => setMode('forgot')}>
                                            {t('forgotPassword')}
                                        </button>
                                    </div>
                                </>
                            ) : mode === 'register' ? (
                                <>
                                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="input-group">
                                            <Icon>{ICONS.ACCOUNT}</Icon>
                                            <input name="first_name" type="text" placeholder={t('firstName')} required autoComplete="given-name" />
                                        </div>
                                        <div className="input-group">
                                            <Icon>{ICONS.ACCOUNT}</Icon>
                                            <input name="last_name" type="text" placeholder={t('lastName')} required autoComplete="family-name" />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <Icon>{ICONS.MAIL}</Icon>
                                        <input name="email" type="email" placeholder={t('emailAddress')} required autoComplete="username" />
                                    </div>
                                    <div className="input-group has-btn">
                                        <Icon>{ICONS.LOCK}</Icon>
                                        <input name="password" type={showPassword ? "text" : "password"} placeholder={t('password')} required autoComplete="new-password" />
                                        <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                                            <Icon>{showPassword ? ICONS.EYE_OFF : ICONS.EYE}</Icon>
                                        </button>
                                    </div>
                                    <div className="input-group has-btn">
                                        <Icon>{ICONS.LOCK}</Icon>
                                        <input name="confirm_password" type={showConfirmPassword ? "text" : "password"} placeholder={t('confirmPassword')} required autoComplete="new-password" />
                                        <button type="button" className="input-icon-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                            <Icon>{showConfirmPassword ? ICONS.EYE_OFF : ICONS.EYE}</Icon>
                                        </button>
                                    </div>
                                </>
                            ) : ( // mode === 'forgot'
                                <div className="input-group">
                                    <Icon>{ICONS.MAIL}</Icon>
                                    <input name="email" type="email" placeholder={t('emailAddress')} required autoComplete="email" />
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? <Loader /> : (mode === 'forgot' ? t('sendResetLink') : mode === 'login' ? t('signIn') : t('signUp'))}
                            </button>
                            <div ref={recaptchaContainerRef} />
                        </form>

                        <div className="auth-switch">
                            {mode === 'login' ? (
                                <>
                                    <p>{t('noAccount')}</p>
                                    <button type="button" className="auth-switch-button" onClick={() => setMode('register')}>{t('signUpNow')}</button>
                                </>
                            ) : mode === 'register' ? (
                                <>
                                    <p>{t('alreadyHaveAccount')}</p>
                                    <button type="button" className="auth-switch-button" onClick={() => setMode('login')}>{t('signIn')}</button>
                                </>
                            ) : (
                                <button type="button" className="link-button" onClick={() => setMode('login')}>{t('backToSignIn')}</button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="auth-branding-panel">
                    <div className="auth-branding-content">
                        {logoUrl && <img src={logoUrl} alt={`${t('appName')} logo`} className="auth-logo" />}
                        <h1>{t('appName').toUpperCase()}</h1>
                        <h2>{t('brandingTitle', { ns: 'auth' })}</h2>
                        <p>{t('brandingSubtitle', { ns: 'auth', appName: t('appName') })}</p>
                        {config?.app_version && (
                            <div className="auth-app-version">
                                App Version {config.app_version}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthView;