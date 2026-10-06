/**
 * Storage Module for Expense Tracker
 * 100% Free, Local On-Device Persistence via LocalStorage
 * Privacy-First: No data is ever transmitted to any remote server.
 */

const STORAGE_KEY = 'expense_tracker_transactions_v1';
const SETTINGS_KEY = 'expense_tracker_settings_v1';

// Seed demo data spanning current month (Oct 2026) & previous month (Sep 2026)
const DEMO_TRANSACTIONS = [
  // September 2026 (matching the user's example in requirements)
  {
    id: 'tx-sep-01',
    type: 'credit',
    amount: 50000,
    merchant: 'Infosys Salary',
    category: 'Salary',
    source: 'HDFC Bank XX4012',
    date: '2026-09-01T10:00:00',
    notes: 'Monthly corporate salary credit',
    rawSms: 'Your A/C XX4012 is credited by Rs 50000.00 on 01-Sep-26 towards Salary by Infosys Ltd.'
  },
  {
    id: 'tx-sep-02',
    type: 'debit',
    amount: 15000,
    merchant: 'Apartment Rent',
    category: 'Housing',
    source: 'HDFC Bank XX4012',
    date: '2026-09-02T11:30:00',
    notes: 'House rent via UPI to Landlord',
    rawSms: 'Rs 15000.00 debited from A/C XX4012 on 02-Sep-26 to VPA landlord@okhdfcbank. Ref 62450192.'
  },
  {
    id: 'tx-sep-03',
    type: 'debit',
    amount: 4500,
    merchant: 'DMart Supermarket',
    category: 'Groceries',
    source: 'ICICI Bank XX8921',
    date: '2026-09-05T18:45:00',
    notes: 'Monthly groceries',
    rawSms: 'ICICI Bank Card XX8921 spent Rs 4500.00 at DMART HYDERABAD on 05-Sep-26. Avl Bal Rs 42,100.'
  },
  {
    id: 'tx-sep-04',
    type: 'debit',
    amount: 2200,
    merchant: 'Tata Power Electricity',
    category: 'Utilities',
    source: 'PhonePe (SBI)',
    date: '2026-09-10T09:15:00',
    notes: 'Electricity bill payment',
    rawSms: 'Paid Rs 2200 to Tata Power on PhonePe using SBI A/c XX3114. UPI Ref: 6253910.'
  },
  {
    id: 'tx-sep-05',
    type: 'debit',
    amount: 850,
    merchant: 'Swiggy Food',
    category: 'Food & Dining',
    source: 'Google Pay',
    date: '2026-09-12T20:10:00',
    notes: 'Dinner order',
    rawSms: 'Rs 850.00 debited from SBI A/C XX3114 to SWIGGY on 12-Sep-26 via UPI.'
  },
  {
    id: 'tx-sep-06',
    type: 'debit',
    amount: 3600,
    merchant: 'Amazon Shopping',
    category: 'Shopping',
    source: 'Axis Bank XX1102',
    date: '2026-09-18T14:20:00',
    notes: 'Electronics accessories',
    rawSms: 'Axis Bank: INR 3,600.00 spent on your card XX1102 at AMAZON INDIA on 18-Sep-26.'
  },
  {
    id: 'tx-sep-07',
    type: 'debit',
    amount: 5000,
    merchant: 'Mutual Fund SIP',
    category: 'Investments',
    source: 'HDFC Bank XX4012',
    date: '2026-09-20T08:00:00',
    notes: 'Nifty 50 Index Fund SIP auto-debit',
    rawSms: 'HDFC Bank: Rs 5000.00 debited from A/C XX4012 towards ACH DEBIT - NIPPON INDIA MF on 20-Sep-26.'
  },
  {
    id: 'tx-sep-08',
    type: 'debit',
    amount: 1350,
    merchant: 'Zomato Dining',
    category: 'Food & Dining',
    source: 'Paytm UPI',
    date: '2026-09-25T21:40:00',
    notes: 'Weekend dinner with friends',
    rawSms: 'Paytm: Money sent Rs 1350 to Zomato from A/c XX8921 on 25-Sep-26.'
  },

  // October 2026 (Current Month)
  {
    id: 'tx-oct-01',
    type: 'credit',
    amount: 52000,
    merchant: 'Infosys Salary',
    category: 'Salary',
    source: 'HDFC Bank XX4012',
    date: '2026-10-01T10:00:00',
    notes: 'October monthly salary credit',
    rawSms: 'Your A/C XX4012 is credited by Rs 52000.00 on 01-Oct-26 towards Salary by Infosys Ltd. Avl Bal: Rs 64,250.00'
  },
  {
    id: 'tx-oct-02',
    type: 'debit',
    amount: 15000,
    merchant: 'Apartment Rent',
    category: 'Housing',
    source: 'HDFC Bank XX4012',
    date: '2026-10-02T11:00:00',
    notes: 'October rent payment',
    rawSms: 'Rs 15000.00 debited from A/C XX4012 on 02-Oct-26 to VPA landlord@okhdfcbank. Ref 6271920.'
  },
  {
    id: 'tx-oct-03',
    type: 'debit',
    amount: 3200,
    merchant: 'Nature Basket Groceries',
    category: 'Groceries',
    source: 'ICICI Bank XX8921',
    date: '2026-10-03T17:30:00',
    notes: 'Vegetables and pantry supplies',
    rawSms: 'ICICI Bank: Rs 3200.00 debited from A/c XX8921 at NATURES BASKET on 03-Oct-26.'
  },
  {
    id: 'tx-oct-04',
    type: 'credit',
    amount: 3500,
    merchant: 'Freelance Project',
    category: 'Freelance',
    source: 'SBI Bank XX3114',
    date: '2026-10-04T15:20:00',
    notes: 'Logo design payment received from client',
    rawSms: 'SBI: Your A/C XX3114 has been credited by Rs 3500.00 via UPI from client@upi on 04-Oct-26.'
  },
  {
    id: 'tx-oct-05',
    type: 'debit',
    amount: 1200,
    merchant: 'Airtel Broadband Bill',
    category: 'Utilities',
    source: 'PhonePe',
    date: '2026-10-05T10:45:00',
    notes: 'Fiber internet bill for October',
    rawSms: 'Paid Rs 1200 to Airtel Broadband on PhonePe using HDFC A/c XX4012. UPI Ref: 6289912.'
  },
  {
    id: 'tx-oct-06',
    type: 'debit',
    amount: 680,
    merchant: 'Uber Ride',
    category: 'Transport',
    source: 'Paytm UPI',
    date: '2026-10-05T19:15:00',
    notes: 'Cab ride to office meeting',
    rawSms: 'Paytm: Rs 680.00 debited from A/c XX8921 to UBER INDIA on 05-Oct-26.'
  },
  // Today's Transactions (06 Oct 2026) - matching prompt's example numbers!
  {
    id: 'tx-oct-07',
    type: 'credit',
    amount: 5000,
    merchant: 'Refund & Cash Credit',
    category: 'Others',
    source: 'HDFC Bank XX4012',
    date: '2026-10-06T08:30:00',
    notes: 'Security deposit refund received',
    rawSms: 'Your A/C XX4012 is credited by Rs 5000.00 on 06-Oct-26 via NEFT from REFUND CORP. Avl Bal: Rs 55,200.00'
  },
  {
    id: 'tx-oct-08',
    type: 'debit',
    amount: 1950,
    merchant: 'Apollo Pharmacy',
    category: 'Healthcare',
    source: 'Google Pay (SBI)',
    date: '2026-10-06T09:05:00',
    notes: 'Medicine refill',
    rawSms: 'Rs 1950.00 debited from SBI A/C XX3114 to APOLLO PHARMACY on 06-Oct-26 via UPI.'
  },
  {
    id: 'tx-oct-09',
    type: 'debit',
    amount: 500,
    merchant: 'Swiggy Cafe',
    category: 'Food & Dining',
    source: 'Axis Bank XX1102',
    date: '2026-10-06T09:25:00',
    notes: 'Morning breakfast & coffee',
    rawSms: 'Axis Bank: INR 500.00 spent on Card XX1102 at SWIGGY BANGALORE on 06-Oct-26.'
  }
];

