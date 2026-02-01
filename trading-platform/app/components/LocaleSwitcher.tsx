'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLocale, useSetLocale } from '@/app/i18n/provider';
import { locales, localeNames, type Locale } from '@/app/i18n/config';

export const LocaleSwitcher = memo(function LocaleSwitcher() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 px-3 py-2 rounded text-[#92adc9] hover:text-white hover:bg-[#192633] transition-colors"
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{localeNames[locale]}</span>
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 mt-1 bg-[#192633] border border-[#233648] rounded shadow-lg z-50 min-w-[120px]"
          role="menu"
          aria-orientation="vertical"
        >
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleLocaleChange(loc);
                }
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-[#233648] transition-colors ${
                locale === loc ? 'text-primary font-semibold' : 'text-[#92adc9]'
              }`}
              role="menuitem"
              tabIndex={0}
            >
              {localeNames[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
