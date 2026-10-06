/**
 * Reports and Financial Calculation Engine
 * Handles aggregation of daily, monthly, and filtered financial statistics.
 */

class ReportsEngine {
  /**
   * Format currency in Indian numbering format (e.g., ₹1,23,450.00)
   */
  static formatINR(val, includeDecimals = false) {
    const num = Math.abs(Number(val) || 0);
    const sign = Number(val) < 0 ? '-' : '';
    const formatted = num.toLocaleString('en-IN', {
      minimumFractionDigits: includeDecimals ? 2 : 0,
      maximumFractionDigits: includeDecimals ? 2 : 0
    });
    return `${sign}₹${formatted}`;
  }

  /**
   * Format ISO date string to user-friendly label (e.g. "06 Oct 2026, 09:30 AM")
   */
  static formatDateTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  static formatDateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  static formatDateHeading(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const now = new Date();

    const isToday = this.formatDateKey(now) === dateKey;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = this.formatDateKey(yesterday) === dateKey;

    const formattedDate = date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    if (isToday) return `Today • ${formattedDate}`;
    if (isYesterday) return `Yesterday • ${formattedDate}`;
    return formattedDate;
  }

  /**
   * Calculate dashboard overview statistics:
   * - Today's Debit, Credit, Net
   * - Current Month's Debit, Credit, Net
   * - Overall balance / net
   */
  static getDashboardStats(transactions) {
    const now = new Date();
    const todayKey = this.formatDateKey(now);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let todayDebit = 0;
    let todayCredit = 0;
    let monthDebit = 0;
    let monthCredit = 0;
    let overallDebit = 0;
    let overallCredit = 0;

    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const isDateValid = !isNaN(txDate.getTime());
      const txKey = isDateValid ? this.formatDateKey(txDate) : '';
      const amount = Number(tx.amount) || 0;

      if (tx.type === 'debit') {
        overallDebit += amount;
      } else {
        overallCredit += amount;
      }

      if (isDateValid) {
        if (txKey === todayKey) {
          if (tx.type === 'debit') todayDebit += amount;
          else todayCredit += amount;
        }

        if (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
          if (tx.type === 'debit') monthDebit += amount;
          else monthCredit += amount;
        }
      }
    });

    return {
      today: {
        debit: todayDebit,
        credit: todayCredit,
        net: todayCredit - todayDebit // Formula: Credit - Debit
      },
      currentMonth: {
        debit: monthDebit,
        credit: monthCredit,
        net: monthCredit - monthDebit
      },
      overall: {
        debit: overallDebit,
        credit: overallCredit,
        net: overallCredit - overallDebit,
        count: transactions.length
      }
    };
  }

  /**
   * Group transactions by Day and compute daily metrics:
   * For each day:
   * Total Debit
   * Total Credit
   * Net Amount = Total Credit − Total Debit
   */
  static groupTransactionsByDay(transactions) {
    const groups = new Map();

    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      const key = isNaN(d.getTime()) ? 'Unknown' : this.formatDateKey(d);

      if (!groups.has(key)) {
        groups.set(key, {
          dateKey: key,
          heading: key === 'Unknown' ? 'Undated Transactions' : this.formatDateHeading(key),
          rawDate: isNaN(d.getTime()) ? new Date(0) : d,
          debitTransactions: [],
          creditTransactions: [],
          allTransactions: [],
          totalDebit: 0,
          totalCredit: 0,
          netAmount: 0
        });
      }

      const grp = groups.get(key);
      grp.allTransactions.push(tx);
      const amt = Number(tx.amount) || 0;

      if (tx.type === 'credit') {
        grp.creditTransactions.push(tx);
        grp.totalCredit += amt;
      } else {
        grp.debitTransactions.push(tx);
        grp.totalDebit += amt;
      }
    });

    // Compute net for each day
    const result = Array.from(groups.values()).map((grp) => {
      grp.netAmount = grp.totalCredit - grp.totalDebit;
      return grp;
    });

    // Sort days descending (latest day first)
    result.sort((a, b) => b.rawDate - a.rawDate);
    return result;
  }

  /**
   * Generate comprehensive Monthly Financial Summary for a specified month & year
   * Matches all requirements:
   * - Total Debit
   * - Total Credit
   * - Monthly Net Amount (Total Credit - Total Debit)
   * - Number of Debit transactions
   * - Number of Credit transactions
   * - Highest Debit transaction
   * - Highest Credit transaction
   * - Daily expense breakdown
   */
  static getMonthlySummary(transactions, year, monthIndex) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthTransactions = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === monthIndex;
    });

    let totalDebit = 0;
    let totalCredit = 0;
    let debitCount = 0;
    let creditCount = 0;
    let highestDebit = null;
    let highestCredit = null;

    monthTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'debit') {
        totalDebit += amt;
        debitCount++;
        if (!highestDebit || amt > highestDebit.amount) {
          highestDebit = tx;
        }
      } else {
        totalCredit += amt;
        creditCount++;
        if (!highestCredit || amt > highestCredit.amount) {
          highestCredit = tx;
        }
      }
    });

    const netAmount = totalCredit - totalDebit;
    const dailyBreakdown = this.groupTransactionsByDay(monthTransactions);

    return {
      year,
      monthIndex,
      monthName: monthNames[monthIndex],
      totalDebit,
      totalCredit,
      netAmount,
      debitCount,
      creditCount,
      totalTransactions: monthTransactions.length,
      highestDebit,
      highestCredit,
      dailyBreakdown,
      transactions: monthTransactions
    };
  }

  /**
   * Get list of unique available months in transaction history (e.g., [{year: 2026, month: 9, label: 'October 2026'}])
   */
  static getAvailableMonths(transactions) {
    const monthSet = new Map();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${m}`;
        if (!monthSet.has(key)) {
          monthSet.set(key, {
            year: y,
            monthIndex: m,
            label: `${monthNames[m]} ${y}`,
            sortVal: y * 12 + m
          });
        }
      }
    });

    // Always include current month if empty
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
    if (!monthSet.has(currentKey)) {
      monthSet.set(currentKey, {
        year: now.getFullYear(),
        monthIndex: now.getMonth(),
        label: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
        sortVal: now.getFullYear() * 12 + now.getMonth()
      });
    }

    return Array.from(monthSet.values()).sort((a, b) => b.sortVal - a.sortVal);
  }

  /**
   * Filter transactions based on preset or custom range
   */
  static filterTransactions(transactions, filterType, customStart = null, customEnd = null) {
    const now = new Date();
    const todayKey = this.formatDateKey(now);

    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) return false;
      const txKey = this.formatDateKey(d);

      switch (filterType) {
        case 'today':
          return txKey === todayKey;

        case 'week': {
          // Last 7 days
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - 6);
          startOfWeek.setHours(0, 0, 0, 0);
          return d >= startOfWeek && d <= now;
        }

        case 'month':
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();

        case 'prev_month': {
          const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getFullYear() === prevMonthDate.getFullYear() && d.getMonth() === prevMonthDate.getMonth();
        }

        case 'custom': {
          if (!customStart) return true;
          const start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
          const end = customEnd ? new Date(customEnd) : new Date();
          end.setHours(23, 59, 59, 999);
          return d >= start && d <= end;
        }

        case 'all':
        default:
          return true;
      }
    });
  }
}

window.ReportsEngine = ReportsEngine;
