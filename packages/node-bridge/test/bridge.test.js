const assert = require('assert');
const { Server } = require('http');
const { Bridge } = require('../src/bridge');

test('port binding', async () => {
  const server = new Server();
  const bridge = new Bridge(server);
  bridge.listen();

  // Test port binding
  const info = await bridge.listening;
  expect(info.address).toBe('127.0.0.1');
  expect(typeof info.port).toBe('number');

  server.close();
});

test('`APIGatewayProxyEvent` normalizing', async () => {
  const server = new Server((req, res) => {
    res.setHeader('Set-Cookie', 'abc');
    res.setHeader('x-some-multi-header', ['d', 'e', 'f']);

    res.end(
      JSON.stringify({
        method: req.method,
        path: req.url,
        headers: req.headers,
      })
    );
  });
  const bridge = new Bridge(server);
  bridge.listen();
  const context = {};
  const result = await bridge.launcher(
    {
      headers: { foo: 'bar', multi: 'a,b,c' },
      rawPath: '/apigateway',
      requestContext: {
        http: {
          method: 'GET',
          path: '/',
        },
      },
      body: null,
    },
    context
  );

  expect(result.isBase64Encoded).toBe(true);
  expect(result.statusCode).toBe(200);
  expect(result.isBase64Encoded).toBe(true);
  expect(result.headers['set-cookie']).toBeUndefined();
  expect(result.headers['Set-Cookie']).toBeUndefined();
  expect(result.cookies).toEqual(['abc']);
  expect(result.headers).toEqual(
    expect.objectContaining({
      'x-some-multi-header': 'd, e, f',
    })
  );

  const body = JSON.parse(Buffer.from(result.body, 'base64').toString());
  expect(body.method).toBe('GET');
  // TODO: Understand the change from path (v1.0) to rawPath (v2.0)
  expect(body.path).toBe('/apigateway');
  expect(body.headers.foo).toBe('bar');
  expect(body.headers.multi).toEqual('a,b,c');
  expect(context.callbackWaitsForEmptyEventLoop).toBe(false);

  server.close();
});

test('consumeEvent', async () => {
  const mockListener = jest.fn((req, res) => {
    res.end('hello');
  });

  const server = new Server(mockListener);
  const bridge = new Bridge(server, true);
  bridge.listen();

  const context = { callbackWaitsForEmptyEventLoop: true };
  await bridge.launcher(
    {
      body: JSON.stringify({
        headers: { foo: 'baz' },
        requestContext: {
          http: {
            method: 'POST',
            path: '/nowproxy',
          },
        },
        rawPath: '/nowproxy',
        body: 'body=1',
      }),
    },
    context
  );

  const headers = mockListener.mock.calls[0][0].headers;
  const reqId = headers['x-now-bridge-request-id'];

  expect(reqId).toBeTruthy();

  const event = bridge.consumeEvent(reqId);
  expect(event.body.toString()).toBe('body=1');

  // an event can't be consumed multiple times
  // to avoid memory leaks
  expect(bridge.consumeEvent(reqId)).toBeUndefined();

  server.close();
});

test('invalid request headers', async () => {
  const server = new Server((req, res) =>
    res.end(
      JSON.stringify({
        method: req.method,
        path: req.url,
        headers: req.headers,
      })
    )
  );
  const bridge = new Bridge(server);
  bridge.listen();
  const context = { callbackWaitsForEmptyEventLoop: true };
  const result = await bridge.launcher(
    {
      Action: 'Invoke',
      body: JSON.stringify({
        method: 'GET',
        headers: { foo: 'baz\n', ok: 'true' },
        path: '/nowproxy',
        body: 'body=1',
      }),
    },
    context
  );
  assert.equal(result.isBase64Encoded, true);
  assert.equal(result.statusCode, 200);
  const body = JSON.parse(Buffer.from(result.body, 'base64').toString());
  assert.equal(body.method, 'GET');
  assert.equal(body.path, '/nowproxy');
  assert.equal(body.headers.ok, 'true');
  assert(!body.headers.foo);
  assert.equal(context.callbackWaitsForEmptyEventLoop, false);

  server.close();
});
