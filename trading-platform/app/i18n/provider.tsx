'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Locale, defaultLocale } from './config';
import { getMessages, translate } from './utils';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const messages = getMessages(locale);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(messages, key, params);
  }, [messages]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslations() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslations must be used within I18nProvider');
  }
  return context.t;
}

export function useLocale() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useLocale must be used within I18nProvider');
  }
  return context.locale;
}

export function useSetLocale() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useSetLocale must be used within I18nProvider');
  }
  return context.setLocale;
}