class StorageManager {
  constructor() {
    this.transactions = this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
    // Initialize with demo data if empty
    this.saveToStorage(DEMO_TRANSACTIONS);
    return [...DEMO_TRANSACTIONS];
  }

  saveToStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  getAll() {
    // Return sorted by date descending (newest first)
    return [...this.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getById(id) {
    return this.transactions.find((tx) => tx.id === id) || null;
  }

  add(transaction) {
    const newTx = {
      id: transaction.id || 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      type: transaction.type === 'credit' ? 'credit' : 'debit',
      amount: Math.abs(parseFloat(transaction.amount) || 0),
      merchant: transaction.merchant ? transaction.merchant.trim() : 'Unknown Transaction',
      category: transaction.category ? transaction.category.trim() : (transaction.type === 'credit' ? 'Income' : 'General'),
      source: transaction.source ? transaction.source.trim() : 'Manual',
      date: transaction.date || new Date().toISOString(),
      notes: transaction.notes ? transaction.notes.trim() : '',
      rawSms: transaction.rawSms || null
    };

    this.transactions.push(newTx);
    this.saveToStorage(this.transactions);
    this.dispatchChangeEvent('add', newTx);
    return newTx;
  }

  update(id, updatedFields) {
    const index = this.transactions.findIndex((tx) => tx.id === id);
    if (index === -1) return null;

    const current = this.transactions[index];
    const updated = {
      ...current,
      ...updatedFields,
      amount: updatedFields.amount !== undefined ? Math.abs(parseFloat(updatedFields.amount) || 0) : current.amount,
      type: updatedFields.type !== undefined ? (updatedFields.type === 'credit' ? 'credit' : 'debit') : current.type
    };

    this.transactions[index] = updated;
    this.saveToStorage(this.transactions);
    this.dispatchChangeEvent('update', updated);
    return updated;
  }

  delete(id) {
    const index = this.transactions.findIndex((tx) => tx.id === id);
    if (index === -1) return false;

    const removed = this.transactions.splice(index, 1)[0];
    this.saveToStorage(this.transactions);
    this.dispatchChangeEvent('delete', removed);
    return true;
  }

  clearAll() {
    this.transactions = [];
    this.saveToStorage([]);
    this.dispatchChangeEvent('clear', null);
  }

  resetToDemo() {
    this.transactions = [...DEMO_TRANSACTIONS];
    this.saveToStorage(this.transactions);
    this.dispatchChangeEvent('reset', this.transactions);
    return this.transactions;
  }

  exportJSON() {
    return JSON.stringify(this.transactions, null, 2);
  }

  exportCSV() {
    const headers = ['ID', 'Type', 'Amount (INR)', 'Merchant/Description', 'Category', 'Source', 'Date & Time', 'Notes', 'Raw SMS'];
    const rows = this.getAll().map((tx) => [
      `"${tx.id}"`,
      `"${tx.type.toUpperCase()}"`,
      tx.amount,
      `"${(tx.merchant || '').replace(/"/g, '""')}"`,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      `"${(tx.source || '').replace(/"/g, '""')}"`,
      `"${tx.date}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
      `"${(tx.rawSms || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) throw new Error('Uploaded JSON is not an array of transactions.');

      const validated = parsed.map((item, idx) => ({
        id: item.id || `tx-imported-${Date.now()}-${idx}`,
        type: item.type === 'credit' ? 'credit' : 'debit',
        amount: Math.abs(parseFloat(item.amount) || 0),
        merchant: item.merchant || 'Imported Entry',
        category: item.category || 'General',
        source: item.source || 'Import',
        date: item.date || new Date().toISOString(),
        notes: item.notes || '',
        rawSms: item.rawSms || null
      }));

      this.transactions = validated;
      this.saveToStorage(this.transactions);
      this.dispatchChangeEvent('import', this.transactions);
      return { success: true, count: validated.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  dispatchChangeEvent(action, payload) {
    window.dispatchEvent(new CustomEvent('expenseTracker:dataChanged', {
      detail: { action, payload }
    }));
    // Auto sync to local server when changes happen
    this.syncWithServer().catch(() => {});
  }

  async syncWithServer() {
    try {
      const syncEndpoint = (window.AndroidBridge && typeof window.AndroidBridge.getSyncServerUrl === 'function')
        ? window.AndroidBridge.getSyncServerUrl()
        : './api/sync';

      const resp = await fetch(syncEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: this.transactions })
      });
      if (resp.ok) {
        const result = await resp.json();
        if (result.success && Array.isArray(result.transactions)) {
          // Check if server returned new transactions (e.g. from Android app)
          if (result.transactions.length !== this.transactions.length) {
            this.transactions = result.transactions;
            this.saveToStorage(this.transactions);
            window.dispatchEvent(new CustomEvent('expenseTracker:dataChanged', {
              detail: { action: 'remoteSync', payload: this.transactions }
            }));
          }
          window.dispatchEvent(new CustomEvent('expenseTracker:syncStatus', {
            detail: { status: 'online', total: result.total, time: new Date().toLocaleTimeString() }
          }));
          return result;
        }
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('expenseTracker:syncStatus', {
        detail: { status: 'offline', error: e.message }
      }));
    }
    return null;
  }
}

// Global storage instance
window.ExpenseStorage = new StorageManager();

// Periodic sync poll every 10 seconds to receive transactions logged by Android app
setInterval(() => {
  if (window.ExpenseStorage) {
    window.ExpenseStorage.syncWithServer().catch(() => {});
  }
}, 10000);
