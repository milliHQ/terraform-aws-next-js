/**
 * Unit tests for proxy with simple routing rules
 * @see: https://github.com/vercel/vercel/blob/master/packages/now-cli/test/dev-router.unit.js
 */

import { Route } from '@vercel/routing-utils';
import { URLSearchParams } from 'url';

import { Proxy } from '../src/proxy';

test('[proxy-unit] captured groups', () => {
  const routesConfig = [{ src: '/api/(.*)', dest: '/endpoints/$1.js' }];
  const result = new Proxy(routesConfig, [], []).route('/api/user');

  expect(result).toEqual({
    found: true,
    dest: '/endpoints/user.js',
    continue: false,
    status: undefined,
    headers: {},
    uri_args: new URLSearchParams(),
    matched_route: routesConfig[0],
    matched_route_idx: 0,
    userDest: true,
    isDestUrl: false,
    phase: undefined,
  });
});

test('[proxy-unit] named groups', () => {
  const routesConfig = [{ src: '/user/(?<id>.+)', dest: '/user.js?id=$id' }];
  const result = new Proxy(routesConfig, [], []).route('/user/123');

  expect(result).toEqual({
    found: true,
    dest: '/user.js',
    continue: false,
    status: undefined,
    headers: {},
    uri_args: new URLSearchParams('id=123'),
    matched_route: routesConfig[0],
    matched_route_idx: 0,
    userDest: true,
    isDestUrl: false,
    phase: undefined,
  });
});

test('[proxy-unit] optional named groups', () => {
  const routesConfig = [
    {
      src: '/api/hello(/(?<name>[^/]+))?',
      dest: '/api/functions/hello/index.js?name=$name',
    },
  ];
  const result = new Proxy(routesConfig, [], []).route('/api/hello');

  expect(result).toEqual({
    found: true,
    dest: '/api/functions/hello/index.js',
    continue: false,
    status: undefined,
    headers: {},
    uri_args: new URLSearchParams('name'),
    matched_route: routesConfig[0],
    matched_route_idx: 0,
    userDest: true,
    isDestUrl: false,
    phase: undefined,
  });
});

test('[proxy-unit] shared lambda', () => {
  const routesConfig = [
    {
      src: '^/product/\\[\\.\\.\\.slug\\]/?$',
      dest: '/__NEXT_PAGE_LAMBDA_0',
      headers: {
        'x-nextjs-page': '/product/[...slug]',
      },
      check: true,
    },
  ];
  const result = new Proxy(routesConfig, ['/__NEXT_PAGE_LAMBDA_0'], []).route(
    '/product/[...slug]?slug=hello/world'
  );

  expect(result).toEqual({
    found: true,
    dest: '/__NEXT_PAGE_LAMBDA_0',
    continue: false,
    status: undefined,
    headers: { 'x-nextjs-page': '/product/[...slug]' },
    uri_args: new URLSearchParams('slug=hello/world'),
    matched_route: routesConfig[0],
    matched_route_idx: 0,
    userDest: true,
    isDestUrl: false,
    phase: undefined,
    target: 'lambda',
  });
});

test('[proxy-unit] slug group and shared lambda', () => {
  const routesConfig = [
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
  ];
  const result = new Proxy(routesConfig, ['/__NEXT_PAGE_LAMBDA_0'], []).route(
    '/product/hello/world'
  );

  expect(result).toEqual({
    found: true,
    dest: '/__NEXT_PAGE_LAMBDA_0',
    continue: false,
    status: undefined,
    headers: { 'x-nextjs-page': '/product/[...slug]' },
    uri_args: new URLSearchParams('slug=hello/world'),
    matched_route: routesConfig[1],
    matched_route_idx: 1,
    userDest: true,
    isDestUrl: false,
    phase: undefined,
    target: 'lambda',
  });
});

