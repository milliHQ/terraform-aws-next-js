export default function handler(req, res) {
  const { actionId } = req.query;
  res.end(`actionId: ${actionId}`);
}
