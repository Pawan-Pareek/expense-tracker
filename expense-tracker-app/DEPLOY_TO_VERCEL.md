# How to Deploy Expense Tracker to Vercel (100% Free Forever)

Deploying to **Vercel** makes your Expense Tracker live on the internet 24/7 with a free secure link (e.g. `https://your-expense-tracker.vercel.app`). 

### Why this is the best setup:
- 🌍 **Works Anywhere on 4G/5G Cellular Data**: No need to be connected to home Wi-Fi.
- ⚡ **PC Can Be Turned Off**: Cloud-hosted 24/7 with instant response times.
- 💰 **100% Free**: Zero monthly cost, no credit card required.
- 🔒 **Encrypted HTTPS**: Fully secure communication with your iPhone.

---

## 🚀 3-Minute Deployment Steps

### Step 1: Create a Free GitHub Repository
1. Go to **[github.com](https://github.com)** (sign in or create a free account).
2. Click the **+** icon in the top right > **New repository**.
3. Name it `expense-tracker` and click **Create repository**.
4. Click **"uploading an existing file"**:
   - Drag and drop the files from your folder `c:\Users\pawan\Desktop\expense-tracker-app\` (or upload the ready-made `expense-tracker-vercel.zip` from your Desktop).
5. Click **Commit changes**.

---

### Step 2: Deploy on Vercel
1. Go to **[vercel.com](https://vercel.com)** and sign in using your **GitHub** account.
2. Click **"Add New..." > "Project"**.
3. Find your `expense-tracker` repository and click **Import**.
4. Leave all settings at default and click **Deploy**.
5. In ~30 seconds, Vercel will give you your live URL (e.g., `https://expense-tracker-yourname.vercel.app`)! 🎉

---

### Step 3 (Optional - 1 Click): Enable Free Cloud Storage (Vercel KV)
If you want transactions to persist in a free cloud database across all devices:
1. In your Vercel Project Dashboard, click the **Storage** tab.
2. Click **Create Database** > Select **KV** (Powered by Upstash, 100% free).
3. Click **Continue** > Choose a name (e.g. `expense-kv`) > Click **Create**.
4. Click **Connect to Project** and select your `expense-tracker` project.
5. Click **Redeploy**.

---

### Step 4: Update Your iPhone iOS Shortcut
Now update your iPhone's automated tracking rule to use your new live Vercel URL:

1. Open the **Shortcuts** app on your iPhone.
2. Go to **Automation** tab > Tap your existing **Message (`debited`)** automation.
3. Tap the **Get Contents of URL** action.
4. Replace the old Wi-Fi URL with your new Vercel URL:
   ```text
   https://YOUR-APP-NAME.vercel.app/api/webhook?msg=
   ```
   *(Ensure `[Shortcut Input]` is appended after the `=`).*
5. Tap **Done**.

---

## 🎯 You Are All Set!
Whenever you make a payment on Google Pay, PhonePe, Paytm, or swipe your card, your bank sends an SMS:
- Your iPhone automatically forwards it to `https://YOUR-APP-NAME.vercel.app/api/webhook`.
- The serverless function parses Debit/Credit, amount, and merchant.
- Your ledger updates instantly, anywhere in the world, with zero server costs!
