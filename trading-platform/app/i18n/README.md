# Internationalization (i18n) Guide

## Overview

The ULT Trading Platform now supports internationalization with Japanese (default) and English languages. This guide explains how the i18n system works and how to add translations.

## Architecture

### Structure

```
app/i18n/
├── config.ts           # Locale configuration
├── messages/
│   ├── ja.json        # Japanese translations
│   └── en.json        # English translations
├── provider.tsx       # React Context provider
├── utils.ts           # Translation utilities
└── __tests__/
    └── utils.test.ts  # i18n tests
```

### Key Components

1. **I18nProvider**: React Context provider that manages current locale state
2. **useTranslations()**: Hook to get the translation function
3. **useLocale()**: Hook to get the current locale
4. **useSetLocale()**: Hook to change the locale
5. **LocaleSwitcher**: UI component for switching languages

## Usage

### Basic Translation

```tsx
import { useTranslations } from '@/app/i18n/provider';

function MyComponent() {
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t('common.loading')}</h1>
      <p>{t('page.noStockSelected')}</p>
    </div>
  );
}
```

### Translation with Parameters

```tsx
const t = useTranslations();

// Message in ja.json: "目標価格 (R:R {ratio})"
const message = t('riskMetrics.targetPrice', { ratio: '2.5' });
// Result: "目標価格 (R:R 2.5)"
```

### Getting/Setting Locale

```tsx
import { useLocale, useSetLocale } from '@/app/i18n/provider';

function LanguageInfo() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  
  return (
    <div>
      <p>Current language: {locale}</p>
      <button onClick={() => setLocale('en')}>Switch to English</button>
    </div>
  );
}
```

## Adding New Translations

### 1. Add Message Keys

Add the same key to both `ja.json` and `en.json`:

**ja.json:**
```json
{
  "myFeature": {
    "title": "タイトル",
    "description": "説明文"
  }
}
```

**en.json:**
```json
{
  "myFeature": {
    "title": "Title",
    "description": "Description"
  }
}
```

### 2. Use in Components

```tsx
const t = useTranslations();

return (
  <div>
    <h2>{t('myFeature.title')}</h2>
    <p>{t('myFeature.description')}</p>
  </div>
);
```

## Message File Structure

Messages are organized by feature/component:

```json
{
  "common": {
    // Shared across the app
    "loading": "Loading...",
    "error": "Error"
  },
  "header": {
    // Header-specific
    "title": "Trader Pro",
    "searchPlaceholder": "Search..."
  },
  "page": {
    // Page-specific
    "noStockSelected": "No stock selected"
  }
}
```

## Features

### ✅ Locale Persistence
- User's language preference is saved to `localStorage`
- Automatically restored on page load

### ✅ Keyboard Accessibility
- Locale switcher fully keyboard navigable
- Supports Tab, Enter, Space, and Escape keys
- Proper ARIA attributes

### ✅ Type Safety
- Translation keys are type-checked
- Parameter substitution is type-safe

### ✅ Fallback Handling
- Unknown locales fall back to Japanese
- Missing translations return the key itself

## Testing

### Running i18n Tests

```bash
npm test -- app/i18n/__tests__/utils.test.ts
```

### Test Coverage

- ✅ Message retrieval for different locales
- ✅ Locale fallback behavior
- ✅ Simple key translation
- ✅ Parameter substitution
- ✅ Missing key handling

## Best Practices

### 1. Organize by Feature

Group related translations together:
```json
{
  "orderPanel": {
    "buy": "Buy",
    "sell": "Sell",
    "quantity": "Quantity"
  }
}
```

### 2. Use Descriptive Keys

Good: `"orderPanel.confirmationMessage"`
Bad: `"msg1"`

### 3. Keep Messages Consistent

Ensure both languages have the same keys:
```bash
# Both files should have identical structure
ja.json: { "feature": { "key": "日本語" } }
en.json: { "feature": { "key": "English" } }
```

### 4. Handle Pluralization Carefully

For now, use separate keys or parameters:
```json
{
  "items": {
    "singular": "{count} item",
    "plural": "{count} items"
  }
}
```

### 5. Test Both Languages

Always verify translations in both Japanese and English interfaces.

## Migration Strategy

The platform uses an **incremental migration** approach:

1. ✅ **Phase 1**: Infrastructure setup (completed)
2. ✅ **Phase 2**: Core pages (main page, error page, header)
3. 🔄 **Phase 3**: Additional components (as needed)
   - OrderPanel
   - SignalPanel
   - BottomPanel
   - Navigation
   - etc.

### Adding i18n to a Component

1. Import the translation hook:
   ```tsx
   import { useTranslations } from '@/app/i18n/provider';
   ```

2. Get the translation function:
   ```tsx
   const t = useTranslations();
   ```

3. Replace hardcoded strings:
   ```tsx
   // Before
   <button>保存</button>
   
   // After
   <button>{t('common.save')}</button>
   ```

4. Add message keys to `ja.json` and `en.json`

## Troubleshooting

### Translation Not Showing

1. Check that the key exists in both `ja.json` and `en.json`
2. Verify the key path is correct: `t('section.subsection.key')`
3. Ensure the component is wrapped in `I18nProvider`

### Locale Not Persisting

The locale is saved to `localStorage` and restored on mount. If it's not persisting:
1. Check browser console for errors
2. Verify localStorage is enabled
3. Clear browser cache and try again

### Missing Translations

If a translation is missing:
- The system returns the key itself (e.g., `"common.missing"`)
- Check browser console for warnings
- Add the missing key to the appropriate message file

## Future Enhancements

Potential improvements for the i18n system:

- [ ] Date/number formatting based on locale
- [ ] Currency formatting
- [ ] Right-to-left (RTL) language support
- [ ] Additional languages (Chinese, Korean, etc.)
- [ ] Pluralization rules
- [ ] SEO optimization with locale-specific metadata
- [ ] Translation management tools

## Support

For questions or issues with i18n:
1. Check this documentation
2. Review the test files for examples
3. Check the implementation in existing components (page.tsx, error.tsx, Header.tsx)

## Related Files

- **Provider**: `app/i18n/provider.tsx`
- **Configuration**: `app/i18n/config.ts`
- **Messages**: `app/i18n/messages/`
- **Locale Switcher**: `app/components/LocaleSwitcher.tsx`
- **Tests**: `app/i18n/__tests__/utils.test.ts`
