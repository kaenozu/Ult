import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  locale: locale || 'ja',
  messages: (await import(`../messages/${locale || 'ja'}.json`)).default,
}));
