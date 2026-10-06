/**
 * Notifications System for Expense Tracker
 * Supports both Web Notification API (Native OS notifications)
 * and an In-App Notification Center & Toast banners.
 */

class NotificationManager {
  constructor() {
    this.history = this.loadHistory();
    this.permissionState = ('Notification' in window) ? Notification.permission : 'denied';
  }

  loadHistory() {
    try {
      const stored = localStorage.getItem('expense_tracker_notifications_v1');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveHistory() {
    try {
      localStorage.setItem('expense_tracker_notifications_v1', JSON.stringify(this.history.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to save notification history', e);
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      this.showToast('Browser Notifications not supported on this device. Using in-app alerts.', 'info');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionState = permission;
      if (permission === 'granted') {
        this.showToast('Notifications enabled! You will receive daily & transaction alerts.', 'success');
        this.sendNative('Expense Tracker', 'Notifications enabled successfully! You will receive daily & monthly summaries.');
        return true;
      } else {
        this.showToast('Notification permission was denied. Alerts will show inside the app.', 'warning');
        return false;
      }
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return false;
    }
  }

  hasPermission() {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  send(title, body, type = 'info', icon = null) {
    const record = {
      id: 'notif-' + Date.now(),
      title,
      body,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };

    this.history.unshift(record);
    this.saveHistory();
    window.dispatchEvent(new CustomEvent('expenseTracker:newNotification', { detail: record }));

    // Send native notification if permitted
    this.sendNative(title, body, icon);

    // Also display in-app toast
    this.showToast(`${title}: ${body}`, type);
    return record;
  }

  sendNative(title, body, icon = null) {
    if (this.hasPermission()) {
      try {
        new Notification(title, {
          body,
          icon: icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%236366f1"/><text x="50" y="65" font-size="50" font-weight="bold" fill="white" text-anchor="middle">₹</text></svg>',
          badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%236366f1"/></svg>'
        });
      } catch (e) {
        console.warn('Native notification failed:', e);
      }
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
    } else {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
    }

    toast.innerHTML = `
      <div class="toast-content">
        ${iconSvg}
        <span class="toast-text">${this.escapeHtml(message)}</span>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Send Today's Expense Summary Notification (as specified in prompt)
   */
  sendDailySummaryNotification(todayStats) {
    const { debit, credit, net } = todayStats;
    const formatINR = (val) => '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    const title = "Today's Expense Summary";
    const body = `Debit: ${formatINR(debit)} | Credit: ${formatINR(credit)} | Net: ${formatINR(net)}`;
    return this.send(title, body, 'info');
  }

  /**
   * Send Transaction Detected Notification
   */
  sendTransactionDetectedNotification(tx) {
    const formatINR = (val) => '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    const isCredit = tx.type === 'credit';
    const title = isCredit ? '💰 Credit Detected' : '💸 Debit Detected';
    const body = `${formatINR(tx.amount)} ${isCredit ? 'received from' : 'spent at'} ${tx.merchant} (${tx.source})`;
    return this.send(title, body, isCredit ? 'success' : 'warning');
  }

  /**
   * Send Monthly Financial Summary Notification (matching prompt format)
   */
  sendMonthlySummaryNotification(monthSummary) {
    const formatINR = (val) => '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    const title = `${monthSummary.monthName} ${monthSummary.year} — Monthly Summary`;
    const body = `💸 Total Debit: ${formatINR(monthSummary.totalDebit)}\n💰 Total Credit: ${formatINR(monthSummary.totalCredit)}\n📊 Net Amount: ${formatINR(monthSummary.netAmount)}\n🔴 Debit Txns: ${monthSummary.debitCount} | 🟢 Credit Txns: ${monthSummary.creditCount}`;
    return this.send(title, body, 'info');
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
    window.dispatchEvent(new CustomEvent('expenseTracker:notificationsCleared'));
  }
}

window.NotificationManager = new NotificationManager();
