import { Proxy } from '../src/proxy';
import { ProxyConfig } from '../src/types';
import { generateMockedFetchResponse } from './test-utils';

describe('Proxy', () => {
  describe('Proxy::Routing 001', () => {
    let proxy: Proxy;
    let config: ProxyConfig;

    beforeAll(() => {
      // Initialize proxy
      config = require('./res/config-001.json') as ProxyConfig;
      const staticRoutes = ['favicon.ico', 'sitemap.xml'];
      const mockedFetch = jest.fn().mockImplementation((url: string) => {
        for (const staticRoute of staticRoutes) {
          if (
            url ===
            `http://localhost/filesystem/123/${encodeURIComponent(staticRoute)}`
          ) {
            return generateMockedFetchResponse(
              200,
              {
                key: staticRoute,
              },
              { etag: '"found"' }
            );
          }
        }

        return generateMockedFetchResponse(404, {}, { etag: '"notfound"' });
      });
      proxy = new Proxy(mockedFetch as any);
    });

    test('/: Index Lambda route', async () => {
      const route = await proxy.route(
        '123',
        config.routes,
        config.lambdaRoutes,
        'http://localhost',
        '/'
      );
      expect(route).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/__NEXT_PAGE_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/index',
          },
          target: 'lambda',
        })
      );
    });

    test('/about: Route not found', async () => {
      const route = await proxy.route(
        '123',
        config.routes,
        config.lambdaRoutes,
        'http://localhost',
        '/about'
      );
      expect(route).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/404',
          headers: {
            'x-nextjs-page': '',
          },
        })
      );
    });

    test('/test/a/b/c: Slug Lambda Route', async () => {
      const route = await proxy.route(
        '123',
        config.routes,
        config.lambdaRoutes,
        'http://localhost',
        '/test/a/b/c'
      );
      expect(route).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/__NEXT_PAGE_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/test/[...slug]',
          },
          target: 'lambda',
        })
      );
    });

    test('/sitemap.xml: Static file routing', async () => {
      const route = await proxy.route(
        '123',
        config.routes,
        config.lambdaRoutes,
        'http://localhost',
        '/sitemap.xml'
      );
      expect(route).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/sitemap.xml',
          target: 'filesystem',
          headers: {},
        })
      );
    });
  });

  describe('Proxy::Routing 002', () => {
    let proxy: Proxy;
    let config: ProxyConfig;

    beforeAll(() => {
      // Initialize proxy
      config = require('./res/config-002.json') as ProxyConfig;
      // No static routes
      const mockedFetch = jest.fn().mockImplementation(() => {
        return generateMockedFetchResponse(404, {}, { etag: '"notfound"' });
      });
      proxy = new Proxy(mockedFetch as any);
    });

    test('/product/corsair-vengeance-ram-GuyH42koQBDk0pFJq3tc: Dynamic URL', async () => {
      const route = await proxy.route(
        '123',
        config.routes,
        config.lambdaRoutes,
        'http://localhost',
        '/product/corsair-vengeance-ram-GuyH42koQBDk0pFJq3tc'
      );
      expect(route).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/__NEXT_PAGE_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/product/[...slug]',
          },
          target: 'lambda',
        })
      );
    });
  });

  describe('Proxy::Routing 003', () => {
    let proxy: Proxy;
    let config: ProxyConfig;

    beforeAll(() => {
      // Initialize proxy
      config = require('./res/config-003.json') as ProxyConfig;
      const staticRoutes = ['404', 'hello'];
      const mockedFetch = jest.fn().mockImplementation((url: string) => {
        for (const staticRoute of staticRoutes) {
          if (
            url ===
            `http://localhost/filesystem/123/${encodeURIComponent(staticRoute)}`
          ) {
            return generateMockedFetchResponse(200, {}, { etag: '"found"' });
          }
        }

        return generateMockedFetchResponse(404, {}, { etag: '"notfound"' });
      });
      proxy = new Proxy(mockedFetch as any);
    });

    test('/hello/: Trailing slash', async () => {
      const route = await proxy.route(
        '123',
        config.routes,
        config.lambdaRoutes,
        'http://localhost',
        '/hello/'
      );
      expect(route).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/hello/',
          status: 308,
          headers: {
            Location: '/hello',
          },
        })
      );
    });

    test('/unknown-route-with-trailing-slash/: Redirect trailing slash of unknown route', async () => {
      const route = await proxy.route(
        '123',
        config.routes,
        config.lambdaRoutes,
        'http://localhost',
        '/unknown-route-with-trailing-slash/'
      );
      expect(route).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/unknown-route-with-trailing-slash/',
          status: 308,
          headers: {
            Location: '/unknown-route-with-trailing-slash',
          },
        })
      );
    });
  });

  describe('Proxy::Routing 004', () => {
    let proxy: Proxy;
    let config: ProxyConfig;

    beforeAll(() => {
      // Initialize proxy
      config = require('./res/config-004.json') as ProxyConfig;
      const staticRoutes = ['404', 'hello'];
      const mockedFetch = jest.fn().mockImplementation((url: string) => {
        for (const staticRoute of staticRoutes) {
          if (
            url ===
            `http://localhost/filesystem/123/${encodeURIComponent(staticRoute)}`
          ) {
            return generateMockedFetchResponse(200, {}, { etag: '"found"' });
          }
        }

        return generateMockedFetchResponse(404, {}, { etag: '"notfound"' });
      });
      proxy = new Proxy(mockedFetch as any);
    });

    test('/unknown-route-with-trailing-slash/: Redirect trailing slash of unknown route', async () => {
      const route = await proxy.route(
        '123',
        config.routes,
        config.lambdaRoutes,
        'http://localhost',
        '/unknown-route-with-trailing-slash/'
      );
      expect(route).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/unknown-route-with-trailing-slash/',
          status: 308,
          headers: {
            Location: '/unknown-route-with-trailing-slash',
          },
        })
      );
    });
  });
});
