import { CloudFrontHeaders } from 'aws-lambda';
import { Source } from '@vercel/routing-utils';
import { language as parseAcceptLanguage } from '@hapi/accept';

import { extractCookie } from './extract-cookies';

interface DetectLocaleOptions {
  locale: Exclude<Source['locale'], undefined>;
}

export function detectLocale(
  headers: CloudFrontHeaders,
  { locale }: DetectLocaleOptions
): string | null {
  // Check if the locale was set previously
  if (locale.cookie) {
    const localeFromCookie = extractCookie(headers, locale.cookie);

    if (localeFromCookie !== null) {
      return localeFromCookie;
    }
  }

  // Check if we can detect the locale from headers
  const acceptPreferredLanguageHeader = headers['accept-language'];
  if (acceptPreferredLanguageHeader?.length > 0) {
    return parseAcceptLanguage(acceptPreferredLanguageHeader[0].value);
  }

  return null;
}
