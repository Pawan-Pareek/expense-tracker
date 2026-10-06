// Vercel Serverless Function: Health Check and API Info
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const hasKv = Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);

  res.status(200).json({
    status: 'online',
    platform: 'Vercel Serverless Edge',
    storage: hasKv ? 'Vercel KV / Upstash (Cloud Active)' : 'In-Memory / LocalStorage Bridge',
    serverTime: new Date().toISOString()
  });
};
