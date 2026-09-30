import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
//import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(Backend) // Load translations from files
  //.use(LanguageDetector) // Detect user language
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: "/languages/locales/{{lng}}/{{ns}}.json", // Load JSON files dynamically
    },
  });

export default i18n;