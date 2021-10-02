export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Set-Cookie', ['cookie-1', 'cookie-2']);
  res.end(JSON.stringify({ foo: 'bar' }));
}
