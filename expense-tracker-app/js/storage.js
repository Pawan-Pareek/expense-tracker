/**
 * Storage Module for Expense Tracker
 * 100% Free, Local On-Device Persistence via LocalStorage
 * Privacy-First: Clean slate, zero pre-loaded dummy data by default.
 */

const STORAGE_KEY = 'expense_tracker_transactions_v2';
const SETTINGS_KEY = 'expense_tracker_settings_v2';

// Optional demo samples (only loaded if user explicitly clicks "Load Demo Data" in settings)
const OPTIONAL_DEMO_SAMPLES = [
  {
    id: 'tx-demo-01',
    type: 'credit',
    amount: 50000,
    merchant: 'Corporate Salary',
    category: 'Salary',
    source: 'HDFC Bank',
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    notes: 'Monthly corporate salary credit',
    rawSms: 'Your A/C XX4012 is credited by Rs 50000.00 towards Salary.'
  },
  {
    id: 'tx-demo-02',
    type: 'debit',
    amount: 15000,
    merchant: 'Apartment Rent',
    category: 'Housing',
    source: 'HDFC Bank',
    date: new Date(Date.now() - 86400000 * 4).toISOString(),
    notes: 'House rent payment via UPI',
    rawSms: 'Rs 15000.00 debited from A/C XX4012 to landlord@okhdfcbank.'
  },
  {
    id: 'tx-demo-03',
    type: 'debit',
    amount: 2450,
    merchant: 'Amazon Shopping',
    category: 'Shopping',
    source: 'Axis Bank',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    notes: 'Household items',
    rawSms: 'INR 2450.00 spent on Card XX1102 at AMAZON INDIA.'
  },
  {
    id: 'tx-demo-04',
    type: 'debit',
    amount: 480,
    merchant: 'Swiggy Food',
    category: 'Food & Dining',
    source: 'Google Pay',
    date: new Date().toISOString(),
    notes: 'Lunch order',
    rawSms: 'Rs 480.00 debited to SWIGGY via UPI.'
  }
];

class StorageManager {
  constructor() {
    // Thoroughly remove legacy storage keys that had seeded dummy data
    try {
      localStorage.removeItem('expense_tracker_transactions');
      localStorage.removeItem('expense_tracker_transactions_v1');
    } catch (e) {}

    this.transactions = this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const DEMO_MERCHANTS = [
            'Corporate Salary', 'Apartment Rent', 'Amazon Shopping', 'Swiggy Food',
            'Swiggy Cafe', 'Apollo Pharmacy', 'Refund & Cash Credit', 'Zomato Order',
            'Uber Ride', 'Flipkart Electronics', 'DMart Supermarket', 'Electricity Bill'
          ];

          // Strictly purge any dummy/demo/sample IDs or demo merchants from earlier runs
          const cleaned = parsed.filter(t => 
            t && t.id && 
            !t.id.startsWith('tx-sep-') && 
            !t.id.startsWith('tx-oct-') && 
            !t.id.startsWith('tx-demo-') && 
            !t.id.startsWith('demo-') &&
            !DEMO_MERCHANTS.includes(t.merchant)
          );
          if (cleaned.length !== parsed.length) {
            this.saveToStorage(cleaned);
          }
          return cleaned;
        }
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
    // Clean slate: start with completely empty transactions ledger
    return [];
  }

  saveToStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  getAll() {
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

    // Prevent duplicate entries
    const exists = this.transactions.some(t => t.id === newTx.id || (t.rawSms && t.rawSms === newTx.rawSms && Math.abs(new Date(t.date) - new Date(newTx.date)) < 60000));
    if (!exists) {
      this.transactions.push(newTx);
      this.saveToStorage(this.transactions);
      this.dispatchChangeEvent('add', newTx);
    }
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
    // Also clear server storage
    fetch('./api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: [] })
    }).catch(() => {});
  }

  loadDemoSamples() {
    this.transactions = [...OPTIONAL_DEMO_SAMPLES];
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
          // If server has more or newer transactions
          if (result.transactions.length !== this.transactions.length) {
            this.transactions = result.transactions;
            this.saveToStorage(this.transactions);
            window.dispatchEvent(new CustomEvent('expenseTracker:dataChanged', {
              detail: { action: 'remoteSync', payload: this.transactions }
            }));
          }
          window.dispatchEvent(new CustomEvent('expenseTracker:syncStatus', {
            detail: { status: 'online', total: result.total || this.transactions.length, time: new Date().toLocaleTimeString() }
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

// Periodic sync poll every 8 seconds
setInterval(() => {
  if (window.ExpenseStorage) {
    window.ExpenseStorage.syncWithServer().catch(() => {});
  }
}, 8000);
