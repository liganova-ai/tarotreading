export const LANGUAGES = { en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', nl: 'Nederlands', it: 'Italiano' };
export const LANGUAGE_NAMES = { en: 'English', de: 'German', es: 'Spanish', fr: 'French', nl: 'Dutch', it: 'Italian' };
export const isLanguage = value => typeof value === 'string' && Object.hasOwn(LANGUAGES, value);
