// Vercel Serverless Function: Bank SMS & UPI Webhook Parser
// Receives SMS text from iOS Shortcuts and auto-logs Debit/Credit transactions

async function persistTransaction(tx) {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (kvUrl && kvToken) {
    try {
      // Push transaction into Upstash / Vercel KV list
      await fetch(`${kvUrl}/lpush/expense_tracker_txs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tx)
      });
      return true;
    } catch (e) {
      console.warn('KV persist failed:', e);
    }
  }
  return false;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Automatic SMS message transaction creation is removed in favor of manual entry.
  return res.status(200).json({
    success: true,
    automationEnabled: false,
    message: 'Automatic SMS message population is disabled. Transactions should be added manually in the Expense Tracker app, and they will sync automatically between your mobile phone and laptop.'
  });
};
