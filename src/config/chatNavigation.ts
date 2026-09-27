
export interface NavigationKeyword {
    keywords: string[];
    view: string;
    buttonTextKey: string; // For i18n
    data?: any;
}

export const navigationKeywords: NavigationKeyword[] = [
    { 
        keywords: ['buy credits', 'purchase credits', 'add credits', 'balance', 'credits', 'top up'], 
        view: 'Buy Credits', 
        buttonTextKey: 'goToBuyCredits' 
    },
    { 
        keywords: ['dashboard', 'home page', 'overview', 'main'], 
        view: 'Dashboard', 
        buttonTextKey: 'goToDashboard' 
    },
    { 
        keywords: ['contacts', 'subscribers', 'audience', 'my contacts', 'list contacts'], 
        view: 'Contacts', 
        buttonTextKey: 'goToContacts' 
    },
    { 
        keywords: ['campaigns', 'my campaigns', 'sent emails', 'email campaigns'], 
        view: 'Campaigns', 
        buttonTextKey: 'goToCampaigns' 
    },
    { 
        keywords: ['templates', 'my templates', 'email designs', 'template gallery'], 
        view: 'Templates', 
        buttonTextKey: 'goToTemplates' 
    },
    { 
        keywords: ['domain', 'domains', 'verify domain', 'sending domain', 'domain settings'], 
        view: 'Settings', 
        buttonTextKey: 'goToDomainSettings', 
        data: { tab: 'domains' } 
    },
    { 
        keywords: ['api key', 'api access', 'my api key', 'developer api'], 
        view: 'Settings', 
        buttonTextKey: 'goToApiSettings', 
        data: { tab: 'api' } 
    },
    { 
        keywords: ['smtp settings', 'credentials', 'smtp host', 'smtp port'], 
        view: 'Settings', 
        buttonTextKey: 'goToSmtpSettings', 
        data: { tab: 'smtp' } 
    },
    { 
        keywords: ['profile', 'my profile', 'personal info', 'user account', 'my account'], 
        view: 'Account', 
        buttonTextKey: 'goToProfile', 
        data: { tab: 'profile' } 
    },
    { 
        keywords: ['orders', 'purchase history', 'billing', 'invoices', 'payment history'], 
        view: 'Account', 
        buttonTextKey: 'goToOrders', 
        data: { tab: 'orders' } 
    },
    // External Links - Triggers based on URLs found in the text
    { 
        keywords: ['t.me/nowmails', '#contact_human', 'support chat'], 
        view: 'External', 
        buttonTextKey: 'chatWithHuman', 
        data: { url: 'https://t.me/nowmails' } 
    },
];
