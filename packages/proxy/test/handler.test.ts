import { createServer, Server } from 'http';

import { CloudFrontRequest } from 'aws-lambda';
import getPort from 'get-port';

import { ProxyConfig } from '../src/types';
import { generateCloudFrontRequestEvent } from './test-utils';

/* -----------------------------------------------------------------------------
 * Proxy config server mock
 * ---------------------------------------------------------------------------*/

class ConfigServer {
  public proxyConfig?: ProxyConfig;
  public staticFiles: string[] = [];
  private server?: Server;

  async start() {
    const port = await getPort();
    this.server = createServer((req, res) => {
      if (req.url && req.url.startsWith('/filesystem')) {
        const splittedUrl = req.url.split('/');
        const filePath = splittedUrl.slice(3).join('/');

        if (this.proxyConfig && this.staticFiles.includes(filePath)) {
          res.statusCode = 200;
          return res.end(
            JSON.stringify({
              key: this.proxyConfig.deploymentId + '/static/' + filePath,
            })
          );
        } else {
          res.statusCode = 404;
          return res.end(JSON.stringify({}));
        }
      }

      // Respond with config
      res.end(JSON.stringify(this.proxyConfig));
    });

    await new Promise<void>((resolve) => this.server!.listen(port, resolve));

    return `http://localhost:${port}`;
  }