test('[proxy-unit] Ignore other routes when no continue is set', () => {
  const routesConfig = [
    { src: '/about', dest: '/about.html' },
    { src: '/about', dest: '/about.php' },
  ];

  const result = new Proxy(routesConfig, [], []).route('/about');

  expect(result).toEqual({
    found: true,
    dest: '/about.html',
    continue: false,
    status: undefined,
    headers: {},
    uri_args: new URLSearchParams(),
    matched_route: routesConfig[0],
    matched_route_idx: 0,
    userDest: true,
    isDestUrl: false,
    phase: undefined,
  });
});

test('[proxy-unit] Continue after first route found', () => {
  const routesConfig = [
    {
      src: '/about',
      dest: '/about.html',
      headers: {
        'x-test': 'test',
      },
      continue: true,
    },
    { src: '/about', dest: '/about.php' },
  ];

  const result = new Proxy(routesConfig, [], []).route('/about');

  expect(result).toEqual({
    found: true,
    dest: '/about.php',
    continue: false,
    status: undefined,
    headers: {
      'x-test': 'test',
    },
    uri_args: new URLSearchParams(),
    matched_route: routesConfig[1],
    matched_route_idx: 1,
    userDest: true,
    isDestUrl: false,
    phase: undefined,
  });
});

test('[proxy-unit] Redirect: Remove trailing slash', () => {
  const routesConfig: Route[] = [
    {
      src: '^(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))\\/$',
      headers: {
        Location: '/$1',
      },
      status: 308,
      continue: true,
    },
    {
      handle: 'filesystem',
    },
  ];
  const proxy = new Proxy(routesConfig, [], ['/test']);

  const result1 = proxy.route('/test/');
  expect(result1).toEqual({
    found: true,
    dest: '/test',
    continue: false,
    status: 308,
    headers: { Location: '/test' },
    isDestUrl: false,
    phase: 'filesystem',
    target: 'filesystem',
  });

  const result2 = proxy.route('/other-route/');
  expect(result2).toEqual({
    found: true,
    dest: '/other-route/',
    continue: true,
    status: 308,
    headers: { Location: '/other-route' },
    uri_args: new URLSearchParams(),
    matched_route: routesConfig[0],
    matched_route_idx: 0,
    userDest: false,
    isDestUrl: false,
    phase: undefined,
    target: undefined,
  });
});

test('[proxy-unit] With trailing slash', () => {
  const routesConfig: Route[] = [
    {
      handle: 'filesystem',
    },
  ];
  const proxy = new Proxy(routesConfig, [], ['/index', '/test']);

  const result1 = proxy.route('/test/');
  expect(result1).toEqual({
    found: true,
    dest: '/test',
    continue: false,
    status: undefined,
    headers: {},
    isDestUrl: false,
    phase: 'filesystem',
    target: 'filesystem',
  });

  const result2 = proxy.route('/');
  expect(result2).toEqual({
    found: true,
    dest: '/index',
    continue: false,
    status: undefined,
    headers: {},
    isDestUrl: false,
    phase: 'filesystem',
    target: 'filesystem',
  });
});

test('[proxy-unit] Redirect partial replace', () => {
  const routesConfig = [
    {
      src: '^\\/redir(?:\\/([^\\/]+?))$',
      headers: {
        Location: '/$1',
      },
      status: 307,
    },
    {
      src: '^/param/?$',
      dest: '/__NEXT_PAGE_LAMBDA_0',
      headers: {
        'x-nextjs-page': '/param',
      },
      check: true,
    },
  ] as Route[];

  const result = new Proxy(routesConfig, [], []).route('/redir/other-path');

  expect(result).toEqual({
    found: true,
    dest: '/redir/other-path',
    continue: false,
    status: 307,
    headers: { Location: '/other-path' },
    uri_args: new URLSearchParams(),
    matched_route: routesConfig[0],
    matched_route_idx: 0,
    userDest: false,
    isDestUrl: false,
    phase: undefined,
    target: undefined,
  });
});

test('[proxy-unit] External rewrite', () => {
  const routesConfig = [
    {
      src: '^\\/docs(?:\\/([^\\/]+?))$',
      dest: 'http://example.com/docs/$1',
      check: true,
    },
  ] as Route[];

  const result = new Proxy(routesConfig, [], []).route('/docs/hello-world');

  expect(result).toEqual({
    found: true,
    dest: 'http://example.com/docs/hello-world',
    continue: false,
    status: undefined,
    headers: {},
    uri_args: new URLSearchParams(''),
    matched_route: routesConfig[0],
    matched_route_idx: 0,
    userDest: false,
    isDestUrl: true,
    phase: undefined,
    target: 'url',
  });
});

