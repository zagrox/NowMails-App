import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './contexts/AuthContext';
import { useConfiguration } from './contexts/ConfigurationContext';
import { ICONS } from './components/Icon';
import CenteredMessage from './components/CenteredMessage';
import Loader from './components/Loader';
import AuthView from './views/AuthView';
import OnboardingFlowView from './views/OnboardingFlowView';
import DashboardView from './views/DashboardView';
import StatisticsView from './views/StatisticsView';
import AccountView from './views/AccountView';
import BuyCreditsView from './views/BuyCreditsView';
import ContactsView from './views/ContactsView';
import EmailListView from './views/EmailListView';
import SegmentsView from './views/SegmentsView';
import MediaManagerView from './views/MediaManagerView';
import EmailBuilderView from './views/EmailBuilderView';
import SendEmailView from './views/SendEmailView';
import MarketingView from './views/SendWizardView';
import CampaignsView from './views/CampaignsView';
import CampaignDetailView from './views/CampaignDetailView';
import TemplatesView from './views/TemplatesView';
import GalleryView from './views/GalleryView';
import SettingsView from './views/SettingsView';
import CalendarView from './views/CalendarView';
import Icon from './components/Icon';
import EmbedView from './views/EmbedView';
import ResetPasswordView from './views/ResetPasswordView';
import CallbackView from './views/CallbackView';
import { List, Template } from './api/types';
import ListDetailView from './views/ListDetailView';
import ContactDetailView from './views/ContactDetailView';
import UnlockModuleModal from './components/UnlockModuleModal';
import OfflinePaymentView from './views/OfflinePaymentView';
import InvoiceView from './views/InvoiceView';
import CustomFieldsView from './views/CustomFieldsView';
import { useToast } from './contexts/ToastContext';
import emitter from './api/eventEmitter';
import UnsavedChangesModal from './components/UnsavedChangesModal';
import GuidesView from './views/GuidesView';
import { useTheme } from './contexts/ThemeContext';
import Tooltip from './components/Tooltip';
import DomainVerificationView from './views/DomainVerificationView';
import ChatWidget from './components/ChatWidget';
import sdk, { authenticatedRequest } from './api/directus';
import { readItems } from '@directus/sdk';
import useApi from './views/useApi';
import Modal from './components/Modal';


