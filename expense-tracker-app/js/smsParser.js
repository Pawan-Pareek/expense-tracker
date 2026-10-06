/**
 * Intelligent SMS & Transaction Notification Parser
 * Optimized for Indian Banks (HDFC, SBI, ICICI, Axis, Kotak, PNB), UPI (GPay, PhonePe, Paytm, CRED),
 * and debit/credit card transaction messages.
 * 
 * 100% Client-side, runs locally without sending any data to external servers.
 */

const SMS_SAMPLES = [
  {
    name: 'HDFC Bank - Debit (Swiggy)',
    text: 'HDFC Bank: Rs 480.00 debited from A/C XX4012 on 06-Oct-26 to SWIGGY BANGALORE via UPI. Avl Bal: Rs 34,520.00'
  },
  {
    name: 'SBI Bank - Debit (Amazon)',
    text: 'SBI: Your A/C ending 3114 has been debited by INR 2,450.00 on 06-Oct-26 at AMAZON PAY INDIA via UPI. UPI Ref 6281920.'
  },
  {
    name: 'ICICI Bank - Credit (Salary / NEFT)',
    text: 'Your A/C XX8921 is credited by Rs 50,000.00 on 06-Oct-26 towards Salary by TECH CORP. Avl Bal: Rs 68,450.00'
  },
  {
    name: 'PhonePe UPI - Debit (Electricity Bill)',
    text: 'Paid Rs 1,850 to Tata Power on PhonePe using HDFC Bank A/c XX4012. UPI Ref: 6299104.'
  },
  {
    name: 'Google Pay - Debit (Groceries)',
    text: 'Rs 1,240.00 debited from SBI A/C XX3114 to NATURES BASKET on 06-Oct-26 via UPI. Bal: Rs 28,100'
  },
  {
    name: 'Paytm - Credit (Cashback / Refund)',
    text: 'Paytm: Refund received! Rs 650.00 credited to your account from ZOMATO on 06-Oct-26.'
  },
  {
    name: 'Axis Bank - Debit (Fuel / HP Petrol)',
    text: 'Axis Bank: INR 2,000.00 spent on your card XX1102 at HP AUTO FUEL PUMP on 06-Oct-26. Avl Lmt: Rs 1,45,000.'
  },
  {
    name: 'SBI Bank - Credit (Friend UPI Transfer)',
    text: 'Dear SBI User, A/C XX3114 credited by Rs 3,500.00 on 06-Oct-26 by UPI/Transfer from rahul@okhdfcbank.'
  }
];

class SMSParser {
  /**
   * Determine whether message indicates Debit or Credit
   */
  static detectType(text) {
    const cleanText = text.toLowerCase();

    // Priority checks for Credit
    const creditKeywords = [
      'credited', 'credit of', 'received', 'deposited', 'refund', 'cashback', 
      'salary', 'cr to', 'added to', 'credited by', 'credited with', 'money received'
    ];

    // Priority checks for Debit
    const debitKeywords = [
      'debited', 'debit of', 'spent', 'paid', 'transferred to', 'purchase of',
      'sent to', 'dr to', 'withdrawn', 'sent rs', 'payment of', 'charged'
    ];

    let creditScore = 0;
    let debitScore = 0;

    creditKeywords.forEach((kw) => {
      if (cleanText.includes(kw)) creditScore += 2;
    });

    debitKeywords.forEach((kw) => {
      if (cleanText.includes(kw)) debitScore += 2;
    });

    // Handle nuances like "debited for refund" or "reversal"
    if (cleanText.includes('reversal') || cleanText.includes('refund received')) {
      creditScore += 3;
    }

    if (creditScore > debitScore) return 'credit';
    if (debitScore > creditScore) return 'debit';

    // Default fallback: if neither is clearly higher, check for "to" (usually spending)
    if (/\bto\b/i.test(cleanText) && !cleanText.includes('credited to')) {
      return 'debit';
    }
    return 'debit';
  }

