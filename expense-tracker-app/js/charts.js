/**
 * Lightweight SVG Chart Engine
 * 100% Free, Native Vanilla JS, Zero External Libraries, Completely Offline
 */

class ChartsEngine {
  /**
   * Render Monthly Debit vs Credit Bar Chart
   */
  static renderMonthlyBarChart(containerId, monthsData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!monthsData || monthsData.length === 0) {
      container.innerHTML = '<div class="chart-empty">No transaction data available</div>';
      return;
    }

    // Reverse to show chronological order left-to-right (up to 6 months)
    const data = [...monthsData].reverse().slice(-6);

    const width = 600;
    const height = 260;
    const padding = { top: 30, right: 20, bottom: 40, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...data.map(d => Math.max(d.totalDebit, d.totalCredit, 1000)));
    const roundedMax = Math.ceil(maxVal / 10000) * 10000 || 10000;

    const groupWidth = chartW / data.length;
    const barWidth = Math.min(26, groupWidth * 0.32);

    let barsSvg = '';
    let xLabelsSvg = '';

    data.forEach((d, idx) => {
      const groupX = padding.left + idx * groupWidth;
      const centerGroup = groupX + groupWidth / 2;

      const debitH = (d.totalDebit / roundedMax) * chartH;
      const creditH = (d.totalCredit / roundedMax) * chartH;

      const debitX = centerGroup - barWidth - 3;
      const creditX = centerGroup + 3;

      const debitY = padding.top + (chartH - debitH);
      const creditY = padding.top + (chartH - creditH);

      // Debit Bar (Red)
      barsSvg += `
        <g class="chart-bar-group" data-month="${d.label}" data-debit="${d.totalDebit}" data-credit="${d.totalCredit}">
          <rect x="${debitX}" y="${debitY}" width="${barWidth}" height="${Math.max(2, debitH)}" rx="4" class="bar-debit">
            <title>${d.label} Debit: ₹${d.totalDebit.toLocaleString('en-IN')}</title>
          </rect>
          <rect x="${creditX}" y="${creditY}" width="${barWidth}" height="${Math.max(2, creditH)}" rx="4" class="bar-credit">
            <title>${d.label} Credit: ₹${d.totalCredit.toLocaleString('en-IN')}</title>
          </rect>
        </g>
      `;

      // Short month label (e.g. "Sep", "Oct")
      const shortLabel = d.label.split(' ')[0].substr(0, 3);
      xLabelsSvg += `
        <text x="${centerGroup}" y="${height - 12}" text-anchor="middle" class="chart-axis-text">${shortLabel}</text>
      `;
    });

