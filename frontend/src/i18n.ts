import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: false, // Set to true for development, false for production
    interpolation: {
      escapeValue: false,
    },
    detection: {
      lookupLocalStorage: 'i18nextLng',
    },
    supportedLngs: [
      'en', 'en_US',
      'zh', 'zh_CN'
    ],
    fallbackLng: {
      zh: ['zh_CN'],
      default: ['en_US']
    },
    react: {
      useSuspense: false,
    },
    resources: {
      en_US: { translation: require('./locales/en_US.json') },
      zh_CN: { translation: require('./locales/zh_CN.json') },
    }
  });

export default i18n;