/**
 * Unit tests for proxy with simple routing rules
 * @see: https://github.com/vercel/vercel/blob/master/packages/now-cli/test/dev-router.unit.js
 */

import { URLSearchParams } from 'url';

import { Route } from '@vercel/routing-utils';

import { Proxy } from '../src/proxy';
import { generateMockedFetchResponse } from './test-utils';

describe('Proxy unit', () => {
  test('Captured groups', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
    const routesConfig = [{ src: '/api/(.*)', dest: '/endpoints/$1.js' }];
    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/api/user'
    );

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

  test('Named groups', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
    const routesConfig = [{ src: '/user/(?<id>.+)', dest: '/user.js?id=$id' }];
    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/user/123'
    );

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

  test('Optional named groups', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
    const routesConfig = [
      {
        src: '/api/hello(/(?<name>[^/]+))?',
        dest: '/api/functions/hello/index.js?name=$name',
      },
    ];
    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/api/hello'
    );

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

  test('Shared lambda', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
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
    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      { '/__NEXT_PAGE_LAMBDA_0': 'localhost' },
      'http://localhost',
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

  test('Slug group and shared lambda', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
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
    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {
        '/__NEXT_PAGE_LAMBDA_0': 'localhost',
      },
      'http://localhost',
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

  test('Ignore other routes when no continue is set', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
    const routesConfig = [
      { src: '/about', dest: '/about.html' },
      { src: '/about', dest: '/about.php' },
    ];

    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/about'
    );

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

  test('Continue after first route found', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
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

    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/about'
    );

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

  describe('Redirect: Remove trailing slash', () => {
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
    let proxy: Proxy;

    beforeAll(() => {
      const mockedFetch = jest.fn().mockImplementation((url: string) => {
        if (url === `localhost/filesystem/123/${encodeURIComponent('test')}`) {
          return generateMockedFetchResponse(200, {}, { etag: '"found"' });
        }

        return generateMockedFetchResponse(404, {}, { etag: '"notfound"' });
      });
      proxy = new Proxy(mockedFetch as any);
    });

    test('Matches static route, but has a trailing slash', async () => {
      const result = await proxy.route(
        '123',
        routesConfig,
        {},
        'http://localhost',
        '/test/'
      );
      expect(result).toEqual({
        found: true,
        dest: '/test/',
        continue: true,
        status: 308,
        headers: { Location: '/test' },
        uri_args: new URLSearchParams(),
        matched_route: routesConfig[0],
        matched_route_idx: 0,
        userDest: false,
        isDestUrl: false,
        phase: undefined,
        target: undefined,
      });
    });

    test('Matches no route', async () => {
      const result = await proxy.route(
        '123',
        routesConfig,
        {},
        'http://localhost',
        '/other-route/'
      );
      expect(result).toEqual({
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

    test('Has querystring', async () => {
      const result = await proxy.route(
        '123',
        routesConfig,
        {},
        'http://localhost',
        '/other-route/?foo=bar'
      );
      expect(result).toEqual({
        found: true,
        dest: '/other-route/',
        continue: true,
        status: 308,
        headers: { Location: '/other-route' },
        uri_args: new URLSearchParams('foo=bar'),
        matched_route: routesConfig[0],
        matched_route_idx: 0,
        userDest: false,
        isDestUrl: false,
        phase: undefined,
        target: undefined,
      });
    });
  });

  test('With trailing slash', async () => {
    const mockedFetch = jest.fn().mockImplementation((url: string) => {
      if (
        url === 'http://localhost/filesystem/123/test/index' ||
        url === 'http://localhost/filesystem/123/index'
      ) {
        return generateMockedFetchResponse(
          200,
          {
            key:
              '123/static/' +
              url.substring('http://localhost/filesystem/123/'.length),
          },
          { etag: '"found"' }
        );
      }

      return generateMockedFetchResponse(404, {}, { etag: '"notfound"' });
    });
    const routesConfig: Route[] = [
      {
        handle: 'filesystem',
      },
    ];
    const proxy = new Proxy(mockedFetch as any);

    const result1 = await proxy.route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/test/'
    );
    expect(result1).toEqual({
      found: true,
      dest: '/123/static/test/index',
      continue: false,
      status: undefined,
      headers: {},
      isDestUrl: false,
      phase: 'filesystem',
      target: 'filesystem',
    });

    const result2 = await proxy.route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/'
    );
    expect(result2).toEqual({
      found: true,
      dest: '/123/static/index',
      continue: false,
      status: undefined,
      headers: {},
      isDestUrl: false,
      phase: 'filesystem',
      target: 'filesystem',
    });
  });

  test('Redirect partial replace', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
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

    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/redir/other-path'
    );

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

  test('Redirect to partial path', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
    const routesConfig = [
      {
        src: '^\\/two(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))?$',
        headers: {
          Location: '/newplacetwo/$1',
        },
        status: 308,
      },
    ] as Route[];

    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/two/some/path?foo=bar'
    );
    expect(result).toEqual({
      found: true,
      dest: '/two/some/path',
      continue: false,
      status: 308,
      headers: { Location: '/newplacetwo/some/path' },
      uri_args: new URLSearchParams('foo=bar'),
      matched_route: routesConfig[0],
      matched_route_idx: 0,
      userDest: false,
      isDestUrl: false,
      phase: undefined,
      target: undefined,
    });
  });

  test('External rewrite', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
    const routesConfig = [
      {
        src: '^\\/docs(?:\\/([^\\/]+?))$',
        dest: 'http://example.com/docs/$1',
        check: true,
      },
    ] as Route[];

    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/docs/hello-world'
    );

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

  test('Rewrite with ^ and $', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
    const routesConfig = [
      {
        src: '^/$',
        dest: '/en',
        continue: true,
      },
    ] as Route[];

    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/'
    );

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

  test('I18n default locale', async () => {
    const mockedFetch = jest
      .fn()
      .mockImplementation(() =>
        generateMockedFetchResponse(404, {}, { etag: '"notfound"' })
      );
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

    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/'
    );

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

  test('Static index route', async () => {
    const mockedFetch = jest.fn().mockImplementation((url: string) => {
      if (url === 'http://localhost/filesystem/123/index') {
        return generateMockedFetchResponse(
          200,
          {
            key: '123/static/index',
          },
          { etag: '"found"' }
        );
      }

      return generateMockedFetchResponse(404, {}, { etag: '"notfound"' });
    });
    const routesConfig = [
      {
        handle: 'filesystem' as const,
      },
    ];
    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/'
    );

    expect(result).toEqual({
      found: true,
      dest: '/123/static/index',
      target: 'filesystem',
      continue: false,
      status: undefined,
      headers: {},
      isDestUrl: false,
      phase: 'filesystem',
    });
  });

  test('Multiple dynamic parts', async () => {
    const mockedFetch = jest.fn().mockImplementation((url: string) => {
      if (url === 'http://localhost/filesystem/123/[teamSlug]/[project]/[id]') {
        return generateMockedFetchResponse(
          200,
          {
            key: '123/static/[teamSlug]/[project]/[id]',
          },
          { etag: '"found"' }
        );
      }

      return generateMockedFetchResponse(404, {}, { etag: '"notfound"' });
    });
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
        dest: '/[teamSlug]/[project]/[id]?teamSlug=$teamSlug&project=$project&id=$id',
        check: true,
      },
      {
        handle: 'hit',
      },
    ];
    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/another/invite/hello'
    );

    expect(result).toEqual({
      found: true,
      dest: '/123/static/[teamSlug]/[project]/[id]',
      target: 'filesystem',
      continue: false,
      status: undefined,
      headers: {},
      isDestUrl: false,
      phase: 'rewrite',
    });
  });

  test('Dynamic static route', async () => {
    const mockedFetch = jest.fn().mockImplementation((url: string) => {
      if (url === 'http://localhost/filesystem/123/users/[user_id]') {
        return generateMockedFetchResponse(
          200,
          {
            key: '123/static/users/[user_id]',
          },
          { etag: '"found"' }
        );
      }

      return generateMockedFetchResponse(404, {}, { etag: '"notfound"' });
    });
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
    const result = await new Proxy(mockedFetch as any).route(
      '123',
      routesConfig,
      {},
      'http://localhost',
      '/users/123'
    );

    expect(result).toEqual({
      found: true,
      dest: '/123/static/users/[user_id]',
      target: 'filesystem',
      continue: false,
      status: undefined,
      headers: {},
      isDestUrl: false,
      phase: 'rewrite',
    });
  });
});