const PWAInstallModal = ({ onClose, appName }: { onClose: () => void; appName: string; }) => {
    const { t } = useTranslation(['account', 'common']);

    const getOS = () => {
        const userAgent = window.navigator.userAgent;
        if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) return 'iOS'; // Check for MSStream for Windows phones
        if (/Android/.test(userAgent)) return 'Android';
        return 'Desktop';
    };

    const os = getOS();

    const getInstructions = () => {
        switch (os) {
            case 'iOS':
                return (
                    <div className="pwa-install-instructions">
                        <p>{t('installInstructionsIOS')}</p>
                        <div className="instruction-icon-ios">
                            <Icon>{ICONS.SHARE}</Icon>
                            <span>&rarr;</span>
                            <Icon>{ICONS.PLUS}</Icon>
                        </div>
                    </div>
                );
            case 'Android':
                return <p>{t('installInstructionsAndroid')}</p>;
            default:
                return <p>{t('installInstructionsDesktop', { appName })}</p>;
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={t('installInstructionsTitle')}>
            <div className="pwa-install-modal-content">
                {getInstructions()}
                <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <button className="btn" onClick={onClose}>
                        {t('close', { ns: 'common' })}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


const App = () => {
    const { isAuthenticated, user, logout, hasModuleAccess, loading: authLoading, allModules, moduleToUnlock, setModuleToUnlock, updateUser } = useAuth();
    const { config, loading: configLoading } = useConfiguration();
    const { t, i18n } = useTranslation(['common', 'emailLists', 'contacts', 'buyCredits', 'account', 'chat']);
    const { addToast } = useToast();
    const { theme, setTheme } = useTheme();
    const { data: accountData, loading: accountLoading } = useApi('/account/load', user?.elastickey ?? '', {}, user?.elastickey ? 1 : 0);
    const [view, setView] = useState('Dashboard');
    const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
    const [isNewFromGallery, setIsNewFromGallery] = useState(false);
    const [campaignToLoad, setCampaignToLoad] = useState<any | null>(null);
    const [selectedList, setSelectedList] = useState<List | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
    const [selectedContactEmail, setSelectedContactEmail] = useState<string | null>(null);
    const [contactDetailOrigin, setContactDetailOrigin] = useState<{ view: string, data: any } | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [orderToResume, setOrderToResume] = useState<any | null>(null);
    const [orderForOfflinePayment, setOrderForOfflinePayment] = useState<any | null>(null);
    const [orderForInvoice, setOrderForInvoice] = useState<any | null>(null);
    const [domainToVerify, setDomainToVerify] = useState<string | null>(null);
    const appContainerRef = useRef<HTMLDivElement>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const storedValue = localStorage.getItem('sidebarCollapsed');
        return storedValue === null ? false : storedValue === 'true';
    });

    const emailBuilderRef = useRef<{ save: () => Promise<boolean> } | null>(null);
    const [isBuilderDirty, setIsBuilderDirty] = useState(false);
    const [leaveConfirmationState, setLeaveConfirmationState] = useState<{
        isOpen: boolean;
        targetView: string;
        targetData: any;
    }>({
        isOpen: false,
        targetView: '',
        targetData: null,
    });

    // Header state
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // PWA Install state
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState(false);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
    }, [isSidebarCollapsed]);

    const toggleSidebarCollapse = () => {
        setIsSidebarCollapsed(prev => !prev);
    };

    // --- PWA INSTALLATION LOGIC ---
    useEffect(() => {
        // Check if the app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsAppInstalled(true);
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // --- GLOBAL NOTIFICATION LOGIC ---
    useEffect(() => {
        if (!user || !user.id || user.isApiKeyUser) {
            return;
        }
        
        const fetchUnreadCount = async () => {
            try {
                const filter = {
                    _and: [
                        { status: { _eq: 'published' } },
                        { read_status: { _eq: false } },
                        {
                            _or: [
                                { recipient: { _eq: user.id } },
                                { is_system_wide: { _eq: true } }
                            ]
                        }
                    ]
                };
                const response = await authenticatedRequest<any[]>((readItems as any)('notifications', {
                    aggregate: { count: '*' },
                    filter
                }));
                
                if (response && response.length > 0 && (response[0] as any).count) {
                     setUnreadCount(Number((response[0] as any).count));
                }
            } catch (error: any) {
                // If it's a token expiry, authenticatedRequest handles the event dispatch and rejects the promise.
                // We avoid logging it as a warning here because the logout event handler will take over.
                if (error.message === "Session expired. Logging out.") {
                    return;
                }
                console.warn("Failed to fetch unread notification count:", error);
            }
        };

        fetchUnreadCount();
        const intervalId = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds

        return () => clearInterval(intervalId);
    }, [user]);

    // --- USER MENU LOGIC ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (user?.display && user.display !== theme) {
            setTheme(user.display);
        }
    }, [user?.display, setTheme, theme]);

    useEffect(() => {
        const handleForbidden = () => {
            addToast(t('permissionDeniedError'), 'error');
        };

        const handleTokenExpired = () => {
            // When a token expires (on load, during login, or mid-session),
            // the most reliable user feedback is to simply log them out.
            // This avoids race conditions with loading states that could show
            // an unnecessary "Session Expired" toast. The user is returned to the
            // login screen, which is a clear indication that their session ended.
            logout(); // Force logout
        };

        emitter.addEventListener('apiForbidden', handleForbidden);
        emitter.addEventListener('auth:tokenExpired', handleTokenExpired);
        
        return () => {
            emitter.removeEventListener('apiForbidden', handleForbidden);
            emitter.removeEventListener('auth:tokenExpired', handleTokenExpired);
        };
    }, [addToast, t, logout]);

    useEffect(() => {
        if (i18n.language !== 'en') {
            i18n.changeLanguage('en');
        }
    }, [i18n]);

    useEffect(() => {
        const hash = window.location.hash.substring(1);
        if (hash === 'account-orders') {
            sessionStorage.setItem('account-tab', 'orders');
            setView('Account');
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }, []);

    const urlParams = new URLSearchParams(window.location.search);
    const isEmbedMode = urlParams.get('embed') === 'true';
    
    const hash = window.location.hash.substring(1);
    const [hashPath] = hash.split('?');
    const pathname = window.location.pathname;
    const isResetPasswordMode = hashPath.startsWith('/reset-password') || pathname.startsWith('/reset-password');
    const isCallbackMode = hashPath.startsWith('/callback') || pathname.startsWith('/callback');

    useEffect(() => {
        if (!isEmbedMode) {
            document.documentElement.lang = 'en';
            document.documentElement.dir = 'ltr';
        }
    }, [isEmbedMode]);

    const appName = t('appName');

    useEffect(() => {
        if (!config) return;
    
        document.title = appName;
    
        const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        const appleTouchIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
        if (config.app_logo && config.app_backend && favicon) {
            const iconUrl = `${config.app_backend}/assets/${config.app_logo}`;
            favicon.href = iconUrl;
            if (appleTouchIcon) {
                appleTouchIcon.href = iconUrl;
            }
        }

        if (config.app_backend) {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'SET_BACKEND_URL', url: config.app_backend });
            }
        }
    
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (config.app_secondary_color) {
            if (themeColorMeta) {
                themeColorMeta.setAttribute('content', config.app_secondary_color);
            }
            document.documentElement.style.setProperty('--secondary-color', config.app_secondary_color);
        }
        if (config.app_secondary_color_dark) {
            document.documentElement.style.setProperty('--secondary-color-dark', config.app_secondary_color_dark);
        }
    
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink && config.app_backend) {
            const manifest = {
                "name": `${appName} - Email Marketing Platform`,
                "short_name": appName,
                "description": `Your complete email marketing solution, powered by ${appName}.`,
                "start_url": window.location.origin,
                "display": "standalone",
                "background_color": "#F7F9FC",
                "theme_color": config.app_secondary_color || "#1A2B3C",
                "orientation": "portrait-primary",
                "icons": [
                    {
                        "src": `${config.app_backend}/assets/${config.app_logo}`,
                        "type": "image/png",
                        "purpose": "any maskable",
                        "sizes": "512x512"
                    }
                ]
            };
            const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
            const manifestUrl = URL.createObjectURL(manifestBlob);
            manifestLink.setAttribute('href', manifestUrl);
        }
    }, [config, appName]);
    
    useEffect(() => {
        const container = appContainerRef.current;
        if (!container || isEmbedMode) return;

        let touchStartX: number | null = null;
        let touchStartY: number | null = null;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;

            const touchX = e.touches[0].clientX;
            const screenWidth = window.innerWidth;
            const edgeThreshold = 40;

            const isNearLeftEdge = touchX < edgeThreshold;

            if (isNearLeftEdge) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            } else {
                touchStartX = null;
                touchStartY = null;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isMobileMenuOpen || touchStartX === null || touchStartY === null) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            
            const deltaX = currentX - touchStartX;
            const deltaY = currentY - touchStartY;
            
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                touchStartX = null;
                touchStartY = null;
                return;
            }

            const swipeThreshold = 50;
            if (Math.abs(deltaX) < swipeThreshold) return;
            
            if (deltaX > 0) {
                e.preventDefault();
                setIsMobileMenuOpen(true);
                
                touchStartX = null;
                touchStartY = null;
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
        };
    }, [isMobileMenuOpen, isEmbedMode, setIsMobileMenuOpen]);

    if (configLoading) {
        return <CenteredMessage style={{height: '100vh'}}><Loader /></CenteredMessage>;
    }

    if (isResetPasswordMode) return <ResetPasswordView />;
    if (isCallbackMode) return <CallbackView />;
    if (isEmbedMode) return <EmbedView />;
    if (authLoading && !user) return <CenteredMessage style={{height: '100vh'}}><Loader /></CenteredMessage>;
    if (!isAuthenticated) return <AuthView />;
    if (!user?.elastickey) return <OnboardingFlowView onComplete={() => {}} />;
    
    const apiKey = user?.elastickey;

    const handleLogout = () => {
        setIsUserMenuOpen(false);
        logout();
        setView('Dashboard');
    };

    const handleSetView = (newView: string, data?: { template?: Template; galleryTemplate?: Template; list?: List; contactEmail?: string; origin?: { view: string, data: any }, campaignToLoad?: any, campaign?: any, orderToResume?: any, order?: any, domain?: string }, options?: { ignoreDirty?: boolean }) => {
        if (!options?.ignoreDirty && view === 'Email Builder' && isBuilderDirty && newView !== 'Email Builder') {
            setLeaveConfirmationState({ isOpen: true, targetView: newView, targetData: data });
            return;
        }

        const templateForBuilder = data?.template || data?.galleryTemplate || null;
        const isFromGallery = !!data?.galleryTemplate;

        if (newView === 'Email Builder' && templateForBuilder) {
            setTemplateToEdit(templateForBuilder);
            setIsNewFromGallery(isFromGallery);
        } else {
            setTemplateToEdit(null);
            setIsNewFromGallery(false);
        }

        if ((newView === 'Send Email' || newView === 'Marketing') && data?.campaignToLoad) {
            setCampaignToLoad(data.campaignToLoad);
        } else if (newView !== 'Send Email' && newView !== 'Marketing') {
            setCampaignToLoad(null);
        }

        if (newView === 'ListDetail' && data?.list) setSelectedList(data.list);
        else if (newView !== 'ContactDetail') setSelectedList(null);
        
        if (newView === 'ContactDetail' && data?.contactEmail) {
            setSelectedContactEmail(data.contactEmail);
            setContactDetailOrigin(data.origin || { view: 'Contacts', data: {} });
        } else {
            setSelectedContactEmail(null);
            if (!data?.origin) setContactDetailOrigin(null);
        }

        if (newView === 'CampaignDetail' && data?.campaign) {
            setSelectedCampaign(data.campaign);
        } else {
            setSelectedCampaign(null);
        }

        if (newView === 'Buy Credits' && data?.orderToResume) {
            setOrderToResume(data.orderToResume);
        } else {
            setOrderToResume(null);
        }

        if (newView === 'OfflinePayment' && data?.order) {
            setOrderForOfflinePayment(data.order);
        } else {
            setOrderForOfflinePayment(null);
        }

        if (newView === 'Invoice' && data?.order) {
            setOrderForInvoice(data.order);
        } else {
            setOrderForInvoice(null);
        }

        if (newView === 'DomainVerification' && data?.domain) {
            setDomainToVerify(data.domain);
        } else {
            setDomainToVerify(null);
        }

        setView(newView);
        setIsMobileMenuOpen(false);
    }
    
    const handleLeaveConfirmation = () => {
        setIsBuilderDirty(false);
        const { targetView, targetData } = leaveConfirmationState;
        setLeaveConfirmationState({ isOpen: false, targetView: '', targetData: null });
        setTimeout(() => {
            handleSetView(targetView, targetData, { ignoreDirty: true });
        }, 0);
    };

    const handleCancelLeave = () => {
        setLeaveConfirmationState({ isOpen: false, targetView: '', targetData: null });
    };

    const handleSaveAndLeave = async () => {
        if (emailBuilderRef.current) {
            const success = await emailBuilderRef.current.save();
            if (success) {
                setIsBuilderDirty(false); 
                const { targetView, targetData } = leaveConfirmationState;
                setLeaveConfirmationState({ isOpen: false, targetView: '', targetData: null });
                setTimeout(() => {
                    handleSetView(targetView, targetData, { ignoreDirty: true });
                }, 0);
            }
        }
    };

    const handleUserMenuItemClick = (view: string, tab?: string) => {
        if (tab) {
            sessionStorage.setItem(`${view.toLowerCase()}-tab`, tab);
        }
        handleSetView(view);
        setIsUserMenuOpen(false);
    };

    const handleNotificationsClick = () => {
        sessionStorage.setItem('account-tab', 'notifications');
        handleSetView('Account');
    };
    
    const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
        setTheme(newTheme);
        if (user && !user.isApiKeyUser) {
            const payload: any = { display: newTheme };
            if (newTheme === 'dark') {
                payload.theme_light = false;
                payload.theme_dark = true;
            } else {
                payload.theme_light = true;
                payload.theme_dark = false;
            }
            updateUser(payload).catch(error => {
                console.warn("Failed to sync theme preference:", error);
            });
        }
    };

    const handleInstallClick = () => {
        setIsUserMenuOpen(false); // Close the menu if open
        if (installPrompt) {
            installPrompt.prompt();
            // The prompt can only be used once. Listen for the user's choice
            installPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
                if (choiceResult.outcome === 'accepted') {
                    setIsAppInstalled(true); // Hide install buttons after successful installation
                }
                setInstallPrompt(null); // Clear the prompt regardless of choice
            });
        } else {
            // If no prompt, it's likely Safari or another unsupported browser
            setIsPWAInstallModalOpen(true);
        }
    };

    const views: Record<string, { component: ReactNode, title: string, icon: React.ReactNode }> = {
        'Dashboard': { component: <DashboardView setView={handleSetView} apiKey={apiKey} user={user} />, title: t('dashboard'), icon: ICONS.DASHBOARD },
        'Statistics': { component: <StatisticsView apiKey={apiKey} />, title: t('statistics'), icon: ICONS.STATISTICS },
        'Account': { component: <AccountView apiKey={apiKey} user={user} setView={handleSetView} allModules={allModules} hasModuleAccess={hasModuleAccess} isAppInstalled={isAppInstalled} handleInstallClick={handleInstallClick} />, title: t('account'), icon: ICONS.ACCOUNT },
        'Buy Credits': { component: <BuyCreditsView apiKey={apiKey} user={user} setView={handleSetView} orderToResume={orderToResume} />, title: t('buyCredits'), icon: ICONS.BUY_CREDITS },
        'OfflinePayment': { component: <OfflinePaymentView order={orderForOfflinePayment} setView={handleSetView} />, title: t('offlinePaymentTitle', { ns: 'buyCredits' }), icon: ICONS.PENCIL },
        'Invoice': { component: <InvoiceView order={orderForInvoice} setView={handleSetView} />, title: t('invoiceTitle', { ns: 'orders' }), icon: ICONS.FILE_TEXT },
        'Contacts': { component: <ContactsView apiKey={apiKey} setView={handleSetView} />, title: t('contacts'), icon: ICONS.CONTACTS },
        'Email Lists': { component: <EmailListView apiKey={apiKey} setView={handleSetView} />, title: t('emailLists'), icon: ICONS.EMAIL_LISTS },
        'ListDetail': { component: <ListDetailView apiKey={apiKey} list={selectedList} setView={handleSetView} onBack={() => handleSetView('Email Lists')} />, title: selectedList ? t('contactsInList', { listName: selectedList.ListName }) : t('contacts'), icon: ICONS.CONTACTS },
        'ContactDetail': { component: <ContactDetailView apiKey={apiKey} contactEmail={selectedContactEmail || ''} onBack={() => contactDetailOrigin ? handleSetView(contactDetailOrigin.view, contactDetailOrigin.data) : handleSetView('Contacts')} />, title: selectedContactEmail || t('contactDetails'), icon: ICONS.ACCOUNT },
        'Segments': { component: <SegmentsView apiKey={apiKey} />, title: t('segments'), icon: ICONS.SEGMENTS },
        'Custom Fields': { component: <CustomFieldsView apiKey={apiKey} />, title: t('customFields'), icon: ICONS.HASH },
        'Media Manager': { component: <MediaManagerView apiKey={apiKey} />, title: t('mediaManager'), icon: ICONS.FOLDER },
        'Campaigns': { component: <CampaignsView apiKey={apiKey} setView={handleSetView} />, title: t('campaigns'), icon: ICONS.MAIL },
        'CampaignDetail': { component: <CampaignDetailView apiKey={apiKey} campaign={selectedCampaign} onBack={() => handleSetView('Campaigns')} />, title: selectedCampaign?.Name || t('campaigns'), icon: ICONS.MAIL },
        'Templates': { component: <TemplatesView apiKey={apiKey} setView={handleSetView} />, title: t('templates'), icon: ICONS.ARCHIVE },
        'Gallery': { component: <GalleryView setView={handleSetView} />, title: t('gallery'), icon: ICONS.IMAGE },
        'Email Builder': { component: <EmailBuilderView ref={emailBuilderRef} apiKey={apiKey} user={user} templateToEdit={templateToEdit} setView={handleSetView} onDirtyChange={setIsBuilderDirty} isNewFromGallery={isNewFromGallery} />, title: t('emailBuilder'), icon: ICONS.LAYERS },
        'Send Email': { component: <SendEmailView apiKey={apiKey} setView={handleSetView} campaignToLoad={campaignToLoad} />, title: t('sendEmail'), icon: ICONS.SEND_EMAIL },
        'Marketing': { component: <MarketingView apiKey={apiKey} setView={handleSetView} campaignToLoad={campaignToLoad} />, title: t('marketingCampaign'), icon: ICONS.TARGET },
        'Calendar': { component: <CalendarView />, title: t('calendar'), icon: ICONS.CALENDAR },
        'Settings': { component: <SettingsView apiKey={apiKey} user={user} setView={handleSetView} />, title: t('settings', { ns: 'account' }), icon: ICONS.SETTINGS },
        'DomainVerification': { component: <DomainVerificationView domainName={domainToVerify || ''} apiKey={apiKey} onBack={() => { sessionStorage.setItem('settings-tab', 'domains'); handleSetView('Settings'); }} />, title: t('domainVerification', { ns: 'domains' }), icon: ICONS.DOMAINS },
        'Guides': { component: <GuidesView />, title: t('guides'), icon: ICONS.HELP_CIRCLE },
    };

    const navGroups = [
        {
            title: null,
            items: [
                { name: t('dashboard'), view: 'Dashboard', icon: ICONS.DASHBOARD },
                { name: t('statistics'), view: 'Statistics', icon: ICONS.STATISTICS },
            ],
        },
        {
            title: t('audience'),
            items: [
                { name: t('contacts'), view: 'Contacts', icon: ICONS.CONTACTS },
                { name: t('emailLists'), view: 'Email Lists', icon: ICONS.EMAIL_LISTS },
            ],
        },
        {
            title: t('contents'),
            items: [
                { name: t('gallery'), view: 'Gallery', icon: ICONS.IMAGE },
                { name: t('templates'), view: 'Templates', icon: ICONS.ARCHIVE },
                { name: t('emailBuilder'), view: 'Email Builder', icon: ICONS.LAYERS },
                { name: t('mediaManager'), view: 'Media Manager', icon: ICONS.FOLDER },
            ],
        },
        {
            title: t('campaigns'),
            items: [
                { name: t('campaigns'), view: 'Campaigns', icon: ICONS.MAIL },
                { name: t('sendEmail'), view: 'Send Email', icon: ICONS.SEND_EMAIL },
                { name: t('marketing'), view: 'Marketing', icon: ICONS.TARGET },
                { name: t('calendar'), view: 'Calendar', icon: ICONS.CALENDAR },
            ],
        },
    ];

    const currentViewData = views[view] || views['Dashboard'];

    return (
        <div ref={appContainerRef} className={`app-container ${isMobileMenuOpen ? 'mobile-menu-open' : ''} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ltr`}>
            <aside className="app-sidebar">
                <div className="sidebar-header">
                    <a href="/" className="sidebar-logo-link">
                        {config?.app_logo && config.app_backend && <img src={`${config.app_backend}/assets/${config.app_logo}`} alt="Logo" className="sidebar-logo" />}
                        {!isSidebarCollapsed && <span className="app-name">{appName}</span>}
                    </a>
                    <button className="sidebar-toggle" onClick={toggleSidebarCollapse}>
                        <Icon>{isSidebarCollapsed ? ICONS.CHEVRON_RIGHT : ICONS.CHEVRON_LEFT}</Icon>
                    </button>
                </div>
                <nav className="sidebar-nav">
                    {navGroups.map((group, groupIndex) => (
                        <div className="nav-group" key={groupIndex}>
                            {group.title && !isSidebarCollapsed && <h5 className="nav-group-title">{group.title}</h5>}
                            <ul>
                                {group.items.map(item => (
                                    <li key={item.view}>
                                        <Tooltip text={isSidebarCollapsed ? item.name : ''}>
                                            <button className={`nav-item ${view === item.view ? 'active' : ''}`} onClick={() => handleSetView(item.view)}>
                                                <Icon>{item.icon}</Icon>
                                                {!isSidebarCollapsed && <span className="nav-item-label">{item.name}</span>}
                                            </button>
                                        </Tooltip>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
                 <div className="sidebar-footer">
                    <ul>
                        <li>
                            <Tooltip text={isSidebarCollapsed ? t('buyCredits') : ''}>
                                <button className={`nav-item ${view === 'Buy Credits' ? 'active' : ''}`} onClick={() => handleSetView('Buy Credits')}>
                                    <Icon>{ICONS.BUY_CREDITS}</Icon>
                                    {!isSidebarCollapsed && <span className="nav-item-label">{t('buyCredits')}</span>}
                                </button>
                            </Tooltip>
                        </li>
                        <li>
                            <Tooltip text={isSidebarCollapsed ? t('settings', { ns: 'account' }) : ''}>
                                <button className={`nav-item ${view === 'Settings' ? 'active' : ''}`} onClick={() => handleSetView('Settings')}>
                                    <Icon>{ICONS.SETTINGS}</Icon>
                                    {!isSidebarCollapsed && <span className="nav-item-label">{t('settings', { ns: 'account' })}</span>}
                                </button>
                            </Tooltip>
                        </li>
                    </ul>
                </div>
            </aside>
            <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="app-main">
                <header className="app-header">
                    <div className="header-start">
                        <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(true)}>
                            <Icon>{ICONS.MENU}</Icon>
                        </button>
                        <h1 className="app-header-title">{currentViewData.title}</h1>
                    </div>
                    <div className="header-actions">
                        {config?.app_chat && (
                            <button className="btn-icon" onClick={() => emitter.dispatchEvent(new CustomEvent('chat:open'))} title={t('supportChat', { ns: 'chat' })}>
                                <Icon>{ICONS.MESSAGE_SQUARE}</Icon>
                            </button>
                        )}
                        <button className="btn-icon" onClick={() => handleSetView('Guides')} title={t('guides')}>
                            <Icon>{ICONS.HELP_CIRCLE}</Icon>
                        </button>
                        <button className="btn-icon btn-notifications" onClick={handleNotificationsClick} title={t('notifications')}>
                            <Icon>{ICONS.BELL}</Icon>
                            {unreadCount > 0 && <span className="notification-dot"></span>}
                        </button>
                        
                        <div className="dropdown" ref={userMenuRef}>
                            <button className="header-avatar" onClick={() => setIsUserMenuOpen(prev => !prev)}>
                                <Icon>{ICONS.ACCOUNT}</Icon>
                            </button>
                            <div className={`dropdown-menu ${isUserMenuOpen ? 'open' : ''}`}>
                                <div className="dropdown-header">
                                    <h4>{(user?.first_name && user?.last_name) ? `${user.first_name} ${user.last_name}` : user?.first_name || user?.email}</h4>
                                </div>
                                <button className="dropdown-item" onClick={() => handleUserMenuItemClick('Buy Credits')}>
                                    <Icon>{ICONS.BUY_CREDITS}</Icon>
                                    <span className="dropdown-item-label-with-value">
                                        <span>{t('myCredits', { ns: 'account' })}</span>
                                        <span className="dropdown-item-value">
                                            {accountLoading && !accountData ? (
                                                <Loader />
                                            ) : (
                                                Number(accountData?.emailcredits ?? 0).toLocaleString(i18n.language)
                                            )}
                                        </span>
                                    </span>
                                </button>
                                <div className="dropdown-divider"></div>
                                <button className="dropdown-item" onClick={() => handleUserMenuItemClick('Account', 'general')}>
                                    <Icon>{ICONS.ACCOUNT}</Icon>
                                    <span>{t('profile', { ns: 'account' })}</span>
                                </button>
                                <button className="dropdown-item" onClick={() => handleUserMenuItemClick('Account', 'orders')}>
                                    <Icon>{ICONS.BOX}</Icon>
                                    <span>{t('orders', { ns: 'account' })}</span>
                                </button>
                                <button className="dropdown-item" onClick={() => handleUserMenuItemClick('Settings')}>
                                    <Icon>{ICONS.SETTINGS}</Icon>
                                    <span>{t('settings', { ns: 'account' })}</span>
                                </button>
                                {!isAppInstalled && (
                                    <>
                                        
                                        <button className="dropdown-item" onClick={handleInstallClick}>
                                            <Icon>{ICONS.DOWNLOAD}</Icon>
                                            <span>{t('installApp', { ns: 'account' })}</span>
                                        </button>
                                    </>
                                )}
                                <div className="dropdown-divider"></div>
                                <div className="dropdown-theme-switcher">
                                    <button
                                        className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                                        onClick={() => handleThemeChange('light')}
                                        aria-label={t('themeLight', { ns: 'account' })}
                                    >
                                        <Icon>{ICONS.SUN}</Icon>
                                    </button>
                                    <button
                                        className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                                        onClick={() => handleThemeChange('dark')}
                                        aria-label={t('themeDark', { ns: 'account' })}
                                    >
                                        <Icon>{ICONS.MOON}</Icon>
                                    </button>
                                    <button
                                        className={`theme-btn ${theme === 'auto' ? 'active' : ''}`}
                                        onClick={() => handleThemeChange('auto')}
                                        aria-label={t('themeSystem', { ns: 'account' })}
                                    >
                                        <Icon>{ICONS.DESKTOP}</Icon>
                                    </button>
                                </div>
                                <div className="dropdown-divider"></div>
                                <button className="dropdown-item danger" onClick={handleLogout}>
                                    <Icon>{ICONS.LOGOUT}</Icon>
                                    <span>{t('logout')}</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </header>
                <main className="app-content">
                    {currentViewData.component}
                </main>
            </div>
            {moduleToUnlock && <UnlockModuleModal module={moduleToUnlock} onClose={() => setModuleToUnlock(null)} setView={handleSetView} />}
            <UnsavedChangesModal
                isOpen={leaveConfirmationState.isOpen}
                onCancel={handleCancelLeave}
                onLeave={handleLeaveConfirmation}
                onSaveAndLeave={handleSaveAndLeave}
            />
            {isAuthenticated && user?.elastickey && <ChatWidget setView={handleSetView} />}
            {isPWAInstallModalOpen && <PWAInstallModal onClose={() => setIsPWAInstallModalOpen(false)} appName={appName} />}
        </div>
    );
};

export default App;