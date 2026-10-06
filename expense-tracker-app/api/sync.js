// Vercel Serverless Function: Cloud Data Sync API
// Handles synchronization between Web Browser and iPhone

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. GET: Fetch transactions from Cloud KV
  if (req.method === 'GET') {
    if (kvUrl && kvToken) {
      try {
        const response = await fetch(`${kvUrl}/lrange/expense_tracker_txs/0/-1`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        const data = await response.json();
        const txs = (data.result || []).map((item) => {
          return typeof item === 'string' ? JSON.parse(item) : item;
        });
        return res.status(200).json({ success: true, count: txs.length, transactions: txs });
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
      }
    }
    return res.status(200).json({ success: true, count: 0, transactions: [] });
  }

  // 2. POST: Merge / Sync Transactions
  if (req.method === 'POST') {
    const incomingList = req.body?.transactions || (Array.isArray(req.body) ? req.body : []);

    if (kvUrl && kvToken && incomingList.length > 0) {
      try {
        // Read existing cloud transactions
        const response = await fetch(`${kvUrl}/lrange/expense_tracker_txs/0/-1`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        const data = await response.json();
        const existing = (data.result || []).map((item) => {
          return typeof item === 'string' ? JSON.parse(item) : item;
        });

        // Merge by ID
        const map = new Map();
        existing.forEach(t => map.set(t.id, t));
        incomingList.forEach(t => map.set(t.id, t));

        const merged = Array.from(map.values());

        // Overwrite list in KV
        await fetch(`${kvUrl}/del/expense_tracker_txs`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });

        // Push merged items (in batches or loop)
        for (const item of merged.slice(-200)) {
          await fetch(`${kvUrl}/rpush/expense_tracker_txs`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${kvToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
          });
        }

        return res.status(200).json({
          success: true,
          syncedCount: incomingList.length,
          total: merged.length,
          transactions: merged
        });
      } catch (e) {
        console.warn('Cloud sync error:', e);
      }
    }

    return res.status(200).json({
      success: true,
      syncedCount: incomingList.length,
      total: incomingList.length,
      transactions: incomingList
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
