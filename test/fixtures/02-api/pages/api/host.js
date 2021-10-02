/**
 * Output the host header of the request
 */

export default function handler(req, res) {
  const host = req.headers['host'];

  res.setHeader('Cache-Control', 'no-cache');
  res.end(`host: ${host}`);
}
