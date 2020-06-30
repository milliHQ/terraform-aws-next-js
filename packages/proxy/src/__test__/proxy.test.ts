import { Route } from '@vercel/routing-utils';

import { Proxy } from '../proxy';

describe('Proxy', () => {
  test('Proxy::Simple Routing', () => {
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
        handle: 'miss',
      },
      {
        src: '/_next/static/(?:[^/]+/pages|chunks|runtime|css|media)/.+',
        status: 404,
        check: true,
        dest: '$0',
      },
      {
        handle: 'rewrite',
      },
      {
        src: '^\\/_next\\/data\\/HIUhXah9\\-tmIWzr0V0v5O\\/index.json$',
        dest: '/',
        check: true,
      },
      {
        handle: 'hit',
      },
      {
        src: '/_next/static/(?:[^/]+/pages|chunks|runtime|css|media)/.+',
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
      },
    ];

    const proxy = new Proxy(routes);
    const result = proxy.route('/index');

    console.log(result);
  });
});
