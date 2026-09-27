

import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/i18n';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { ConfigurationProvider } from './src/contexts/ConfigurationContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
import App from './src/App';
import CenteredMessage from './src/components/CenteredMessage';
import Loader from './src/components/Loader';
import { LabelsProvider } from './src/contexts/LabelsContext';

// Import modular stylesheets directly for robust bundling
import './src/styles/00_variables.css';
import './src/styles/01_global.css';
import './src/styles/02_utilities.css';
import './src/styles/03_layout.css';

/* Components */
import './src/styles/components/accordion.css';
import './src/styles/components/badge.css';
import './src/styles/components/button.css';
import './src/styles/components/card.css';
import './src/styles/components/charts.css';
import './src/styles/components/empty-state.css';
import './src/styles/components/forms.css';
import './src/styles/components/modal.css';
import './src/styles/components/multiselect.css';
import './src/styles/components/progress.css';
import './src/styles/components/tabs.css';
import './src/styles/components/toast.css';
import './src/styles/components/view-switcher.css';
import './src/styles/components/chat-widget.css';
import './src/styles/components/dropdown.css';

/* Views */
import './src/styles/views/shared.css';
import './src/styles/views/account.css';
import './src/styles/views/auth.css';
import './src/styles/views/buy-credits.css';
import './src/styles/views/calendar.css';
import './src/styles/views/campaign-detail.css';
import './src/styles/views/campaigns.css';
import './src/styles/views/contacts.css';
import './src/styles/views/dashboard.css';
import './src/styles/views/domains.css';
import './src/styles/views/domain-verification.css';
import './src/styles/views/email-builder.css';
import './src/styles/views/email-lists.css';
import './src/styles/views/embed.css';
import './src/styles/views/media-manager.css';
import './src/styles/views/onboarding.css';
import './src/styles/views/segments.css';
import './src/styles/views/send-email.css';
import './src/styles/views/send-wizard.css';
import './src/styles/views/smtp.css';
import './src/styles/views/templates.css';
import './src/styles/views/invoice.css';
import './src/styles/views/custom-fields.css';
import './src/styles/views/gallery.css';
import './src/styles/views/forms.css';
import './src/styles/views/guides.css';

const root = createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <Suspense fallback={<CenteredMessage style={{height: '100vh'}}><Loader /></CenteredMessage>}>
            <I18nextProvider i18n={i18n}>
                <ThemeProvider>
                    <ConfigurationProvider>
                        <AuthProvider>
                            <LabelsProvider>
                                <ToastProvider>
                                    <App />
                                </ToastProvider>
                            </LabelsProvider>
                        </AuthProvider>
                    </ConfigurationProvider>
                </ThemeProvider>
            </I18nextProvider>
        </Suspense>
    </React.StrictMode>
);