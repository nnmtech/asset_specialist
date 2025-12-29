export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  console.log('🆕 LEAD:', req.body);
  res.json({ success: true });