test('[proxy-unit] Rewrite with ^ and $', () => {
  const routesConfig = [
    {
      src: '^/$',
      dest: '/en',
      continue: true,
    },
  ] as Route[];

  const result = new Proxy(routesConfig, [], []).route('/');

  expect(result).toEqual({
    found: true,
    dest: '/en',
    continue: true,
    status: undefined,
    headers: {},
    uri_args: new URLSearchParams(),
    matched_route: routesConfig[0],
    matched_route_idx: 0,
    userDest: true,
    isDestUrl: false,
    phase: undefined,
    target: undefined,
  });
});

test('[proxy-unit] i18n default locale', () => {
  const routesConfig = [
    {
      src: '^/(?!(?:_next/.*|en|fr\\-FR|nl)(?:/.*|$))(.*)$',
      dest: '$wildcard/$1',
      continue: true,
    },
    {
      src: '/',
      locale: {
        redirect: {
          en: '/',
          'fr-FR': '/fr-FR',
          nl: '/nl',
        },
        cookie: 'NEXT_LOCALE',
      },
      continue: true,
    },
    {
      src: '^/$',
      dest: '/en',
      continue: true,
    },
  ] as Route[];

  const result = new Proxy(routesConfig, [], []).route('/');

  expect(result).toEqual({
    found: true,
    dest: '/en',
    continue: true,
    status: undefined,
    headers: {},
    uri_args: new URLSearchParams(''),
    matched_route: routesConfig[2],
    matched_route_idx: 2,
    userDest: true,
    isDestUrl: false,
    phase: undefined,
    target: undefined,
  });
});

test('[proxy-unit] static index route', () => {
  const routesConfig = [
    {
      handle: 'filesystem' as const,
    },
  ];
  const result = new Proxy(routesConfig, [], ['/index']).route('/');

  expect(result).toEqual({
    found: true,
    dest: '/index',
    target: 'filesystem',
    continue: false,
    status: undefined,
    headers: {},
    isDestUrl: false,
    phase: 'filesystem',
  });
});

test('[proxy-unit] multiple dynamic parts', () => {
  const routesConfig: Route[] = [
    {
      handle: 'filesystem',
    },
    {
      handle: 'rewrite',
    },
    {
      // Original path of the page: /pages/[teamSlug]/[project]/[id].js
      src: '^/(?<teamSlug>[^/]+?)/(?<project>[^/]+?)/(?<id>[^/]+?)(?:/)?$',
      dest:
        '/[teamSlug]/[project]/[id]?teamSlug=$teamSlug&project=$project&id=$id',
      check: true,
    },
    {
      handle: 'hit',
    },
  ];
  const result = new Proxy(
    routesConfig,
    [],
    ['/[teamSlug]/[project]/[id]']
  ).route('/another/invite/hello');

  expect(result).toEqual({
    found: true,
    dest: '/[teamSlug]/[project]/[id]',
    target: 'filesystem',
    continue: false,
    status: undefined,
    headers: {},
    isDestUrl: false,
    phase: 'rewrite',
  });
});

test('[proxy-unit] Dynamic static route', () => {
  const routesConfig: Route[] = [
    {
      handle: 'rewrite',
    },
    {
      src: '^/users/(?<user_id>[^/]+?)(?:/)?$',
      dest: '/users/[user_id]?user_id=$user_id',
      check: true,
    },
    {
      handle: 'hit',
    },
  ];
  const result = new Proxy(routesConfig, [], ['/users/[user_id]']).route(
    '/users/123'
  );

  expect(result).toEqual({
    found: true,
    dest: '/users/[user_id]',
    target: 'filesystem',
    continue: false,
    status: undefined,
    headers: {},
    isDestUrl: false,
    phase: 'rewrite',
  });
});
