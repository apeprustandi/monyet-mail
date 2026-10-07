import { createI18n } from 'vue-i18n';
import en from './en.js'
import id from './id.js'
const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
        en,
        id
    },
});

export default i18n;
