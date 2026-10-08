/**
 * Storage Module for Expense Tracker
 * 100% Free, Local On-Device Persistence via LocalStorage
 * Full Two-Way Synchronization across Mobile (Phone) & Laptop (PC)
 */

const STORAGE_KEY = 'expense_tracker_transactions_v2';
const SETTINGS_KEY = 'expense_tracker_settings_v2';
const DELETED_IDS_KEY = 'expense_tracker_deleted_ids';
const SYNC_URL_KEY = 'expense_tracker_sync_url';

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
    notes: 'Monthly salary credit',
    updatedAt: new Date().toISOString()
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
    updatedAt: new Date().toISOString()
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
    updatedAt: new Date().toISOString()
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
    updatedAt: new Date().toISOString()
  }
];

class StorageManager {
  constructor() {
    // Purge legacy storage keys
    try {
      localStorage.removeItem('expense_tracker_transactions');
      localStorage.removeItem('expense_tracker_transactions_v1');
    } catch (e) {}

    this.transactions = this.loadFromStorage();
    this.deletedIds = this.loadDeletedIds();
    this.isSyncing = false;
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

          // Strictly purge old pre-seeded dummy IDs
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
    return [];
  }

  saveToStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  loadDeletedIds() {
    try {
      const stored = localStorage.getItem(DELETED_IDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveDeletedIds() {
    try {
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(this.deletedIds));
    } catch (e) {}
  }

  getAll() {
    return [...this.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getById(id) {
    return this.transactions.find((tx) => tx.id === id) || null;
  }

  add(transaction) {
    const nowIso = new Date().toISOString();
    const newTx = {
      id: transaction.id || 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      type: transaction.type === 'credit' ? 'credit' : 'debit',
      amount: Math.abs(parseFloat(transaction.amount) || 0),
      merchant: transaction.merchant ? transaction.merchant.trim() : 'Unknown Transaction',
      category: transaction.category ? transaction.category.trim() : (transaction.type === 'credit' ? 'Income' : 'General'),
      source: transaction.source ? transaction.source.trim() : 'Manual',
      date: transaction.date || nowIso,
      notes: transaction.notes ? transaction.notes.trim() : '',
      updatedAt: transaction.updatedAt || nowIso,
      rawSms: transaction.rawSms || null
    };

    // Remove from deleted list if re-added
    this.deletedIds = this.deletedIds.filter(id => id !== newTx.id);
    this.saveDeletedIds();

    // Prevent duplicate entries
    const exists = this.transactions.some(t => t.id === newTx.id);
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
      type: updatedFields.type !== undefined ? (updatedFields.type === 'credit' ? 'credit' : 'debit') : current.type,
      updatedAt: new Date().toISOString()
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
    if (!this.deletedIds.includes(id)) {
      this.deletedIds.push(id);
      this.saveDeletedIds();
    }
    this.saveToStorage(this.transactions);
    this.dispatchChangeEvent('delete', removed);
    return true;
  }

  clearAll() {
    this.transactions.forEach(t => {
      if (t.id && !this.deletedIds.includes(t.id)) {
        this.deletedIds.push(t.id);
      }
    });
    this.saveDeletedIds();
    this.transactions = [];
    this.saveToStorage([]);
    this.dispatchChangeEvent('clear', null);
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
    const headers = ['ID', 'Type', 'Amount (INR)', 'Merchant/Description', 'Category', 'Source', 'Date & Time', 'Notes'];
    const rows = this.getAll().map((tx) => [
      `"${tx.id}"`,
      `"${tx.type.toUpperCase()}"`,
      tx.amount,
      `"${(tx.merchant || '').replace(/"/g, '""')}"`,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      `"${(tx.source || '').replace(/"/g, '""')}"`,
      `"${tx.date}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`
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
        updatedAt: item.updatedAt || new Date().toISOString(),
        rawSms: item.rawSms || null
      }));

      // Merge without duplicates
      let addedCount = 0;
      const txMap = new Map();
      this.transactions.forEach(t => txMap.set(t.id, t));

      validated.forEach(t => {
        if (!txMap.has(t.id)) {
          txMap.set(t.id, t);
          addedCount++;
        } else {
          // Compare updatedAt
          const existing = txMap.get(t.id);
          if ((t.updatedAt || '') > (existing.updatedAt || '')) {
            txMap.set(t.id, t);
          }
        }
      });

      this.transactions = Array.from(txMap.values());
      this.saveToStorage(this.transactions);
      this.dispatchChangeEvent('import', this.transactions);
      return { success: true, count: validated.length, added: addedCount };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Configurable Sync URL for Mobile / Remote setup
  resolveSyncEndpoint() {
    // For Vercel hosting, we just hit the local /api/sync endpoint
    return '/api/sync';
  }

  dispatchChangeEvent(action, payload) {
    window.dispatchEvent(new CustomEvent('expenseTracker:dataChanged', {
      detail: { action, payload }
    }));
    // Auto-sync silently in the background whenever data is added, edited, or deleted
    this.syncWithServer().catch(() => {});
  }

  /**
   * Two-Way Synchronization with the Server Hub (Laptop / Cloud)
   */
  async syncWithServer() {
    if (this.isSyncing) return null;
    this.isSyncing = true;

    try {
      const syncEndpoint = this.resolveSyncEndpoint();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch(syncEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: this.transactions,
          deletedIds: this.deletedIds
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const result = await resp.json();
        if (result.success && Array.isArray(result.transactions)) {
          // Clear acknowledged deletedIds
          this.deletedIds = [];
          this.saveDeletedIds();

          const serverTxs = result.transactions;
          
          // Check if local transactions changed compared to server
          const localMap = new Map();
          this.transactions.forEach(t => localMap.set(t.id, t));

          let hasDiff = false;
          if (serverTxs.length !== this.transactions.length) {
            hasDiff = true;
          } else {
            for (const sTx of serverTxs) {
              const lTx = localMap.get(sTx.id);
              if (!lTx || lTx.amount !== sTx.amount || lTx.type !== sTx.type || (sTx.updatedAt && sTx.updatedAt !== lTx.updatedAt)) {
                hasDiff = true;
                break;
              }
            }
          }

          if (hasDiff) {
            this.transactions = serverTxs;
            this.saveToStorage(this.transactions);
            window.dispatchEvent(new CustomEvent('expenseTracker:dataChanged', {
              detail: { action: 'remoteSync', payload: this.transactions }
            }));
          }

          window.dispatchEvent(new CustomEvent('expenseTracker:syncStatus', {
            detail: {
              status: 'online',
              total: this.transactions.length,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              syncedCount: result.syncedCount || 0,
              endpoint: syncEndpoint
            }
          }));

          this.isSyncing = false;
          return { success: true, total: this.transactions.length };
        }
      } else {
        throw new Error(`HTTP ${resp.status}`);
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('expenseTracker:syncStatus', {
        detail: { status: 'offline', error: e.message }
      }));
    }

    this.isSyncing = false;
    return null;
  }
}

// Global storage instance
window.ExpenseStorage = new StorageManager();

// Instant auto-sync when switching back to tab or device gets focused
window.addEventListener('focus', () => {
  if (window.ExpenseStorage) window.ExpenseStorage.syncWithServer().catch(() => {});
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.ExpenseStorage) {
    window.ExpenseStorage.syncWithServer().catch(() => {});
  }
});
