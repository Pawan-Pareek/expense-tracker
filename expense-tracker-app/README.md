# ExpenseTracker — Daily Debit & Credit Expense Tracker

A modern, 100% free, and private personal expense tracker web application focused on automatically tracking and categorizing daily **Debit** and **Credit** transactions.

---

## ✨ Key Features

### 1. Dual-Column Daily Debit & Credit Layout
* **Debit Section (Left Column)**: Tracks all money spent or deducted from your accounts with distinct crimson visual accents.
* **Credit Section (Right Column)**: Tracks all money received or added to your accounts with emerald visual accents.
* **Complete Transaction Card Details**:
  * Exact amount in Indian Rupees (₹)
  * Date & time
  * Description / Merchant name
  * Transaction type badge (Debit / Credit)
  * Account source (e.g., HDFC Bank, SBI, ICICI, Axis, Google Pay, PhonePe, Paytm)
  * Category tag & notes
  * Inline Edit & Delete actions
* **Daily Totals (At the bottom of each day's list)**:
  * **Total Debit**
  * **Total Credit**
  * **Net Amount**: Formula: `Net Amount = Total Credit − Total Debit`

---

### 2. Automatic SMS & UPI Transaction Parser
* **100% On-Device Processing**: No financial data ever leaves your device or touches any server.
* **Intelligent Indian Banking & UPI Engine**: Automatically parses transaction messages from:
  * HDFC Bank, State Bank of India (SBI), ICICI Bank, Axis Bank, Kotak Mahindra, PNB, Bank of Baroda
  * Google Pay, PhonePe, Paytm, CRED
* **Automated Extraction**:
  * Detects Debit vs Credit
  * Extracts exact Amount, Merchant/Beneficiary, Account digits, and Date
  * Auto-categorizes into Food, Groceries, Shopping, Utilities, Salary, etc.
* **Built-in Quick Test Presets**: Includes 8 realistic bank SMS templates to test parsing with a single click.

---

### 3. Dashboard Overview & Filters
* **Top Metric Cards**:
  * Today's Debit, Credit, and Net Amount
  * Current Month's Debit, Credit, and Net Amount
  * Overall Net Balance / Savings
* **Flexible Filters**:
  * All, Today, This Week, This Month, Previous Month, and Custom Date Range
  * Instant search by merchant, notes, or source
  * Category filter dropdown

---

### 4. Monthly Financial Summaries & History
* **Month Selector**: View current month or jump back to previous months.
* **Key Monthly Metrics**:
  * Total Monthly Debit
  * Total Monthly Credit
  * Monthly Net Amount (`Total Monthly Credit − Total Monthly Debit`)
  * Number of Debit transactions
  * Number of Credit transactions
  * Highest Debit transaction (with merchant & date)
  * Highest Credit transaction (with source & date)
* **Formatted Notification & Sharing**:
  * One-click copy formatted summary (e.g. `September 2026 — Monthly Summary: 💸 Total Debit: ₹32,500 | 💰 Total Credit: ₹50,000 | 📊 Net: ₹17,500`)
  * Daily expense breakdown table for the selected month

---

### 5. Notifications & Alerts
* **Daily Summary Notification**: Sends today's breakdown (`Debit: ₹X | Credit: ₹Y | Net: ₹Z`).
* **Transaction Alerts**: Alerts user when a new Debit or Credit is detected.
* **End-of-Month Summary Notification**: Generates complete monthly overview.
* **In-App Notification Drawer + Web Notification API**: Works natively in browsers and on mobile devices.

---

### 6. Full Editing & Manual Entry (CRUD)
* Manually add transactions with one-click Debit/Credit toggle.
* Edit any field (amount, merchant, date/time, category, source, notes).
* Change Debit to Credit or Credit to Debit seamlessly.
* Delete with confirmation modal.
* **Instant Auto-Recalculation**: All daily and monthly totals instantly update whenever a transaction is added, edited, or deleted.

---

### 7. Interactive Visual Reports & Charts
* Pure native SVG charts (zero external libraries, 100% offline & free):
  * **Monthly Debit vs Credit Comparison** (Bar chart)
  * **Daily Spending Trend Curve** (Area chart)
  * **Debit vs Credit Volume & Count Ratio** (Donut chart)
  * **Spending Breakdown by Category** (Interactive progress bars)

---

### 8. Privacy, Security & Cost
* **100% Free**: No subscriptions, no ads, no in-app purchases, no hidden fees.
* **Local Storage**: All data is stored in the browser's `localStorage` on your device.
* **Data Backup & Export**: Export to JSON and CSV (Excel compatible) anytime.
* **Restore & Reset**: Import backup JSON or reset to demo data.

---

## 🚀 How to Run the App

1. Double-click [start-app.bat](file:///c:/Users/pawan/Desktop/expense-tracker-app/start-app.bat) or run the command:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File server.ps1 -Port 8080
   ```
2. Open your browser and navigate to:
   **[http://localhost:8080/](http://localhost:8080/)**
3. To install as a Progressive Web App (PWA) on your phone or desktop, click the "Install App" icon in your browser's address bar.
