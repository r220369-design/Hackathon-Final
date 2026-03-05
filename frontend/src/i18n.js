import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import teTranslation from './locales/te.json';

const savedLanguage = localStorage.getItem('language');
const initialLanguage = savedLanguage || 'te';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: enTranslation },
            te: { translation: teTranslation }
        },
        lng: initialLanguage,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

i18n.on('languageChanged', (language) => {
    localStorage.setItem('language', language);
});

export default i18n;
