import jaMessages from './messages/ja.json';
import enMessages from './messages/en.json';
import type { Locale } from './config';

export const messages = {
  ja: jaMessages,
  en: enMessages,
} as const;

export function getMessages(locale: Locale) {
  return messages[locale] || messages.ja;
}

type Messages = typeof jaMessages;
type MessageKey = string;

export function translate(
  messages: Messages,
  key: MessageKey,
  params?: Record<string, string | number>
): string {
  const keys = key.split('.');
  let value: any = messages;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Replace parameters
  if (params) {
    return Object.entries(params).reduce((acc, [key, val]) => {
      return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
    }, value);
  }

  return value;
}
