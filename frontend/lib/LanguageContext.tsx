"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LangCode, translate, TranslationKey, LANGUAGES } from "./translations";

interface LanguageContextType {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    const saved = localStorage.getItem("fleetsure_lang") as LangCode | null;
    if (saved && LANGUAGES[saved]) setLangState(saved);
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    localStorage.setItem("fleetsure_lang", l);
    // Update html lang attribute for accessibility
    document.documentElement.lang = l;
  };

  const t = (key: TranslationKey) => translate(key, lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
