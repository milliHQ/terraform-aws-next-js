export default function handler(_req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml');

  return `<?xml version="1.0" encoding="UTF-8"?><hello>world</hello>`;
}