    // Y Grid lines (3 horizontal lines)
    let gridSvg = '';
    const gridTicks = [0, roundedMax / 2, roundedMax];
    gridTicks.forEach((val) => {
      const yPos = padding.top + chartH - (val / roundedMax) * chartH;
      const label = val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val;
      gridSvg += `
        <line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" class="chart-grid-line" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${yPos + 4}" text-anchor="end" class="chart-axis-text">₹${label}</text>
      `;
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="svg-chart" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="debitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f87171" />
            <stop offset="100%" stop-color="#ef4444" />
          </linearGradient>
          <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#34d399" />
            <stop offset="100%" stop-color="#10b981" />
          </linearGradient>
        </defs>
        ${gridSvg}
        ${barsSvg}
        ${xLabelsSvg}
      </svg>
      <div class="chart-legend">
        <div class="legend-item"><span class="legend-dot debit"></span> Debit (Money Out)</div>
        <div class="legend-item"><span class="legend-dot credit"></span> Credit (Money In)</div>
      </div>
    `;
  }

  /**
   * Render Daily Spending Trend Line/Area Chart
   */
  static renderDailyTrendChart(containerId, dailyGroups) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!dailyGroups || dailyGroups.length === 0) {
      container.innerHTML = '<div class="chart-empty">No daily data available for this range</div>';
      return;
    }

    // Show chronologically left-to-right (up to 14 days)
    const data = [...dailyGroups].reverse().slice(-14);
    if (data.length < 2) {
      container.innerHTML = '<div class="chart-empty">Need at least 2 days of transactions to display trend curve</div>';
      return;
    }

    const width = 600;
    const height = 240;
    const padding = { top: 25, right: 25, bottom: 40, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...data.map(d => Math.max(d.totalDebit, d.totalCredit, 500)));
    const roundedMax = Math.ceil(maxVal / 1000) * 1000 || 1000;

    const stepX = chartW / (data.length - 1);

    const debitPoints = [];
    const creditPoints = [];

    data.forEach((d, idx) => {
      const x = padding.left + idx * stepX;
      const debY = padding.top + chartH - (d.totalDebit / roundedMax) * chartH;
      const creY = padding.top + chartH - (d.totalCredit / roundedMax) * chartH;
      debitPoints.push({ x, y: debY, val: d.totalDebit, label: d.heading.split('•')[0].trim() });
      creditPoints.push({ x, y: creY, val: d.totalCredit, label: d.heading.split('•')[0].trim() });
    });

    const createPath = (points) => points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    const debitPathStr = createPath(debitPoints);
    const creditPathStr = createPath(creditPoints);

    // Area fill path for debit
    const debitAreaStr = `${debitPathStr} L ${debitPoints[debitPoints.length - 1].x.toFixed(1)} ${padding.top + chartH} L ${debitPoints[0].x.toFixed(1)} ${padding.top + chartH} Z`;

    let dotsSvg = '';
    debitPoints.forEach((p) => {
      dotsSvg += `<circle cx="${p.x}" cy="${p.y}" r="4" class="chart-dot debit-dot"><title>${p.label} Debit: ₹${p.val.toLocaleString('en-IN')}</title></circle>`;
    });
    creditPoints.forEach((p) => {
      dotsSvg += `<circle cx="${p.x}" cy="${p.y}" r="4" class="chart-dot credit-dot"><title>${p.label} Credit: ₹${p.val.toLocaleString('en-IN')}</title></circle>`;
    });

    let xLabelsSvg = '';
    data.forEach((d, idx) => {
      // Pick every alternate label if many days
      if (data.length > 7 && idx % 2 !== 0 && idx !== data.length - 1) return;
      const x = padding.left + idx * stepX;
      const datePart = d.dateKey.split('-').slice(1).join('/');
      xLabelsSvg += `<text x="${x}" y="${height - 12}" text-anchor="middle" class="chart-axis-text">${datePart}</text>`;
    });

    // Y Axis ticks
    let gridSvg = '';
    [0, roundedMax / 2, roundedMax].forEach((val) => {
      const y = padding.top + chartH - (val / roundedMax) * chartH;
      gridSvg += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="chart-axis-text">₹${(val / 1000).toFixed(1)}k</text>
      `;
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="svg-chart" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="areaDebitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#ef4444" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        ${gridSvg}
        <path d="${debitAreaStr}" fill="url(#areaDebitGrad)" />
        <path d="${debitPathStr}" fill="none" stroke="#ef4444" stroke-width="2.5" class="chart-line-debit" />
        <path d="${creditPathStr}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="4,2" class="chart-line-credit" />
        ${dotsSvg}
        ${xLabelsSvg}
      </svg>
      <div class="chart-legend">
        <div class="legend-item"><span class="legend-line debit"></span> Daily Debit Spending</div>
        <div class="legend-item"><span class="legend-line credit"></span> Daily Credit Inflow</div>
      </div>
    `;
  }

  /**
   * Render Donut Ratio Chart (Debit vs Credit volume & count)
   */
  static renderRatioDonutChart(containerId, debitTotal, creditTotal, debitCount, creditCount) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalVolume = debitTotal + creditTotal;
    if (totalVolume === 0) {
      container.innerHTML = '<div class="chart-empty">No transactions to analyze</div>';
      return;
    }

    const debitPercent = Math.round((debitTotal / totalVolume) * 100);
    const creditPercent = 100 - debitPercent;

    // SVG Donut (Circumference of r=40 is ~251.32)
    const radius = 40;
    const circ = 2 * Math.PI * radius;
    const debitOffset = circ * (1 - debitPercent / 100);

    container.innerHTML = `
      <div class="donut-chart-wrapper">
        <svg viewBox="0 0 100 100" class="donut-svg">
          <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#10b981" stroke-width="14" />
          <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#ef4444" stroke-width="14"
            stroke-dasharray="${circ}" stroke-dashoffset="${debitOffset}"
            transform="rotate(-90 50 50)" stroke-linecap="round" />
          <text x="50" y="47" text-anchor="middle" class="donut-center-title">Debit Share</text>
          <text x="50" y="61" text-anchor="middle" class="donut-center-val">${debitPercent}%</text>
        </svg>
        <div class="donut-stats-list">
          <div class="donut-stat-row">
            <span class="legend-dot debit"></span>
            <div class="stat-info">
              <span class="stat-name">Total Debit (${debitCount} txns)</span>
              <span class="stat-amt debit">₹${debitTotal.toLocaleString('en-IN')} (${debitPercent}%)</span>
            </div>
          </div>
          <div class="donut-stat-row">
            <span class="legend-dot credit"></span>
            <div class="stat-info">
              <span class="stat-name">Total Credit (${creditCount} txns)</span>
              <span class="stat-amt credit">₹${creditTotal.toLocaleString('en-IN')} (${creditPercent}%)</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

window.ChartsEngine = ChartsEngine;
