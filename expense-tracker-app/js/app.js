/**
 * Expense Tracker Main Application Logic
 * Coordinates UI, Storage, SMS Parsing, Notifications, and Reports.
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  const state = {
    activeTab: 'dashboard', // 'dashboard' | 'monthly' | 'reports'
    filterType: 'all', // 'all' | 'today' | 'week' | 'month' | 'prev_month' | 'custom'
    customStart: null,
    customEnd: null,
    searchQuery: '',
    selectedCategory: 'all',
    selectedMonth: null, // { year, monthIndex }
    editingTxId: null,
    deleteTxId: null,
    theme: localStorage.getItem('expense_tracker_theme') || 'dark'
  };

  // DOM Elements
  const el = {
    // Theme & Tabs
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    tabBtns: document.querySelectorAll('.nav-tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),

    // Dashboard Overview Metric Cards
    todayDebit: document.getElementById('metric-today-debit'),
    todayCredit: document.getElementById('metric-today-credit'),
    todayNet: document.getElementById('metric-today-net'),
    todayNetBadge: document.getElementById('metric-today-net-badge'),

    monthDebit: document.getElementById('metric-month-debit'),
    monthCredit: document.getElementById('metric-month-credit'),
    monthNet: document.getElementById('metric-month-net'),
    monthNetBadge: document.getElementById('metric-month-net-badge'),

    overallBalance: document.getElementById('metric-overall-balance'),
    overallNetBadge: document.getElementById('metric-overall-net-badge'),
    overallDebitTotal: document.getElementById('metric-overall-debit-total'),
    overallCreditTotal: document.getElementById('metric-overall-credit-total'),

    // Filter controls
    filterBtns: document.querySelectorAll('.filter-btn'),
    customDateGroup: document.getElementById('custom-date-group'),
    customStartDateInput: document.getElementById('custom-start-date'),
    customEndDateInput: document.getElementById('custom-end-date'),
    applyCustomFilterBtn: document.getElementById('apply-custom-filter'),
    searchInput: document.getElementById('search-transactions'),
    categoryFilter: document.getElementById('category-filter'),

    // Daily Transaction Container
    dailyTransactionsList: document.getElementById('daily-transactions-list'),
    emptyStateContainer: document.getElementById('empty-state'),

    // Monthly Summary Tab Elements
    monthSelect: document.getElementById('monthly-picker-select'),
    monthlyTotalDebit: document.getElementById('summary-total-debit'),
    monthlyTotalCredit: document.getElementById('summary-total-credit'),
    monthlyNetAmount: document.getElementById('summary-net-amount'),
    monthlyNetBadge: document.getElementById('summary-net-badge'),
    monthlyDebitCount: document.getElementById('summary-debit-count'),
    monthlyCreditCount: document.getElementById('summary-credit-count'),
    highestDebitCard: document.getElementById('summary-highest-debit'),
    highestCreditCard: document.getElementById('summary-highest-credit'),
    monthlyDailyBreakdown: document.getElementById('monthly-daily-breakdown'),
    copyMonthlySummaryBtn: document.getElementById('copy-monthly-summary-btn'),
    notifyMonthlySummaryBtn: document.getElementById('notify-monthly-summary-btn'),

    // Reports Tab Elements
    reportsMonthlyBar: 'reports-monthly-bar-chart',
    reportsDailyTrend: 'reports-daily-trend-chart',
    reportsRatioDonut: 'reports-ratio-donut-chart',
    reportsCategoryList: document.getElementById('reports-category-list'),

    // Modals & Drawers
    smsModal: document.getElementById('sms-modal'),
    smsOpenBtn: document.getElementById('open-sms-modal-btn'),
    smsCloseBtn: document.getElementById('close-sms-modal-btn'),
    smsTextInput: document.getElementById('sms-text-input'),
    smsParseBtn: document.getElementById('sms-parse-btn'),
    smsPreviewCard: document.getElementById('sms-preview-card'),
    smsApplyBtn: document.getElementById('sms-apply-btn'),
    smsSampleChips: document.getElementById('sms-sample-chips'),

    txModal: document.getElementById('tx-modal'),
    txModalTitle: document.getElementById('tx-modal-title'),
    txOpenBtn: document.getElementById('open-tx-modal-btn'),
    txCloseBtn: document.getElementById('close-tx-modal-btn'),
    txForm: document.getElementById('tx-form'),
    txTypeDebit: document.getElementById('tx-type-debit'),
    txTypeCredit: document.getElementById('tx-type-credit'),
    txAmountInput: document.getElementById('tx-amount'),
    txMerchantInput: document.getElementById('tx-merchant'),
    txDateInput: document.getElementById('tx-datetime'),
    txCategoryInput: document.getElementById('tx-category'),
    txSourceInput: document.getElementById('tx-source'),
    txNotesInput: document.getElementById('tx-notes'),

    deleteModal: document.getElementById('delete-modal'),
    deleteCancelBtn: document.getElementById('delete-cancel-btn'),
    deleteConfirmBtn: document.getElementById('delete-confirm-btn'),

    // Notification Drawer
    notifBtn: document.getElementById('notif-center-btn'),
    notifBadge: document.getElementById('notif-unread-badge'),
    notifDrawer: document.getElementById('notif-drawer'),
    notifDrawerClose: document.getElementById('notif-drawer-close'),
    notifList: document.getElementById('notif-list'),
    notifDailySummaryBtn: document.getElementById('notif-trigger-daily-summary'),
    notifClearBtn: document.getElementById('notif-clear-btn'),
    notifRequestPermBtn: document.getElementById('notif-request-perm-btn'),

    // Settings Modal
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    settingsCloseBtn: document.getElementById('settings-close-btn'),
    exportJsonBtn: document.getElementById('export-json-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    importJsonInput: document.getElementById('import-json-file'),
    resetDemoBtn: document.getElementById('reset-demo-btn'),
    clearAllDataBtn: document.getElementById('clear-all-data-btn')
  };

  let parsedCandidate = null;

  /* ==========================================================================
     1. THEME & INITIALIZATION
     ========================================================================== */

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('expense_tracker_theme', theme);
    if (el.themeToggleBtn) {
      el.themeToggleBtn.innerHTML = theme === 'dark' 
        ? '<svg class="icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/></svg>'
        : '<svg class="icon" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>';
    }
  }

  applyTheme(state.theme);

  if (el.themeToggleBtn) {
    el.themeToggleBtn.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });
  }

  // Register Service Worker for offline PWA functionality
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('Service Worker registration skipped/failed:', err);
      });
    });
  }

  /* ==========================================================================
     2. NAVIGATION TABS
     ========================================================================== */

  el.tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  function switchTab(tabName) {
    state.activeTab = tabName;
    el.tabBtns.forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === tabName));
    el.tabContents.forEach((c) => c.classList.toggle('active', c.id === `tab-${tabName}`));

    if (tabName === 'monthly') {
      populateMonthSelector();
      renderMonthlySummary();
    } else if (tabName === 'reports') {
      renderReports();
    } else {
      renderDashboard();
    }
  }

  /* ==========================================================================
     3. DASHBOARD RENDERING & DUAL COLUMN DISPLAY
     ========================================================================== */

  function renderDashboard() {
    const allTransactions = window.ExpenseStorage.getAll();

    // 1. Calculate & Render Dashboard Stats (Today, Current Month, Overall)
    const stats = window.ReportsEngine.getDashboardStats(allTransactions);

    // Today's Stats
    el.todayDebit.textContent = window.ReportsEngine.formatINR(stats.today.debit);
    el.todayCredit.textContent = window.ReportsEngine.formatINR(stats.today.credit);
    el.todayNet.textContent = window.ReportsEngine.formatINR(stats.today.net);
    el.todayNetBadge.textContent = stats.today.net >= 0 ? 'Surplus' : 'Deficit';
    el.todayNetBadge.className = `metric-badge ${stats.today.net >= 0 ? 'badge-credit' : 'badge-debit'}`;

    // Current Month's Stats
    el.monthDebit.textContent = window.ReportsEngine.formatINR(stats.currentMonth.debit);
    el.monthCredit.textContent = window.ReportsEngine.formatINR(stats.currentMonth.credit);
    el.monthNet.textContent = window.ReportsEngine.formatINR(stats.currentMonth.net);
    el.monthNetBadge.textContent = stats.currentMonth.net >= 0 ? 'Net Positive' : 'Net Negative';
    el.monthNetBadge.className = `metric-badge ${stats.currentMonth.net >= 0 ? 'badge-credit' : 'badge-debit'}`;

    // Overall Balance Stats
    el.overallBalance.textContent = window.ReportsEngine.formatINR(stats.overall.net);
    el.overallDebitTotal.textContent = window.ReportsEngine.formatINR(stats.overall.debit);
    el.overallCreditTotal.textContent = window.ReportsEngine.formatINR(stats.overall.credit);
    el.overallNetBadge.textContent = stats.overall.net >= 0 ? 'Net Savings' : 'Net Negative';
    el.overallNetBadge.className = `metric-badge ${stats.overall.net >= 0 ? 'badge-credit' : 'badge-debit'}`;

    // 2. Filter Transactions for the Daily List
    let filtered = window.ReportsEngine.filterTransactions(
      allTransactions,
      state.filterType,
      state.customStart,
      state.customEnd
    );

    // Apply Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        (tx.merchant && tx.merchant.toLowerCase().includes(q)) ||
        (tx.source && tx.source.toLowerCase().includes(q)) ||
        (tx.category && tx.category.toLowerCase().includes(q)) ||
        (tx.notes && tx.notes.toLowerCase().includes(q)) ||
        tx.amount.toString().includes(q)
      );
    }

    // Apply Category Filter
    if (state.selectedCategory !== 'all') {
      filtered = filtered.filter(tx => tx.category === state.selectedCategory);
    }

    // 3. Render Daily Groupings with strict Dual Column (Debit & Credit)
    renderDailyGroupings(filtered);
  }

  function renderDailyGroupings(transactions) {
    if (!transactions || transactions.length === 0) {
      el.dailyTransactionsList.innerHTML = '';
      el.emptyStateContainer.style.display = 'block';
      return;
    }

    el.emptyStateContainer.style.display = 'none';
    const dayGroups = window.ReportsEngine.groupTransactionsByDay(transactions);

    let html = '';

    dayGroups.forEach((day) => {
      const netIsPositive = day.netAmount >= 0;
      const netClass = netIsPositive ? 'credit-text' : 'debit-text';
      const netSign = day.netAmount > 0 ? '+' : '';

      html += `
        <div class="day-group-card">
          <!-- Day Header -->
          <div class="day-group-header">
            <div class="day-title-wrap">
              <svg class="calendar-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
              </svg>
              <h3 class="day-heading">${day.heading}</h3>
            </div>
            <div class="day-quick-summary">
              <span class="day-quick-stat debit">Dr: ${window.ReportsEngine.formatINR(day.totalDebit)}</span>
              <span class="day-quick-stat credit">Cr: ${window.ReportsEngine.formatINR(day.totalCredit)}</span>
            </div>
          </div>

          <!-- Dual Column Layout: Left Column = Debit, Right Column = Credit -->
          <div class="dual-column-container">
            <!-- DEBIT COLUMN (Money Spent / Deducted) -->
            <div class="column-section column-debit">
              <div class="column-header column-header-debit">
                <span class="column-title">
                  <span class="type-indicator-dot debit"></span>
                  Debit — Money Spent (${day.debitTransactions.length})
                </span>
                <span class="column-subtotal debit">${window.ReportsEngine.formatINR(day.totalDebit)}</span>
              </div>
              <div class="transaction-items-list">
                ${day.debitTransactions.length === 0 
                  ? '<div class="no-tx-placeholder">No debit transactions today</div>'
                  : day.debitTransactions.map(tx => renderTransactionCard(tx)).join('')}
              </div>
            </div>

            <!-- CREDIT COLUMN (Money Received / Added) -->
            <div class="column-section column-credit">
              <div class="column-header column-header-credit">
                <span class="column-title">
                  <span class="type-indicator-dot credit"></span>
                  Credit — Money Received (${day.creditTransactions.length})
                </span>
                <span class="column-subtotal credit">${window.ReportsEngine.formatINR(day.totalCredit)}</span>
              </div>
              <div class="transaction-items-list">
                ${day.creditTransactions.length === 0 
                  ? '<div class="no-tx-placeholder">No credit transactions today</div>'
                  : day.creditTransactions.map(tx => renderTransactionCard(tx)).join('')}
              </div>
            </div>
          </div>

          <!-- Daily Totals (Strict requirement: Appears at the bottom of each day's transaction list) -->
          <div class="day-totals-footer">
            <div class="day-formula-label">
              <span class="formula-text">Daily Totals • Net = Total Credit − Total Debit</span>
            </div>
            <div class="day-totals-grid">
              <div class="day-total-box debit-box">
                <span class="box-label">Total Debit</span>
                <span class="box-value debit-text">${window.ReportsEngine.formatINR(day.totalDebit)}</span>
              </div>
              <div class="day-total-box credit-box">
                <span class="box-label">Total Credit</span>
                <span class="box-value credit-text">${window.ReportsEngine.formatINR(day.totalCredit)}</span>
              </div>
              <div class="day-total-box net-box ${netIsPositive ? 'net-positive' : 'net-negative'}">
                <span class="box-label">Net Amount</span>
                <span class="box-value ${netClass}">${netSign}${window.ReportsEngine.formatINR(day.netAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    el.dailyTransactionsList.innerHTML = html;
    attachTransactionItemHandlers();
  }

  function renderTransactionCard(tx) {
    const isCredit = tx.type === 'credit';
    const typeLabel = isCredit ? 'Credit' : 'Debit';
    const typeClass = isCredit ? 'badge-credit' : 'badge-debit';
    const amountSign = isCredit ? '+' : '-';
    const formattedDate = window.ReportsEngine.formatDateTime(tx.date);

    return `
      <div class="tx-item-card ${isCredit ? 'tx-card-credit' : 'tx-card-debit'}" data-id="${tx.id}">
        <div class="tx-card-main">
          <div class="tx-card-info">
            <div class="tx-merchant-row">
              <span class="tx-merchant-name" title="${escapeHtml(tx.merchant)}">${escapeHtml(tx.merchant)}</span>
              <span class="tx-type-badge ${typeClass}">${typeLabel}</span>
            </div>
            <div class="tx-meta-row">
              <span class="tx-source-tag" title="Source of transaction">
                <svg class="tiny-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
                ${escapeHtml(tx.source || 'Direct')}
              </span>
              <span class="tx-category-tag">${escapeHtml(tx.category || 'General')}</span>
            </div>
            <div class="tx-date-row">
              <svg class="tiny-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
              <span>${formattedDate}</span>
              ${tx.notes ? `<span class="tx-notes-preview">• ${escapeHtml(tx.notes)}</span>` : ''}
            </div>
          </div>
          <div class="tx-amount-section">
            <span class="tx-amount-val ${isCredit ? 'credit-text' : 'debit-text'}">
              ${amountSign}${window.ReportsEngine.formatINR(tx.amount)}
            </span>
            <div class="tx-action-buttons">
              <button class="btn-icon edit-tx-btn" data-id="${tx.id}" title="Edit Transaction" aria-label="Edit">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
              </button>
              <button class="btn-icon delete-tx-btn" data-id="${tx.id}" title="Delete Transaction" aria-label="Delete">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function attachTransactionItemHandlers() {
    document.querySelectorAll('.edit-tx-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openEditTxModal(id);
      });
    });

    document.querySelectorAll('.delete-tx-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openDeleteModal(id);
      });
    });
  }

  /* ==========================================================================
     4. FILTERS & SEARCH
     ========================================================================== */

  el.filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      el.filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      state.filterType = filter;

      if (filter === 'custom') {
        el.customDateGroup.style.display = 'flex';
      } else {
        el.customDateGroup.style.display = 'none';
        state.customStart = null;
        state.customEnd = null;
        renderDashboard();
      }
    });
  });

  if (el.applyCustomFilterBtn) {
    el.applyCustomFilterBtn.addEventListener('click', () => {
      state.customStart = el.customStartDateInput.value;
      state.customEnd = el.customEndDateInput.value;
      if (!state.customStart) {
        window.NotificationManager.showToast('Please select a start date', 'warning');
        return;
      }
      renderDashboard();
    });
  }

  if (el.searchInput) {
    el.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderDashboard();
    });
  }

  if (el.categoryFilter) {
    el.categoryFilter.addEventListener('change', (e) => {
      state.selectedCategory = e.target.value;
      renderDashboard();
    });
  }

  /* ==========================================================================
     5. MONTHLY SUMMARY & HISTORY TAB
     ========================================================================== */

  function populateMonthSelector() {
    const all = window.ExpenseStorage.getAll();
    const months = window.ReportsEngine.getAvailableMonths(all);

    el.monthSelect.innerHTML = months.map(m => `
      <option value="${m.year}-${m.monthIndex}">${m.label}</option>
    `).join('');

    if (!state.selectedMonth && months.length > 0) {
      state.selectedMonth = { year: months[0].year, monthIndex: months[0].monthIndex };
    }

    if (state.selectedMonth) {
      el.monthSelect.value = `${state.selectedMonth.year}-${state.selectedMonth.monthIndex}`;
    }
  }

  el.monthSelect.addEventListener('change', (e) => {
    const [y, m] = e.target.value.split('-').map(Number);
    state.selectedMonth = { year: y, monthIndex: m };
    renderMonthlySummary();
  });

  function renderMonthlySummary() {
    if (!state.selectedMonth) return;

    const all = window.ExpenseStorage.getAll();
    const summary = window.ReportsEngine.getMonthlySummary(
      all,
      state.selectedMonth.year,
      state.selectedMonth.monthIndex
    );

    // Populate Metrics
    el.monthlyTotalDebit.textContent = window.ReportsEngine.formatINR(summary.totalDebit);
    el.monthlyTotalCredit.textContent = window.ReportsEngine.formatINR(summary.totalCredit);
    
    const isNetPositive = summary.netAmount >= 0;
    const netSign = summary.netAmount > 0 ? '+' : '';
    el.monthlyNetAmount.textContent = `${netSign}${window.ReportsEngine.formatINR(summary.netAmount)}`;
    el.monthlyNetBadge.textContent = isNetPositive ? 'Net Surplus' : 'Net Deficit';
    el.monthlyNetBadge.className = `metric-badge ${isNetPositive ? 'badge-credit' : 'badge-debit'}`;

    el.monthlyDebitCount.textContent = `${summary.debitCount} transactions`;
    el.monthlyCreditCount.textContent = `${summary.creditCount} transactions`;

    // Highest Debit Card
    if (summary.highestDebit) {
      el.highestDebitCard.innerHTML = `
        <div class="highest-tx-box debit-border">
          <div class="highest-tx-header">
            <span class="highest-label">Highest Debit</span>
            <span class="highest-amt debit-text">-${window.ReportsEngine.formatINR(summary.highestDebit.amount)}</span>
          </div>
          <div class="highest-tx-details">
            <span class="highest-merchant">${escapeHtml(summary.highestDebit.merchant)}</span>
            <span class="highest-meta">${escapeHtml(summary.highestDebit.source)} • ${window.ReportsEngine.formatDateTime(summary.highestDebit.date)}</span>
          </div>
        </div>
      `;
    } else {
      el.highestDebitCard.innerHTML = '<div class="no-tx-placeholder">No debit transactions this month</div>';
    }

    // Highest Credit Card
    if (summary.highestCredit) {
      el.highestCreditCard.innerHTML = `
        <div class="highest-tx-box credit-border">
          <div class="highest-tx-header">
            <span class="highest-label">Highest Credit</span>
            <span class="highest-amt credit-text">+${window.ReportsEngine.formatINR(summary.highestCredit.amount)}</span>
          </div>
          <div class="highest-tx-details">
            <span class="highest-merchant">${escapeHtml(summary.highestCredit.merchant)}</span>
            <span class="highest-meta">${escapeHtml(summary.highestCredit.source)} • ${window.ReportsEngine.formatDateTime(summary.highestCredit.date)}</span>
          </div>
        </div>
      `;
    } else {
      el.highestCreditCard.innerHTML = '<div class="no-tx-placeholder">No credit transactions this month</div>';
    }

    // Daily breakdown for this month
    if (summary.dailyBreakdown.length === 0) {
      el.monthlyDailyBreakdown.innerHTML = '<div class="no-tx-placeholder">No transactions found for this month</div>';
    } else {
      let breakdownHtml = `
        <div class="monthly-breakdown-table">
          <div class="table-header-row">
            <div class="th-date">Day</div>
            <div class="th-debit">Total Debit</div>
            <div class="th-credit">Total Credit</div>
            <div class="th-net">Net (Cr − Dr)</div>
            <div class="th-count">Txns</div>
          </div>
          <div class="table-body">
            ${summary.dailyBreakdown.map((d) => {
              const sign = d.netAmount > 0 ? '+' : '';
              const netCls = d.netAmount >= 0 ? 'credit-text' : 'debit-text';
              return `
                <div class="table-row">
                  <div class="td-date">${d.heading}</div>
                  <div class="td-debit debit-text">${window.ReportsEngine.formatINR(d.totalDebit)}</div>
                  <div class="td-credit credit-text">${window.ReportsEngine.formatINR(d.totalCredit)}</div>
                  <div class="td-net ${netCls}">${sign}${window.ReportsEngine.formatINR(d.netAmount)}</div>
                  <div class="td-count">${d.allTransactions.length}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      el.monthlyDailyBreakdown.innerHTML = breakdownHtml;
    }
  }

  // Copy Monthly Summary Text (as per prompt specification format)
  if (el.copyMonthlySummaryBtn) {
    el.copyMonthlySummaryBtn.addEventListener('click', () => {
      const all = window.ExpenseStorage.getAll();
      const summary = window.ReportsEngine.getMonthlySummary(
        all,
        state.selectedMonth.year,
        state.selectedMonth.monthIndex
      );

      const formatINR = (v) => '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
      const textToCopy = [
        `${summary.monthName} ${summary.year} — Monthly Summary`,
        `💸 Total Debit: ${formatINR(summary.totalDebit)}`,
        `💰 Total Credit: ${formatINR(summary.totalCredit)}`,
        `📊 Net Amount: ${formatINR(summary.netAmount)}`,
        `🔴 Debit Transactions: ${summary.debitCount}`,
        `🟢 Credit Transactions: ${summary.creditCount}`
      ].join('\n');

      navigator.clipboard.writeText(textToCopy).then(() => {
        window.NotificationManager.showToast('Monthly Summary copied to clipboard!', 'success');
      }).catch(() => {
        window.NotificationManager.showToast('Summary generated!', 'info');
      });
    });
  }

  // Trigger Monthly Summary Notification
  if (el.notifyMonthlySummaryBtn) {
    el.notifyMonthlySummaryBtn.addEventListener('click', () => {
      const all = window.ExpenseStorage.getAll();
      const summary = window.ReportsEngine.getMonthlySummary(
        all,
        state.selectedMonth.year,
        state.selectedMonth.monthIndex
      );
      window.NotificationManager.sendMonthlySummaryNotification(summary);
      updateNotifBadge();
    });
  }

  /* ==========================================================================
     6. REPORTS & CHARTS TAB
     ========================================================================== */

  function renderReports() {
    const all = window.ExpenseStorage.getAll();
    const months = window.ReportsEngine.getAvailableMonths(all);

    // 1. Gather monthly data for Bar Chart
    const monthlySummaries = months.map((m) => {
      const sum = window.ReportsEngine.getMonthlySummary(all, m.year, m.monthIndex);
      return {
        label: m.label,
        totalDebit: sum.totalDebit,
        totalCredit: sum.totalCredit
      };
    });
    window.ChartsEngine.renderMonthlyBarChart(el.reportsMonthlyBar, monthlySummaries);

    // 2. Gather daily groups for Daily Trend Area Chart
    const dailyGroups = window.ReportsEngine.groupTransactionsByDay(all);
    window.ChartsEngine.renderDailyTrendChart(el.reportsDailyTrend, dailyGroups);

    // 3. Ratio Donut Chart (Debit vs Credit)
    let totalDebit = 0;
    let totalCredit = 0;
    let debitCount = 0;
    let creditCount = 0;
    const categoryTotals = {};

    all.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'debit') {
        totalDebit += amt;
        debitCount++;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amt;
      } else {
        totalCredit += amt;
        creditCount++;
      }
    });

    window.ChartsEngine.renderRatioDonutChart(
      el.reportsRatioDonut,
      totalDebit,
      totalCredit,
      debitCount,
      creditCount
    );

    // 4. Category Spending Breakdown
    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    if (sortedCats.length === 0) {
      el.reportsCategoryList.innerHTML = '<div class="no-tx-placeholder">No categorized spending yet</div>';
    } else {
      el.reportsCategoryList.innerHTML = sortedCats.map(([cat, amt]) => {
        const pct = totalDebit > 0 ? Math.round((amt / totalDebit) * 100) : 0;
        return `
          <div class="category-breakdown-row">
            <div class="cat-info">
              <span class="cat-name">${escapeHtml(cat)}</span>
              <span class="cat-amount debit-text">${window.ReportsEngine.formatINR(amt)} (${pct}%)</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  /* ==========================================================================
     7. AUTOMATIC SMS PARSER & DETECTION MODAL
     ========================================================================== */

  // Populate SMS Sample Chips
  if (el.smsSampleChips && window.SMS_SAMPLES) {
    el.smsSampleChips.innerHTML = window.SMS_SAMPLES.map((s, idx) => `
      <button class="sample-chip" data-idx="${idx}">${escapeHtml(s.name)}</button>
    `).join('');

    el.smsSampleChips.querySelectorAll('.sample-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const idx = parseInt(chip.getAttribute('data-idx'), 10);
        const sample = window.SMS_SAMPLES[idx];
        if (sample) {
          el.smsTextInput.value = sample.text;
          triggerSMSParsing();
        }
      });
    });
  }

  if (el.smsOpenBtn) {
    el.smsOpenBtn.addEventListener('click', () => {
      el.smsModal.classList.add('active');
      el.smsTextInput.focus();
    });
  }

  if (el.smsCloseBtn) {
    el.smsCloseBtn.addEventListener('click', () => {
      el.smsModal.classList.remove('active');
      resetSMSModal();
    });
  }

  if (el.smsParseBtn) {
    el.smsParseBtn.addEventListener('click', () => {
      triggerSMSParsing();
    });
  }

  function triggerSMSParsing() {
    const text = el.smsTextInput.value.trim();
    if (!text) {
      window.NotificationManager.showToast('Please enter or select an SMS message to parse.', 'warning');
      return;
    }

    const result = window.SMSParser.parse(text);
    if (!result.success) {
      window.NotificationManager.showToast(result.error, 'warning');
      el.smsPreviewCard.style.display = 'none';
      el.smsApplyBtn.disabled = true;
      parsedCandidate = null;
      return;
    }

    parsedCandidate = result.data;
    const isCredit = parsedCandidate.type === 'credit';

    el.smsPreviewCard.style.display = 'block';
    el.smsPreviewCard.className = `sms-parsed-card ${isCredit ? 'parsed-credit' : 'parsed-debit'}`;
    el.smsPreviewCard.innerHTML = `
      <div class="parsed-card-header">
        <span class="parsed-type-badge ${isCredit ? 'badge-credit' : 'badge-debit'}">
          ${isCredit ? '🟢 Credit Detected (Money In)' : '🔴 Debit Detected (Money Out)'}
        </span>
        <span class="parsed-amount ${isCredit ? 'credit-text' : 'debit-text'}">
          ${isCredit ? '+' : '-'}${window.ReportsEngine.formatINR(parsedCandidate.amount)}
        </span>
      </div>
      <div class="parsed-grid">
        <div class="parsed-item">
          <span class="item-label">Merchant / Recipient</span>
          <span class="item-val">${escapeHtml(parsedCandidate.merchant)}</span>
        </div>
        <div class="parsed-item">
          <span class="item-label">Source / Bank</span>
          <span class="item-val">${escapeHtml(parsedCandidate.source)}</span>
        </div>
        <div class="parsed-item">
          <span class="item-label">Category</span>
          <span class="item-val">${escapeHtml(parsedCandidate.category)}</span>
        </div>
        <div class="parsed-item">
          <span class="item-label">Detected Date</span>
          <span class="item-val">${window.ReportsEngine.formatDateTime(parsedCandidate.date)}</span>
        </div>
      </div>
      <div class="parsed-notice">
        <svg class="tiny-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
        <span>This will automatically be added to your <strong>${isCredit ? 'Credit' : 'Debit'}</strong> column!</span>
      </div>
    `;

    el.smsApplyBtn.disabled = false;
  }

  if (el.smsApplyBtn) {
    el.smsApplyBtn.addEventListener('click', () => {
      if (!parsedCandidate) return;

      const newTx = window.ExpenseStorage.add(parsedCandidate);
      window.NotificationManager.sendTransactionDetectedNotification(newTx);
      window.NotificationManager.showToast(`Transaction added to ${newTx.type === 'credit' ? 'Credit' : 'Debit'} column!`, 'success');

      el.smsModal.classList.remove('active');
      resetSMSModal();
      updateNotifBadge();
    });
  }

  function resetSMSModal() {
    el.smsTextInput.value = '';
    el.smsPreviewCard.style.display = 'none';
    el.smsApplyBtn.disabled = true;
    parsedCandidate = null;
  }

  /* ==========================================================================
     8. MANUAL ADD & EDIT MODAL (FULL CRUD)
     ========================================================================== */

  let modalSelectedType = 'debit';

  function setModalTxType(type) {
    modalSelectedType = type;
    el.txTypeDebit.classList.toggle('active', type === 'debit');
    el.txTypeCredit.classList.toggle('active', type === 'credit');
  }

  el.txTypeDebit.addEventListener('click', () => setModalTxType('debit'));
  el.txTypeCredit.addEventListener('click', () => setModalTxType('credit'));

  if (el.txOpenBtn) {
    el.txOpenBtn.addEventListener('click', () => {
      openAddTxModal();
    });
  }

  if (el.txCloseBtn) {
    el.txCloseBtn.addEventListener('click', () => {
      el.txModal.classList.remove('active');
    });
  }

  function openAddTxModal() {
    state.editingTxId = null;
    el.txModalTitle.textContent = 'Add Transaction Manually';
    setModalTxType('debit');
    el.txAmountInput.value = '';
    el.txMerchantInput.value = '';
    el.txCategoryInput.value = 'General';
    el.txSourceInput.value = 'HDFC Bank';
    el.txNotesInput.value = '';

    // Set default datetime to now in local format YYYY-MM-DDTHH:mm
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    el.txDateInput.value = localIso;

    el.txModal.classList.add('active');
    el.txAmountInput.focus();
  }

  function openEditTxModal(id) {
    const tx = window.ExpenseStorage.getById(id);
    if (!tx) return;

    state.editingTxId = id;
    el.txModalTitle.textContent = 'Edit Transaction';
    setModalTxType(tx.type);
    el.txAmountInput.value = tx.amount;
    el.txMerchantInput.value = tx.merchant;
    el.txCategoryInput.value = tx.category || 'General';
    el.txSourceInput.value = tx.source || 'Manual';
    el.txNotesInput.value = tx.notes || '';

    const d = new Date(tx.date);
    const localIso = !isNaN(d.getTime()) 
      ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16);
    el.txDateInput.value = localIso;

    el.txModal.classList.add('active');
    el.txAmountInput.focus();
  }

  if (el.txForm) {
    el.txForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const amount = parseFloat(el.txAmountInput.value);
      if (isNaN(amount) || amount <= 0) {
        window.NotificationManager.showToast('Please enter a valid amount greater than 0', 'warning');
        return;
      }

      const merchant = el.txMerchantInput.value.trim() || 'Manual Transaction';
      const category = el.txCategoryInput.value || 'General';
      const source = el.txSourceInput.value || 'Manual';
      const notes = el.txNotesInput.value.trim();
      const dateVal = el.txDateInput.value ? new Date(el.txDateInput.value).toISOString() : new Date().toISOString();

      if (state.editingTxId) {
        // Update existing transaction
        const updated = window.ExpenseStorage.update(state.editingTxId, {
          type: modalSelectedType,
          amount,
          merchant,
          category,
          source,
          date: dateVal,
          notes
        });
        window.NotificationManager.showToast('Transaction updated successfully!', 'success');
      } else {
        // Add new transaction
        const newTx = window.ExpenseStorage.add({
          type: modalSelectedType,
          amount,
          merchant,
          category,
          source,
          date: dateVal,
          notes
        });
        window.NotificationManager.showToast(`New ${modalSelectedType.toUpperCase()} of ${window.ReportsEngine.formatINR(amount)} added!`, 'success');
      }

      el.txModal.classList.remove('active');
    });
  }

  /* ==========================================================================
     9. DELETE CONFIRMATION MODAL
     ========================================================================== */

  function openDeleteModal(id) {
    state.deleteTxId = id;
    el.deleteModal.classList.add('active');
  }

  if (el.deleteCancelBtn) {
    el.deleteCancelBtn.addEventListener('click', () => {
      state.deleteTxId = null;
      el.deleteModal.classList.remove('active');
    });
  }

  if (el.deleteConfirmBtn) {
    el.deleteConfirmBtn.addEventListener('click', () => {
      if (state.deleteTxId) {
        window.ExpenseStorage.delete(state.deleteTxId);
        window.NotificationManager.showToast('Transaction deleted.', 'info');
      }
      state.deleteTxId = null;
      el.deleteModal.classList.remove('active');
    });
  }

  /* ==========================================================================
     10. NOTIFICATION CENTER & DAILY REMINDER SIMULATOR
     ========================================================================== */

  function updateNotifBadge() {
    const history = window.NotificationManager.history || [];
    const count = history.length;
    if (count > 0) {
      el.notifBadge.textContent = count > 9 ? '9+' : count;
      el.notifBadge.style.display = 'inline-flex';
    } else {
      el.notifBadge.style.display = 'none';
    }
  }

  function renderNotifDrawer() {
    const history = window.NotificationManager.history || [];
    if (history.length === 0) {
      el.notifList.innerHTML = '<div class="no-tx-placeholder">No notification alerts yet</div>';
      return;
    }

    el.notifList.innerHTML = history.map((n) => `
      <div class="notif-item-card notif-${n.type}">
        <div class="notif-title-row">
          <strong class="notif-item-title">${escapeHtml(n.title)}</strong>
          <span class="notif-item-time">${window.ReportsEngine.formatDateTime(n.timestamp)}</span>
        </div>
        <p class="notif-item-body">${escapeHtml(n.body)}</p>
      </div>
    `).join('');
  }

  if (el.notifBtn) {
    el.notifBtn.addEventListener('click', () => {
      renderNotifDrawer();
      el.notifDrawer.classList.add('active');
    });
  }

  if (el.notifDrawerClose) {
    el.notifDrawerClose.addEventListener('click', () => {
      el.notifDrawer.classList.remove('active');
    });
  }

  if (el.notifRequestPermBtn) {
    el.notifRequestPermBtn.addEventListener('click', async () => {
      await window.NotificationManager.requestPermission();
    });
  }

  if (el.notifDailySummaryBtn) {
    el.notifDailySummaryBtn.addEventListener('click', () => {
      const all = window.ExpenseStorage.getAll();
      const stats = window.ReportsEngine.getDashboardStats(all);
      window.NotificationManager.sendDailySummaryNotification(stats.today);
      updateNotifBadge();
      renderNotifDrawer();
    });
  }

  if (el.notifClearBtn) {
    el.notifClearBtn.addEventListener('click', () => {
      window.NotificationManager.clearHistory();
      renderNotifDrawer();
      updateNotifBadge();
    });
  }

  /* ==========================================================================
     11. SETTINGS, PRIVACY & EXPORT / IMPORT
     ========================================================================== */

  if (el.settingsBtn) {
    el.settingsBtn.addEventListener('click', () => {
      el.settingsModal.classList.add('active');
    });
  }

  if (el.settingsCloseBtn) {
    el.settingsCloseBtn.addEventListener('click', () => {
      el.settingsModal.classList.remove('active');
    });
  }

  if (el.exportJsonBtn) {
    el.exportJsonBtn.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(window.ExpenseStorage.exportJSON());
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `expense_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.NotificationManager.showToast('JSON backup exported successfully!', 'success');
    });
  }

  if (el.exportCsvBtn) {
    el.exportCsvBtn.addEventListener('click', () => {
      const csvStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(window.ExpenseStorage.exportCSV());
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', csvStr);
      downloadAnchor.setAttribute('download', `expense_tracker_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.NotificationManager.showToast('CSV file exported successfully!', 'success');
    });
  }

  if (el.importJsonInput) {
    el.importJsonInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = window.ExpenseStorage.importJSON(event.target.result);
        if (result.success) {
          window.NotificationManager.showToast(`Successfully imported ${result.count} transactions!`, 'success');
          el.settingsModal.classList.remove('active');
        } else {
          window.NotificationManager.showToast(`Import failed: ${result.error}`, 'warning');
        }
      };
      reader.readAsText(file);
    });
  }

  if (el.resetDemoBtn) {
    el.resetDemoBtn.addEventListener('click', () => {
      if (confirm('Reset to realistic demo transactions (including Sep & Oct 2026 data)?')) {
        window.ExpenseStorage.resetToDemo();
        window.NotificationManager.showToast('Reset to demo dataset successfully!', 'success');
        el.settingsModal.classList.remove('active');
      }
    });
  }

  if (el.clearAllDataBtn) {
    el.clearAllDataBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete ALL transaction data? This cannot be undone.')) {
        window.ExpenseStorage.clearAll();
        window.NotificationManager.showToast('All transaction records deleted.', 'info');
        el.settingsModal.classList.remove('active');
      }
    });
  }

  /* ==========================================================================
     12. GLOBAL RE-CALCULATION & EVENT LISTENERS
     ========================================================================== */

  // Whenever data changes (add, update, delete, reset, import), instantly recalculate!
  window.addEventListener('expenseTracker:dataChanged', () => {
    if (state.activeTab === 'monthly') {
      populateMonthSelector();
      renderMonthlySummary();
    } else if (state.activeTab === 'reports') {
      renderReports();
    }
    // Always keep dashboard data fresh
    renderDashboard();
  });

  window.addEventListener('expenseTracker:newNotification', () => {
    updateNotifBadge();
  });

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Sync Modal Handlers
  const syncBtn = document.getElementById('sync-hub-btn');
  const syncModal = document.getElementById('sync-modal');
  const syncCloseBtn = document.getElementById('sync-close-btn');
  const copySyncUrlBtn = document.getElementById('copy-sync-url-btn');
  const manualSyncBtn = document.getElementById('manual-sync-btn');
  const syncUrlInput = document.getElementById('sync-url-input');

  // Fetch actual server info on load to ensure IP is current
  fetch('./api/info').then(res => res.json()).then(data => {
    if (data && data.syncUrl && syncUrlInput) {
      syncUrlInput.value = data.syncUrl;
    }
  }).catch(() => {});

  if (syncBtn && syncModal) {
    syncBtn.addEventListener('click', () => {
      syncModal.classList.add('active');
    });
  }

  if (syncCloseBtn && syncModal) {
    syncCloseBtn.addEventListener('click', () => {
      syncModal.classList.remove('active');
    });
  }

  if (copySyncUrlBtn && syncUrlInput) {
    copySyncUrlBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(syncUrlInput.value).then(() => {
        window.NotificationManager.showToast('Phone connection URL copied to clipboard!', 'success');
      });
    });
  }

  if (manualSyncBtn) {
    manualSyncBtn.addEventListener('click', async () => {
      manualSyncBtn.disabled = true;
      manualSyncBtn.textContent = 'Syncing...';
      const res = await window.ExpenseStorage.syncWithServer();
      manualSyncBtn.disabled = false;
      manualSyncBtn.textContent = 'Force Sync Now';
      if (res && res.success) {
        window.NotificationManager.showToast(`Sync successful! Total ${res.total} transactions synchronized.`, 'success');
      } else {
        window.NotificationManager.showToast('Sync hub reached.', 'info');
      }
    });
  }

  window.addEventListener('expenseTracker:syncStatus', (e) => {
    const statusText = document.getElementById('sync-hub-status-text');
    const statusBadge = document.getElementById('sync-status-badge');
    if (e.detail.status === 'online') {
      if (statusText) statusText.textContent = `Connected to local hub • Last synced at ${e.detail.time}`;
      if (statusBadge) {
        statusBadge.textContent = 'Online';
        statusBadge.className = 'metric-badge badge-credit';
      }
      if (syncBtn) syncBtn.style.color = 'var(--credit-primary)';
    } else {
      if (statusText) statusText.textContent = 'Local hub offline • Operating in standalone mode';
      if (statusBadge) {
        statusBadge.textContent = 'Offline';
        statusBadge.className = 'metric-badge badge-debit';
      }
      if (syncBtn) syncBtn.style.color = 'var(--text-muted)';
    }
  });

  // Initial render
  renderDashboard();
  updateNotifBadge();
  window.ExpenseStorage.syncWithServer().catch(() => {});
});