  /**
   * Extract transaction amount (handles INR, Rs., Rs, commas)
   */
  static extractAmount(text) {
    // Regex for: (Rs.?|INR|₹)?\s?(\d{1,3}(,\d{3})*(\.\d{1,2})?|\d+(\.\d{1,2})?)
    const amountRegexes = [
      /(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/i,
      /(?:debited(?:\s+by|\s+with)?|credited(?:\s+by|\s+with)?|spent|paid|of)\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)/i,
      /(?:amount|amt)\s*(?:of|:)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)/i,
      /(?:sent|transferred)\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)/i
    ];

    for (const regex of amountRegexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        const cleaned = match[1].replace(/,/g, '');
        const val = parseFloat(cleaned);
        if (!isNaN(val) && val > 0) {
          return val;
        }
      }
    }

    // Secondary scan for any standalone currency number
    const standaloneMatch = text.match(/(?:Rs|INR|₹)\s?(\d+(?:\.\d{1,2})?)/i);
    if (standaloneMatch) {
      return parseFloat(standaloneMatch[1]);
    }

    return 0;
  }

  /**
   * Extract merchant, beneficiary or description
   */
  static extractMerchant(text, type) {
    // Common patterns in Indian bank SMS:
    // "to <Merchant>"
    // "at <Merchant>"
    // "towards <Merchant>"
    // "from <Sender>"
    // "info: <Merchant>"
    // "VPA <VPA>"
    
    // Pattern 1: "at <Merchant> on" or "at <Merchant>"
    const atMatch = text.match(/\bat\s+([A-Za-z0-9\s&'-]+?)(?:\s+on|\s+via|\s+using|\.|$)/i);
    if (atMatch && atMatch[1].trim().length > 2 && !/card|a\/c|account/i.test(atMatch[1])) {
      return this.cleanMerchant(atMatch[1]);
    }

    // Pattern 2: "to <Merchant> on/via"
    const toMatch = text.match(/\bto\s+(?:VPA\s+)?([A-Za-z0-9@.\s&'-]+?)(?:\s+on|\s+via|\s+using|\s+from|\.|$)/i);
    if (toMatch && toMatch[1].trim().length > 2 && !/your|my|a\/c|account|credit/i.test(toMatch[1])) {
      return this.cleanMerchant(toMatch[1]);
    }

    // Pattern 3: "towards <Merchant>"
    const towardsMatch = text.match(/\btowards\s+([A-Za-z0-9\s&'-]+?)(?:\s+by|\s+on|\s+via|\.|$)/i);
    if (towardsMatch && towardsMatch[1].trim().length > 2) {
      return this.cleanMerchant(towardsMatch[1]);
    }

    // Pattern 4: "from <Sender>" (for Credits)
    const fromMatch = text.match(/\bfrom\s+([A-Za-z0-9@.\s&'-]+?)(?:\s+on|\s+via|\s+to|\.|$)/i);
    if (fromMatch && fromMatch[1].trim().length > 2 && !/a\/c|account|card/i.test(fromMatch[1])) {
      return this.cleanMerchant(fromMatch[1]);
    }

    // Pattern 5: "info: <Merchant>"
    const infoMatch = text.match(/\binfo:\s*([A-Za-z0-9\s&'-]+?)(?:\.|$)/i);
    if (infoMatch) {
      return this.cleanMerchant(infoMatch[1]);
    }

    // Known popular brands lookup
    const brands = [
      'Swiggy', 'Zomato', 'Amazon', 'Flipkart', 'Uber', 'Ola', 'Blinkit', 'Zepto',
      'BigBasket', 'Myntra', 'BookMyShow', 'Netflix', 'Spotify', 'Airtel', 'Jio',
      'Tata Power', 'Apollo Pharmacy', 'DMart', 'HP Auto', 'Indian Oil', 'Bharat Petroleum'
    ];
    for (const b of brands) {
      if (new RegExp(`\\b${b}\\b`, 'i').test(text)) {
        return b;
      }
    }

    return type === 'credit' ? 'Income / Transfer' : 'Expense Payment';
  }

  static cleanMerchant(str) {
    return str
      .replace(/VPA/i, '')
      .replace(/A\/C.*$/i, '')
      .replace(/Ref.*$/i, '')
      .replace(/UPI.*$/i, '')
      .replace(/on\s+\d{1,2}.*$/i, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Detect Bank / Source / Payment Provider
   */
  static extractSource(text) {
    const sources = [
      { name: 'HDFC Bank', regex: /HDFC/i },
      { name: 'SBI Bank', regex: /SBI|State Bank/i },
      { name: 'ICICI Bank', regex: /ICICI/i },
      { name: 'Axis Bank', regex: /Axis/i },
      { name: 'Kotak Bank', regex: /Kotak/i },
      { name: 'PNB Bank', regex: /PNB|Punjab National/i },
      { name: 'Bank of Baroda', regex: /BOB|Baroda/i },
      { name: 'Google Pay', regex: /Google Pay|GPay/i },
      { name: 'PhonePe', regex: /PhonePe/i },
      { name: 'Paytm', regex: /Paytm/i },
      { name: 'CRED', regex: /CRED/i }
    ];

    let foundBank = 'Bank SMS';
    for (const s of sources) {
      if (s.regex.test(text)) {
        foundBank = s.name;
        break;
      }
    }

    // Extract Account or Card ending digits: XX4012 or *3114
    const acctMatch = text.match(/(?:A\/C|A\/c|Acct|Card|ending)\s*(?:no\.?)?\s*(?:XX|\*|ending)?\s*([0-9]{3,4})/i);
    if (acctMatch && acctMatch[1]) {
      return `${foundBank} XX${acctMatch[1]}`;
    }

    return foundBank;
  }

  /**
   * Auto-categorize based on merchant and description
   */
  static categorize(merchant, type) {
    if (type === 'credit') {
      const lower = merchant.toLowerCase();
      if (/salary|payroll|infosys|tcs|wipro|google|meta|tech corp/i.test(lower)) return 'Salary';
      if (/refund|cashback/i.test(lower)) return 'Refund / Cashback';
      if (/freelance|consult|client/i.test(lower)) return 'Freelance';
      if (/interest|dividend|mf|groww|zerodha/i.test(lower)) return 'Investments';
      return 'Income';
    }

    const lower = merchant.toLowerCase();
    if (/swiggy|zomato|cafe|coffee|restaurant|dine|food|mcdonald|kfc|starbucks|domino/i.test(lower)) {
      return 'Food & Dining';
    }
    if (/grocer|dmart|blinkit|zepto|bigbasket|nature|supermarket|vegetable/i.test(lower)) {
      return 'Groceries';
    }
    if (/uber|ola|rapido|metro|fuel|petrol|diesel|hp auto|indian oil/i.test(lower)) {
      return 'Transport';
    }
    if (/amazon|flipkart|myntra|ajio|croma|shopping|retail|zara/i.test(lower)) {
      return 'Shopping';
    }
    if (/airtel|jio|vi|broadband|wifi|electricity|tata power|bescom|gas|water|bill/i.test(lower)) {
      return 'Utilities';
    }
    if (/rent|landlord|maintenance|housing/i.test(lower)) {
      return 'Housing';
    }
    if (/pharmacy|apollo|medplus|hospital|clinic|doctor|pharmeasy|health/i.test(lower)) {
      return 'Healthcare';
    }
    if (/netflix|spotify|prime|hotstar|cinema|pvr|inox|movie|game/i.test(lower)) {
      return 'Entertainment';
    }
    if (/sip|mutual fund|zerodha|groww|nippon|hdfc mf|share|stock/i.test(lower)) {
      return 'Investments';
    }
    return 'General';
  }

  /**
   * Extract date from message text or return current ISO date
   */
  static extractDate(text) {
    // Handles: 06-Oct-26, 06-10-2026, 06/10/26, 06-Oct-2026
    const dateMatch = text.match(/(\d{1,2})[-/]([A-Za-z]{3}|\d{1,2})[-/](\d{2,4})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const monthPart = dateMatch[2];
      let year = parseInt(dateMatch[3], 10);
      if (year < 100) year += 2000;

      let month = 0;
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      if (isNaN(parseInt(monthPart, 10))) {
        const foundIdx = monthNames.indexOf(monthPart.toLowerCase().substr(0, 3));
        month = foundIdx !== -1 ? foundIdx : new Date().getMonth();
      } else {
        month = parseInt(monthPart, 10) - 1;
      }

      const d = new Date(year, month, day, new Date().getHours(), new Date().getMinutes());
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }
    return new Date().toISOString();
  }

  /**
   * Parse full SMS string and return transaction candidate
   */
  static parse(smsText) {
    if (!smsText || typeof smsText !== 'string' || !smsText.trim()) {
      return { success: false, error: 'SMS text cannot be empty' };
    }

    const trimmed = smsText.trim();
    const type = this.detectType(trimmed);
    const amount = this.extractAmount(trimmed);
    const merchant = this.extractMerchant(trimmed, type);
    const source = this.extractSource(trimmed);
    const category = this.categorize(merchant, type);
    const date = this.extractDate(trimmed);

    if (amount <= 0) {
      return {
        success: false,
        error: 'Could not detect a valid transaction amount in the message. Please check the text or enter manually.',
        partial: { type, merchant, source, category, date }
      };
    }

    return {
      success: true,
      data: {
        type,
        amount,
        merchant,
        category,
        source,
        date,
        notes: `Auto-parsed from ${source}`,
        rawSms: trimmed
      }
    };
  }
}

window.SMSParser = SMSParser;
window.SMS_SAMPLES = SMS_SAMPLES;
