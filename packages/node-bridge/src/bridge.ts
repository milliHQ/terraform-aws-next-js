/// <reference types="node" />
import { AddressInfo } from 'net';
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';
import {
  Server,
  IncomingHttpHeaders,
  OutgoingHttpHeaders,
  request,
} from 'http';
import { URLSearchParams } from 'url';

export interface NowProxyRequest {
  isApiGateway?: boolean;
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

export interface NowProxyResponse {
  statusCode: number;
  headers: OutgoingHttpHeaders;
  body: string;
  isBase64Encoded: boolean;
}

interface ServerLike {
  timeout?: number;
  listen: (
    opts: {
      host?: string;
      port?: number;
    },
    callback: (this: Server | null) => void
  ) => Server | void;
}

/**
 * If the `http.Server` handler function throws an error asynchronously,
 * then it ends up being an unhandled rejection which doesn't kill the node
 * process which causes the HTTP request to hang indefinitely. So print the
 * error here and force the process to exit so that the lambda invocation
 * returns an Unhandled error quickly.
 */
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

function normalizeAPIGatewayProxyEvent(
  event: APIGatewayProxyEventV2
): NowProxyRequest {
  let bodyBuffer: Buffer | null;
  const {
    requestContext: {
      http: { method, path },
    },
    headers,
    body,
    queryStringParameters,
    rawPath,
  } = event;
  // Trims the resource from the path
  const normalizedRawPath = rawPath.endsWith('/{proxy+}')
    ? rawPath.substring(0, rawPath.length - 9)
    : rawPath;
  const trimmedPath = path.slice(normalizedRawPath.length) || '/';

  // API Gateway cuts the query string from the path
  // https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
  // TODO: Move to Vercel trusted params in future
  const params = new URLSearchParams(queryStringParameters).toString();
  const parameterizedPath = params ? `${trimmedPath}?${params}` : trimmedPath;

  if (body) {
    if (event.isBase64Encoded) {
      bodyBuffer = Buffer.from(body, 'base64');
    } else {
      bodyBuffer = Buffer.from(body);
    }
  } else {
    bodyBuffer = Buffer.alloc(0);
  }

  return {
    isApiGateway: true,
    method,
    path: parameterizedPath,
    headers,
    body: bodyBuffer,
  };
}
export class Bridge {
  private server: ServerLike | null;
  private listening: Promise<AddressInfo>;
  private resolveListening: (info: AddressInfo) => void;
  private events: { [key: string]: NowProxyRequest } = {};
  private reqIdSeed = 1;
  private shouldStoreEvents = false;

  constructor(server?: ServerLike, shouldStoreEvents = false) {
    this.server = null;
    this.shouldStoreEvents = shouldStoreEvents;
    if (server) {
      this.setServer(server);
    }
    this.launcher = this.launcher.bind(this);

    // This is just to appease TypeScript strict mode, since it doesn't
    // understand that the Promise constructor is synchronous
    this.resolveListening = (_info: AddressInfo) => {}; // eslint-disable-line @typescript-eslint/no-unused-vars

    this.listening = new Promise((resolve) => {
      this.resolveListening = resolve;
    });
  }

  setServer(server: ServerLike) {
    this.server = server;
  }

  listen() {
    const { server, resolveListening } = this;
    if (!server) {
      throw new Error('Server has not been set!');
    }

    if (typeof server.timeout === 'number' && server.timeout > 0) {
      // Disable timeout (usually 2 minutes until Node 13).
      // Instead, user should assign function `maxDuration`.
      server.timeout = 0;
    }

    return server.listen(
      {
        host: '127.0.0.1',
        port: 0,
      },
      function listeningCallback() {
        if (!this || typeof this.address !== 'function') {
          throw new Error(
            'Missing server.address() function on `this` in server.listen()'
          );
        }

        const addr = this.address();

        if (!addr) {
          throw new Error('`server.address()` returned `null`');
        }

        if (typeof addr === 'string') {
          throw new Error(
            `Unexpected string for \`server.address()\`: ${addr}`
          );
        }

        resolveListening(addr);
      }
    );
  }

  async launcher(
    event: APIGatewayProxyEventV2,
    context: Pick<Context, 'callbackWaitsForEmptyEventLoop'>
  ): Promise<APIGatewayProxyStructuredResultV2> {
    context.callbackWaitsForEmptyEventLoop = false;
    const { port } = await this.listening;

    const normalizedEvent = normalizeAPIGatewayProxyEvent(event);
    const { isApiGateway, method, path, headers, body } = normalizedEvent;

    if (this.shouldStoreEvents) {
      const reqId = `${this.reqIdSeed++}`;
      this.events[reqId] = normalizedEvent;
      headers['x-now-bridge-request-id'] = reqId;
    }

    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
      const opts = { hostname: '127.0.0.1', port, path, method };
      const req = request(opts, (res) => {
        const response = res;
        const respBodyChunks: Buffer[] = [];
        response.on('data', (chunk) => respBodyChunks.push(Buffer.from(chunk)));
        response.on('error', reject);
        response.on('end', () => {
          const bodyBuffer = Buffer.concat(respBodyChunks);
          delete response.headers.connection;

          if (isApiGateway) {
            delete response.headers['content-length'];
          } else if (response.headers['content-length']) {
            response.headers['content-length'] = String(bodyBuffer.length);
          }

          const headers: Record<string, string> = {};
          const cookies: string[] = [];

          // Iterate over all headers and normalize them (to strings) and filter our cookies
          for (const headerKey in response.headers) {
            const headerValue = response.headers[headerKey];

            // Filter out cookies
            if (headerKey === 'set-cookie' && headerValue) {
              cookies.push(...headerValue);
              continue;
            }

            // Transform multi value headers to comma separated headers
            // ['value1', 'value2'] => 'value1,value2'
            // TODO: Seems like headers are already comma separated when they
            //       arrive here (comment this out and run unit tests)
            //       So we should find out if this is the general behavior of Node.js
            if (Array.isArray(headerValue)) {
              headers[headerKey] = headerValue.join(',');
              continue;
            }

            if (headerValue) {
              headers[headerKey] = headerValue as string;
            }
          }

          resolve({
            cookies,
            statusCode: response.statusCode || 200,
            headers,
            body: bodyBuffer.toString('base64'),
            isBase64Encoded: true,
          });
        });
      });

      req.on('error', (error) => {
        setTimeout(() => {
          // this lets express print the true error of why the connection was closed.
          // it is probably 'Cannot set headers after they are sent to the client'
          reject(error);
        }, 2);
      });

      for (const [name, value] of Object.entries(headers)) {
        if (value === undefined) {
          console.error(
            'Skipping HTTP request header %j because value is undefined',
            name
          );
          continue;
        }
        try {
          req.setHeader(name, value);
        } catch (err) {
          console.error(
            'Skipping HTTP request header: %j',
            `${name}: ${value}`
          );
          console.error(err.message);
        }
      }

      if (body) req.write(body);
      req.end();
    });
  }

  consumeEvent(reqId: string) {
    const event = this.events[reqId];
    delete this.events[reqId];
    return event;
  }
}
