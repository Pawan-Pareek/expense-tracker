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

  if (req.method === 'POST') {
    const incomingList = req.body?.transactions || (Array.isArray(req.body) ? req.body : []);

    if (!kvUrl || !kvToken) {
      return res.status(500).json({
        success: false,
        error: 'Vercel KV (Redis) is not configured. Please enable Vercel Storage in your project dashboard.'
      });
    }

    try {
      // 1. Fetch tombstones (globally deleted IDs)
      const tombstoneResponse = await fetch(`${kvUrl}/smembers/expense_tracker_tombstones`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const tombstoneData = await tombstoneResponse.json();
      const tombstones = new Set(tombstoneData.result || []);

      // 2. Add new deleted IDs to tombstones
      const deletedIds = req.body?.deletedIds || [];
      if (Array.isArray(deletedIds) && deletedIds.length > 0) {
        deletedIds.forEach(id => tombstones.add(id));
        // Save to KV in the background
        for (const id of deletedIds) {
          await fetch(`${kvUrl}/sadd/expense_tracker_tombstones`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(id)
          });
        }
      }

      // 3. Read existing cloud transactions
      const response = await fetch(`${kvUrl}/lrange/expense_tracker_txs/0/-1`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      
      if (!response.ok) {
         return res.status(500).json({ success: false, error: 'Failed to connect to KV Store.' });
      }

      const data = await response.json();
      const existing = (data.result || []).map((item) => {
        return typeof item === 'string' ? JSON.parse(item) : item;
      });

      // 4. Merge by ID, aggressively rejecting any ID in the tombstone set
      const map = new Map();
      existing.forEach(t => {
        if (!tombstones.has(t.id)) map.set(t.id, t);
      });
      
      incomingList.forEach(t => {
        if (!tombstones.has(t.id)) {
          const existingTx = map.get(t.id);
          if (!existingTx || (t.updatedAt && (!existingTx.updatedAt || t.updatedAt > existingTx.updatedAt))) {
            map.set(t.id, t);
          }
        }
      });

      const merged = Array.from(map.values());

      // Overwrite list in KV
      await fetch(`${kvUrl}/del/expense_tracker_txs`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });

      // Push merged items
      for (const item of merged.slice(-500)) { // limit to last 500 to prevent KV overflow on free tier
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
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