  stop() {
    if (!this.server) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      this.server!.close((err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }
}

/* -----------------------------------------------------------------------------
 * Tests
 * ---------------------------------------------------------------------------*/

describe('[proxy] Handler', () => {
  let handler: any;
  let configServer: ConfigServer;
  let configEndpoint: string;

  beforeEach(async () => {
    // Since the handler has it's own state we need to isolate it between test runs to prevent
    // using a cached proxyConfig
    jest.isolateModules(() => {
      handler = require('../src/handler').handler;
    });

    configServer = new ConfigServer();
    configEndpoint = await configServer.start();
  });

  afterEach(async () => {
    await configServer.stop();
  });

  test('External redirect [HTTP]', async () => {
    const proxyConfig: ProxyConfig = {
      etag: '123',
      deploymentId: 'abc',
      lambdaRoutes: {},
      prerenders: {},
      routes: [
        {
          src: '^\\/docs(?:\\/([^\\/]+?))$',
          dest: 'http://example.com/docs/$1',
          check: true,
        },
      ],
    };
    const requestPath = '/docs/hello-world';

    // Prepare configServer
    configServer.proxyConfig = proxyConfig;

    const cloudFrontEvent = generateCloudFrontRequestEvent({
      configEndpoint,
      uri: requestPath,
    });
    const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;

    expect(result.origin?.custom).toEqual(
      expect.objectContaining({
        domainName: 'example.com',
        path: '',
        port: 80,
        protocol: 'http',
      })
    );
    expect(result.uri).toBe('/docs/hello-world');
    expect(result.headers.host).toEqual(
      expect.arrayContaining([
        {
          key: 'host',
          value: 'example.com',
        },
      ])
    );
  });

  test('External redirect [HTTPS]', async () => {
    const proxyConfig: ProxyConfig = {
      etag: '123',
      deploymentId: 'abc',
      lambdaRoutes: {},
      prerenders: {},
      routes: [
        {
          src: '^\\/docs(?:\\/([^\\/]+?))$',
          dest: 'https://example.com/docs/$1',
          check: true,
        },
      ],
    };
    const requestPath = '/docs/hello-world';

    // Prepare configServer
    configServer.proxyConfig = proxyConfig;
    const cloudFrontEvent = generateCloudFrontRequestEvent({
      configEndpoint,
      uri: requestPath,
    });
    const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;

    expect(result.origin?.custom).toEqual(
      expect.objectContaining({
        domainName: 'example.com',
        path: '',
        port: 443,
        protocol: 'https',
      })
    );
    expect(result.uri).toBe('/docs/hello-world');
    expect(result.headers.host).toEqual(
      expect.arrayContaining([
        {
          key: 'host',
          value: 'example.com',
        },
      ])
    );
  });

  test('External redirect [Custom Port]', async () => {
    const proxyConfig: ProxyConfig = {
      etag: '123',
      deploymentId: 'abc',
      lambdaRoutes: {},
      prerenders: {},
      routes: [
        {
          src: '^\\/docs(?:\\/([^\\/]+?))$',
          dest: 'https://example.com:666/docs/$1',
          check: true,
        },
      ],
    };
    const requestPath = '/docs/hello-world';

    // Prepare configServer
    configServer.proxyConfig = proxyConfig;
    const cloudFrontEvent = generateCloudFrontRequestEvent({
      configEndpoint,
      uri: requestPath,
    });
    const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;

    expect(result.origin?.custom).toEqual(
      expect.objectContaining({
        domainName: 'example.com',
        path: '',
        port: 666,
        protocol: 'https',
      })
    );
    expect(result.uri).toBe('/docs/hello-world');
    expect(result.headers.host).toEqual(
      expect.arrayContaining([
        {
          key: 'host',
          value: 'example.com',
        },
      ])
    );
  });

  test('External redirect [Subdomain]', async () => {
    const proxyConfig: ProxyConfig = {
      etag: '123',
      deploymentId: 'abc',
      lambdaRoutes: {},
      prerenders: {},
      routes: [
        {
          src: '^\\/docs(?:\\/([^\\/]+?))$',
          dest: 'https://sub.example.com/docs/$1',
          check: true,
        },
      ],
    };
    const requestPath = '/docs/hello-world';

    // Prepare configServer
    configServer.proxyConfig = proxyConfig;
    const cloudFrontEvent = generateCloudFrontRequestEvent({
      configEndpoint,
      uri: requestPath,
    });
    const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;

    expect(result.origin?.custom).toEqual(
      expect.objectContaining({
        domainName: 'sub.example.com',
        path: '',
        port: 443,
        protocol: 'https',
      })
    );
    expect(result.uri).toBe('/docs/hello-world');
    expect(result.headers.host).toEqual(
      expect.arrayContaining([
        {
          key: 'host',
          value: 'sub.example.com',
        },
      ])
    );
  });

  test('i18n default locale rewrite', async () => {
    const proxyConfig: ProxyConfig = {
      etag: '123',
      deploymentId: 'abc',
      lambdaRoutes: {},
      prerenders: {},
      routes: [
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
        {
          handle: 'filesystem',
        },
      ],
    };
    const requestPath = '/';

    // Prepare configServer
    configServer.proxyConfig = proxyConfig;
    configServer.staticFiles = ['en'];
    const cloudFrontEvent = generateCloudFrontRequestEvent({
      configEndpoint,
      uri: requestPath,
    });
    const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;

    expect(result.origin?.s3).toEqual(
      expect.objectContaining({
        domainName: 's3.localhost',
        path: '',
      })
    );
    // deploymentId + path
    expect(result.uri).toBe('/abc/static/en');
  });

  test('Correctly request /index object from S3 when requesting /', async () => {
    const proxyConfig: ProxyConfig = {
      etag: '123',
      deploymentId: 'abc',
      lambdaRoutes: {},
      routes: [
        {
          src: '^(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))\\/$',
          headers: {
            Location: '/$1',
          },
          status: 308,
          continue: true,
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
          handle: 'resource',
        },
        {
          src: '/.*',
          status: 404,
        },
        {
          handle: 'miss',
        },
        {
          handle: 'rewrite',
        },
        {
          handle: 'hit',
        },
        {
          handle: 'error',
        },
        {
          src: '/.*',
          dest: '/404',
          status: 404,
        },
      ],
      prerenders: {},
    };

    const requestPath = '/';

    // Prepare configServer
    configServer.staticFiles = ['404', '500', 'index'];
    configServer.proxyConfig = proxyConfig;
    const cloudFrontEvent = generateCloudFrontRequestEvent({
      configEndpoint,
      uri: requestPath,
    });
    const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;

    expect(result.origin?.s3).toEqual(
      expect.objectContaining({
        domainName: 's3.localhost',
        path: '',
      })
    );
    expect(result.uri).toBe('/abc/static/index');
  });

  test('Add x-forwarded-host header to API-Gateway requests', async () => {
    const hostHeader = 'example.org';
    const proxyConfig: ProxyConfig = {
      etag: '123',
      deploymentId: 'abc',
      lambdaRoutes: {
        '/__NEXT_API_LAMBDA_0':
          'https://lambda-endpoint.localhost/__NEXT_API_LAMBDA_0',
      },
      prerenders: {},
      routes: [
        {
          src: '^(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))\\/$',
          headers: {
            Location: '/$1',
          },
          status: 308,
          continue: true,
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
          src: '^/api/test/?$',
          dest: '/__NEXT_API_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/api/test',
          },
          check: true,
        },
        {
          handle: 'resource',
        },
        {
          src: '/.*',
          status: 404,
        },
        {
          handle: 'miss',
        },
        {
          handle: 'rewrite',
        },
        {
          src: '^/api/test/?$',
          dest: '/__NEXT_API_LAMBDA_0',
          headers: {
            'x-nextjs-page': '/api/test',
          },
          check: true,
        },
        {
          handle: 'hit',
        },
        {
          handle: 'error',
        },
        {
          src: '/.*',
          dest: '/404',
          status: 404,
        },
      ],
    };
    const requestPath = '/api/test';

    // Prepare configServer
    configServer.proxyConfig = proxyConfig;
    const cloudFrontEvent = generateCloudFrontRequestEvent({
      configEndpoint,
      uri: requestPath,
    });
    const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;

    expect(result.origin?.custom).toEqual(
      expect.objectContaining({
        domainName: 'lambda-endpoint.localhost',
        path: '/__NEXT_API_LAMBDA_0',
      })
    );
    expect(result.headers).toEqual(
      expect.objectContaining({
        'x-nextjs-page': [
          {
            key: 'x-nextjs-page',
            value: '/api/test',
          },
        ],
        'x-forwarded-host': [
          {
            key: 'X-Forwarded-Host',
            value: hostHeader,
          },
        ],
      })
    );
  });

  // Related to issue: https://github.com/milliHQ/terraform-aws-next-js/issues/218
  test('Dynamic routes with dynamic part in directory', async () => {
    const proxyConfig: ProxyConfig = {
      etag: '123',
      deploymentId: 'abc',
      lambdaRoutes: {
        '/__NEXT_API_LAMBDA_0':
          'https://lambda-endpoint.localhost/__NEXT_API_LAMBDA_0',
        '/__NEXT_PAGE_LAMBDA_0':
          'https://lambda-endpoint.localhost/__NEXT_PAGE_LAMBDA_0',
      },
      prerenders: {},
      routes: [
        {
          src: '^(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))\\/$',
          headers: {
            Location: '/$1',
          },
          status: 308,
          continue: true,
        },
        {
          src: '^\\/blog(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))?$',
          headers: {
            Location: '/test/$1',
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
          src: '^\\/robots\\.txt$',
          dest: '/api/robots',
          check: true,
        },
        {
          handle: 'resource',
        },
        {
          src: '/.*',
          status: 404,
        },
        {
          handle: 'miss',
        },
        {
          handle: 'rewrite',
        },
        {
          src: '^/_next/data/oniBm2oZ9GXevuUEdEG44/index.json$',
          dest: '/',
          check: true,
        },
        {
          src: '^/_next/data/oniBm2oZ9GXevuUEdEG44/test/(?<slug>.+?)\\.json$',
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
          src: '^/users/(?<user_id>[^/]+?)(?:/)?$',
          dest: '/users/[user_id]?user_id=$user_id',
          check: true,
        },
        {
          handle: 'hit',
        },
        {
          handle: 'error',
        },
        {
          src: '/.*',
          dest: '/404',
          status: 404,
        },
      ],
    };
    const requestPath = '/users/432';

    // Prepare configServer
    configServer.proxyConfig = proxyConfig;
    configServer.staticFiles = [
      '404',
      '500',
      'favicon.ico',
      'about',
      'users/[user_id]',
    ];
    const cloudFrontEvent = generateCloudFrontRequestEvent({
      configEndpoint,
      uri: requestPath,
    });
    const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;

    expect(result.origin?.s3).toEqual(
      expect.objectContaining({
        domainName: 's3.localhost',
        path: '',
      })
    );
    expect(result.uri).toBe('/abc/static/users/[user_id]');
  });

  test('Redirects with querystring', async () => {
    const proxyConfig: ProxyConfig = {
      etag: '123',
      deploymentId: 'abc',
      lambdaRoutes: {},
      prerenders: {},
      routes: [
        {
          src: '^(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))\\/$',
          headers: {
            Location: '/$1',
          },
          status: 308,
          continue: true,
        },
        {
          src: '^\\/one$',
          headers: {
            Location: '/newplace',
          },
          status: 308,
        },
        {
          src: '^\\/two(?:\\/((?:[^\\/]+?)(?:\\/(?:[^\\/]+?))*))?$',
          headers: {
            Location: '/newplacetwo/$1',
          },
          status: 308,
        },
        {
          src: '^\\/three$',
          headers: {
            Location: '/newplace?foo=bar',
          },
          status: 308,
        },
        {
          src: '^\\/four$',
          headers: {
            Location: 'https://example.com',
          },
          status: 308,
        },
      ],
    };
    configServer.proxyConfig = proxyConfig;

    {
      // Remove trailing slash
      // /test/?foo=bar -> /test?foo=bar
      const cloudFrontEvent = generateCloudFrontRequestEvent({
        configEndpoint,
        uri: '/test/',
        querystring: 'foo=bar',
      });
      const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;
      expect(result.headers).toEqual(
        expect.objectContaining({
          location: [
            {
              key: 'Location',
              value: '/test?foo=bar',
            },
          ],
        })
      );
    }

    {
      // Relative route replace
      // /one?foo=bar -> /newplace?foo=bar
      const cloudFrontEvent = generateCloudFrontRequestEvent({
        configEndpoint,
        uri: '/one',
        querystring: 'foo=bar',
      });
      const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;
      expect(result.headers).toEqual(
        expect.objectContaining({
          location: [
            {
              key: 'Location',
              value: '/newplace?foo=bar',
            },
          ],
        })
      );
    }

    {
      // Relative route partial replace
      // /two/some/path?foo=bar -> /newplace/some/path?foo=bar
      const cloudFrontEvent = generateCloudFrontRequestEvent({
        configEndpoint,
        uri: '/two/some/path',
        querystring: 'foo=bar',
      });
      const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;
      expect(result.headers).toEqual(
        expect.objectContaining({
          location: [
            {
              key: 'Location',
              value: '/newplacetwo/some/path?foo=bar',
            },
          ],
        })
      );
    }

    {
      // Try to override predefined param
      // /three?foo=badValue -> /newplace?foo=bar
      const cloudFrontEvent = generateCloudFrontRequestEvent({
        configEndpoint,
        uri: '/three',
        querystring: 'foo=badValue',
      });
      const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;
      expect(result.headers).toEqual(
        expect.objectContaining({
          location: [
            {
              key: 'Location',
              value: '/newplace?foo=bar',
            },
          ],
        })
      );
    }

    {
      // Redirect to external URL
      // /four?foo=bar -> https://example.com?foo=bar
      const cloudFrontEvent = generateCloudFrontRequestEvent({
        configEndpoint,
        uri: '/four',
        querystring: 'foo=bar',
      });
      const result = (await handler(cloudFrontEvent)) as CloudFrontRequest;
      expect(result.headers).toEqual(
        expect.objectContaining({
          location: [
            {
              key: 'Location',
              value: 'https://example.com/?foo=bar',
            },
          ],
        })
      );
    }
  });
});
