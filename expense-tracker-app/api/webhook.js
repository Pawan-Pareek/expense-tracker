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

  try {
    let rawMsg = '';

    // Check query params (?msg=... or ?text=...)
    if (req.query) {
      rawMsg = req.query.msg || req.query.text || '';
    }

    // Check request body if query was empty
    if (!rawMsg && req.body) {
      if (typeof req.body === 'string') {
        rawMsg = req.body;
      } else if (typeof req.body === 'object') {
        rawMsg = req.body.msg || req.body.text || JSON.stringify(req.body);
      }
    }

    if (!rawMsg || !rawMsg.trim()) {
      return res.status(400).json({
        success: false,
        error: 'No message provided. Use ?msg=Your+Bank+SMS+Text in URL.'
      });
    }

    const cleanMsg = decodeURIComponent(rawMsg.replace(/\+/g, ' ')).trim();
    const lower = cleanMsg.toLowerCase();

    // 1. Detect Type (Credit vs Debit)
    const isCredit = /credited|received|refund|cashback|salary|cr to|money received/i.test(lower);
    const type = isCredit ? 'credit' : 'debit';

    // 2. Extract Amount
    let amount = 0;
    const amtMatch = cleanMsg.match(/(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/i) ||
                     cleanMsg.match(/(?:debited|spent|paid|credited|received|of)\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)/i);
    if (amtMatch && amtMatch[1]) {
      amount = parseFloat(amtMatch[1].replace(/,/g, ''));
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Could not detect transaction amount from message text.',
        received: cleanMsg
      });
    }

    // 3. Extract Merchant
    let merchant = type === 'credit' ? 'Income / Transfer' : 'Expense Payment';
    const brands = [
      'Swiggy', 'Zomato', 'Amazon', 'Flipkart', 'Uber', 'Ola', 'Blinkit', 'Zepto',
      'BigBasket', 'Myntra', 'Tata Power', 'Apollo Pharmacy', 'DMart'
    ];
    for (const b of brands) {
      if (new RegExp(`\\b${b}\\b`, 'i').test(cleanMsg)) {
        merchant = b;
        break;
      }
    }
    if (merchant.includes('Payment')) {
      const merchantMatch = cleanMsg.match(/\b(?:to|at|towards|from)\s+([A-Za-z0-9@.\s&'-]+?)(?:\s+on|\s+via|\s+using|\.|$)/i);
      if (merchantMatch && merchantMatch[1].trim().length > 2 && !/a\/c|account/i.test(merchantMatch[1])) {
        merchant = merchantMatch[1].trim();
      }
    }

    // 4. Extract Bank Source
    let source = 'Bank SMS';
    if (/hdfc/i.test(cleanMsg)) source = 'HDFC Bank';
    else if (/sbi/i.test(cleanMsg)) source = 'SBI Bank';
    else if (/icici/i.test(cleanMsg)) source = 'ICICI Bank';
    else if (/axis/i.test(cleanMsg)) source = 'Axis Bank';
    else if (/google pay|gpay/i.test(cleanMsg)) source = 'Google Pay';
    else if (/phonepe/i.test(cleanMsg)) source = 'PhonePe';
    else if (/paytm/i.test(cleanMsg)) source = 'Paytm UPI';

    // 5. Category
    let category = 'General';
    if (type === 'credit') {
      category = /salary|infosys|tcs/i.test(cleanMsg) ? 'Salary' : 'Income';
    } else {
      if (/swiggy|zomato|cafe|dining/i.test(cleanMsg)) category = 'Food & Dining';
      else if (/dmart|blinkit|zepto|grocer/i.test(cleanMsg)) category = 'Groceries';
      else if (/uber|ola|fuel|petrol/i.test(cleanMsg)) category = 'Transport';
      else if (/amazon|flipkart|myntra/i.test(cleanMsg)) category = 'Shopping';
      else if (/tata power|airtel|jio|electricity|bill/i.test(cleanMsg)) category = 'Utilities';
      else if (/pharmacy|apollo|medplus/i.test(cleanMsg)) category = 'Healthcare';
    }

    const transaction = {
      id: `tx-vercel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      amount,
      merchant,
      category,
      source,
      date: new Date().toISOString(),
      notes: 'Auto-captured via iOS Shortcut / Vercel Webhook',
      rawSms: cleanMsg
    };

    const savedToCloud = await persistTransaction(transaction);

    return res.status(200).json({
      success: true,
      message: `Transaction recorded: ${type.toUpperCase()} ₹${amount} at ${merchant}`,
      transaction,
      cloudSync: savedToCloud ? 'persisted' : 'pending_client_poll'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
