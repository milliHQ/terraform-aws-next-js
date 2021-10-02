export default function handler(req, res) {
  const { actionId } = req.query;
  res.setHeader('Cache-Control', 'no-cache');
  res.end(`actionId: ${actionId}`);
}
