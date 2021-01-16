import { Proxy } from '../proxy';
import { ProxyConfig } from '../types';

describe('Proxy', () => {
  describe('Proxy::Routing 001', () => {
    let proxy: Proxy;
    beforeAll(() => {
      // Initialize proxy
      const config = require('./res/config-001.json') as ProxyConfig;
      proxy = new Proxy(
        config.routes,
        config.lambdaRoutes,
        config.staticRoutes
      );
    });

    test('/: Index Lambda route', () => {
      const route = proxy.route('/');
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

    test('/about: Route not found', () => {
      const route = proxy.route('/about');
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

    test('/test/a/b/c: Slug Lambda Route', () => {
      const route = proxy.route('/test/a/b/c');
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

    test('/sitemap.xml: Static file routing', () => {
      const route = proxy.route('/sitemap.xml');
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

    beforeAll(() => {
      // Initialize proxy
      const config = require('./res/config-002.json') as ProxyConfig;
      proxy = new Proxy(
        config.routes,
        config.lambdaRoutes,
        config.staticRoutes
      );
    });

    test('/product/corsair-vengeance-ram-GuyH42koQBDk0pFJq3tc: Dynamic URL', () => {
      const route = proxy.route(
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

    beforeAll(() => {
      // Initialize proxy
      const config = require('./res/config-003.json') as ProxyConfig;
      proxy = new Proxy(
        config.routes,
        config.lambdaRoutes,
        config.staticRoutes
      );
    });

    test('/hello/: Tailing slash', () => {
      const route = proxy.route('/hello/');
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

    test('/unknown-route-with-tailing-slash/: Redirect tailing slash of unknown route', () => {
      const route = proxy.route('/unknown-route-with-tailing-slash/');
      expect(route).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/unknown-route-with-tailing-slash/',
          status: 308,
          headers: {
            Location: '/unknown-route-with-tailing-slash',
          },
        })
      );
    });
  });

  describe('Proxy::Routing 004', () => {
    let proxy: Proxy;

    beforeAll(() => {
      // Initialize proxy
      const config = require('./res/config-004.json') as ProxyConfig;
      proxy = new Proxy(
        config.routes,
        config.lambdaRoutes,
        config.staticRoutes
      );
    });

    test('/unknown-route-with-tailing-slash/: Redirect tailing slash of unknown route', () => {
      const route = proxy.route('/unknown-route-with-tailing-slash/');
      expect(route).toEqual(
        expect.objectContaining({
          found: true,
          dest: '/unknown-route-with-tailing-slash/',
          status: 308,
          headers: {
            Location: '/unknown-route-with-tailing-slash',
          },
        })
      );
    });
  });
});
