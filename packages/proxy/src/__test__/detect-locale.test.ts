import { CloudFrontHeaders } from 'aws-lambda';

import { detectLocale } from '../util/detect-locale';

describe('detectLocale', () => {
  const cookieName = 'NEXT_LOCALE';

  test('get locale from cookie', () => {
    const localeValue = 'nl';

    const headers: CloudFrontHeaders = {
      cookie: [
        {
          key: 'Cookie',
          value: `name=value; name2=value2; name3=value3`,
        },
        {
          key: 'Cookie',
          value: `name=value; ${cookieName}=${localeValue}; name3=value3`,
        },
        {
          key: 'Cookie',
          value: `name=value; name2=value2; name3=value3`,
        },
      ],
    };

    const localeOptions = {
      cookie: cookieName,
      redirect: {
        en: '/',
        'fr-FR': '/fr-FR',
        nl: '/nl',
      },
    };

    const locale = detectLocale(headers, { locale: localeOptions });
    expect(locale).toBe(localeValue);
  });

  describe('Detect locale from header', () => {
    const localeOptions = {
      cookie: cookieName,
      redirect: {
        en: '/',
        'fr-FR': '/fr-FR',
        nl: '/nl',
      },
    };
    const preferredLocaleFromHeader = [
      ['fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5', 'fr-FR'],
      ['*', 'en'],
      ['de', ''],
      ['en-US, en', 'en'],
      ['af;q=0.9, ar;q=0.8, de;q=0.7, *;q=0.5', 'en'],
    ];
    test.each(preferredLocaleFromHeader)(
      'ExpectedLocale from "%s" should be "%s"',
      (headerValue, expectedLocale) => {
        const headers: CloudFrontHeaders = {
          'accept-language': [
            {
              key: 'Accept-Language',
              value: headerValue,
            },
          ],
        };

        const locale = detectLocale(headers, { locale: localeOptions });
        expect(locale).toBe(expectedLocale);
      }
    );
  });
});
