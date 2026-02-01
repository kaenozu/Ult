'use client';

import { memo } from 'react';
import { Globe } from 'lucide-react';
import { useLocale, useSetLocale } from '@/app/i18n/provider';
import { locales, localeNames, type Locale } from '@/app/i18n/config';

export const LocaleSwitcher = memo(function LocaleSwitcher() {
  const locale = useLocale();
  const setLocale = useSetLocale();

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded text-[#92adc9] hover:text-white hover:bg-[#192633] transition-colors"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{localeNames[locale]}</span>
      </button>
      
      <div className="absolute right-0 mt-1 bg-[#192633] border border-[#233648] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={`block w-full text-left px-4 py-2 text-sm hover:bg-[#233648] transition-colors ${
              locale === loc ? 'text-primary font-semibold' : 'text-[#92adc9]'
            }`}
          >
            {localeNames[loc]}
          </button>
        ))}
      </div>
    </div>
  );
});
