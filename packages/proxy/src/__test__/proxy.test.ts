import { Route } from '@vercel/routing-utils';

import { Proxy } from '../proxy';

describe('Proxy', () => {
  let proxy: Proxy;

  beforeAll(() => {
    const routes: Route[] = [
      {
        src: '/404',
        status: 404,
        continue: true,
      },
      {
        handle: 'filesystem',
      },
      {
        src: '^(/|/index|)$',
        dest: '/__NEXT_PAGE_LAMBDA_0',
        headers: {
          'x-nextjs-page': '/index',
        },
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
        src: '^\\/_next\\/data\\/28sHj5gXQxWlFW6LMqdu4\\/index.json$',
        dest: '/',
        check: true,
      },
      {
        src: '^(/|/index|)$',
        dest: '/__NEXT_PAGE_LAMBDA_0',
        headers: {
          'x-nextjs-page': '/index',
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

    proxy = new Proxy(routes);
  });

  test('Proxy::Routing', () => {
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
  });
});
