import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// Enforce English language and LTR direction
document.documentElement.dir = 'ltr';
document.documentElement.lang = 'en';

i18next
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en'],
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    backend: {
      loadPath: (lngs, namespaces) => {
        const ns = namespaces[0];
        if (ns === 'translation') {
            return `/locales/en/common.json`;
        }
        return `/locales/en/${ns}.json`;
      },
    },
  });

export default i18next;
