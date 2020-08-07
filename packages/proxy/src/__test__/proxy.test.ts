import { Route } from '@vercel/routing-utils';

import { Proxy } from '../proxy';

describe('Proxy', () => {
  describe('Proxy::Routing 1', () => {
    let proxy: Proxy;
    beforeAll(() => {
      const routes: Route[] = [
        {
          src: '^(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))\\/$',
          headers: {
            Location: '/$1',
          },
          status: 308,
        },
        {
          src: '/404',
          status: 404,
          continue: true,
        },
        {
          handle: 'filesystem',
        },
        {
          src: '^/api/robots/?$',
          dest: '/__NEXT_API_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/api/robots',
          },
          check: true,
        },
        {
          src: '^(/|/index|)/?$',
          dest: '/__NEXT_PAGE_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/index',
          },
          check: true,
        },
        {
          src: '^/test/\\[\\.\\.\\.slug\\]/?$',
          dest: '/__NEXT_PAGE_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/test/[...slug]',
          },
          check: true,
        },
        {
          src: '^\\/robots\\.txt$',
          dest: '/api/robots',
          check: true,
        },
        {
          handle: 'miss',
        },
        {
          src:
            '/_next/static/(?:[^/]+/pages|pages|chunks|runtime|css|media)/.+',
          status: 404,
          check: true,
          dest: '$0',
        },
        {
          handle: 'rewrite',
        },
        {
          src: '^/_next/data/3L\\-yA_7zVvNyrhLaBNi3Z/index.json$',
          dest: '/',
          check: true,
        },
        {
          src: '^/_next/data/3L\\-yA_7zVvNyrhLaBNi3Z/test/(?<slug>.+?)\\.json$',
          dest: '/test/[...slug]?slug=$slug',
          check: true,
        },
        {
          src: '^/test/\\[\\.\\.\\.slug\\]/?$',
          dest: '/__NEXT_PAGE_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/test/[...slug]',
          },
          check: true,
        },
        {
          src: '^/api/robots/?$',
          dest: '/__NEXT_API_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/api/robots',
          },
          check: true,
        },
        {
          src: '^(/|/index|)/?$',
          dest: '/__NEXT_PAGE_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/index',
          },
          check: true,
        },
        {
          src: '^/test/(?<slug>.+?)(?:/)?$',
          dest: '/test/[...slug]?slug=$slug',
          check: true,
        },
        {
          src: '^/test/\\[\\.\\.\\.slug\\]/?$',
          dest: '/__NEXT_PAGE_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/test/[...slug]',
          },
          check: true,
        },
        {
          handle: 'hit',
        },
        {
          src:
            '/_next/static/(?:[^/]+/pages|pages|chunks|runtime|css|media)/.+',
          headers: {
            'cache-control': 'public,max-age=31536000,immutable',
          },
          continue: true,
        },
        {
          handle: 'error',
        },
        {
          src: '/.*',
          dest: '/404',
          status: 404,
          headers: {
            'x-nextjs-page': '',
          },
        },
      ];

      proxy = new Proxy(routes, ['/__NEXT_PAGE_LAMBDA_0']);
    });

    test('Proxy::Routing 1', () => {
      // Lambda route
      const route_1 = proxy.route('/');
      expect(route_1).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/__NEXT_PAGE_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/index',
          },
        })
      );

      // About Route not found
      const route_2 = proxy.route('/about');
      expect(route_2).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/404',
          headers: {
            'x-nextjs-page': '',
          },
        })
      );

      // Lambda route
      const route_3 = proxy.route('/test/a/b/c');
      expect(route_3).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/__NEXT_PAGE_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/test/[...slug]',
          },
        })
      );
    });
  });

  describe('Proxy::Routing 2', () => {
    let proxy: Proxy;
    const routes: Route[] = [
      {
        src: '^(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))\\/$',
        headers: {
          Location: '/$1',
        },
        status: 308,
      },
      {
        src: '/404',
        status: 404,
        continue: true,
      },
      {
        handle: 'filesystem',
      },
      {
        src: '^/api/robots/?$',
        dest: '/__NEXT_API_LAMBDA_0',
        headers: {
          'x-nextjs-page': '/api/robots',
        },
        check: true,
      },
      {
        src: '^(/|/index|)/?$',
        dest: '/__NEXT_PAGE_LAMBDA_0',
        headers: {
          'x-nextjs-page': '/index',
        },
        check: true,
      },
      {
        src: '^/product/\\[\\.\\.\\.slug\\]/?$',
        dest: '/__NEXT_PAGE_LAMBDA_0',
        headers: {
          'x-nextjs-page': '/product/[...slug]',
        },
        check: true,
      },
      {
        src: '^\\/robots\\.txt$',
        dest: '/api/robots',
        check: true,
      },
      {
        handle: 'miss',
      },
      {
        src: '/_next/static/(?:[^/]+/pages|pages|chunks|runtime|css|media)/.+',
        status: 404,
        check: true,
        dest: '$0',
      },
      {
        handle: 'rewrite',
      },
      {
        src: '^/api/robots/?$',
        dest: '/__NEXT_API_LAMBDA_0',
        headers: {
          'x-nextjs-page': '/api/robots',
        },
        check: true,
      },
      {
        src: '^(/|/index|)/?$',
        dest: '/__NEXT_PAGE_LAMBDA_0',
        headers: {
          'x-nextjs-page': '/index',
        },
        check: true,
      },
      {
        src: '^/product/(?<slug>.+?)(?:/)?$',
        dest: '/product/[...slug]?slug=$slug',
        check: true,
      },
      {
        src: '^/product/\\[\\.\\.\\.slug\\]/?$',
        dest: '/__NEXT_PAGE_LAMBDA_0',
        headers: {
          'x-nextjs-page': '/product/[...slug]',
        },
        check: true,
      },
      {
        handle: 'hit',
      },
      {
        src: '/_next/static/(?:[^/]+/pages|pages|chunks|runtime|css|media)/.+',
        headers: {
          'cache-control': 'public,max-age=31536000,immutable',
        },
        continue: true,
      },
      {
        handle: 'error',
      },
      {
        src: '/.*',
        dest: '/404',
        status: 404,
        headers: {
          'x-nextjs-page': '',
        },
      },
    ];

    proxy = new Proxy(routes, [
      '/__NEXT_API_LAMBDA_0',
      '/__NEXT_PAGE_LAMBDA_0',
    ]);

    const route_1 = proxy.route(
      '/product/corsair-vengeance-ram-GuyH42koQBDk0pFJq3tc'
    );
    expect(route_1).toEqual(
      expect.objectContaining({
        found: true,
        dest: '/__NEXT_PAGE_LAMBDA_0',
        headers: {
          'x-nextjs-page': '/product/[...slug]',
        },
      })
    );
  });
});
