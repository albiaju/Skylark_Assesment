# 🤖 Skylark BI Agent (ARIA)

A simple AI assistant and dashboard for Skylark Drones. It connects to your Monday.com boards and answers questions about your business data using the Gemini AI.

---

## 🌟 What can it do?
- **Chat**: Ask things like "How is our pipeline looking?" or "List the top 5 work orders."
- **Dashboard**: A visual page with 4 charts and 6 main business counters (KPIs).
- **Executive Reports**: Toggle a switch to get professional reports ready for leadership meetings.
- **Sidebar**: See your live numbers on the side while you chat.

---

## 🛠️ How to run it (Simple Steps)

1. **Install things**:
   ```bash
   npm install
   ```

2. **Setup your keys**:
   - Copy `.env.local.example` and rename it to `.env.local`.
   - Add your keys inside:
     - `MONDAY_API_KEY`: Your Monday.com token.
     - `DEALS_BOARD_ID`: The ID of your Deals board.
     - `WORK_ORDERS_BOARD_ID`: The ID of your Work Orders board.
     - `GEMINI_API_KEY`: Your Google Gemini key.

3. **Start the app**:
   ```bash
   npm run dev
   ```
   Open **http://localhost:3000** in your browser.

---

## 🚀 How to Put it Online (Vercel)

1. Go to **[Vercel](https://vercel.com)** and connect your GitHub.
2. Link this project (`Skylark_Assesment`).
3. **Important**: Go to "Settings" -> "Environment Variables" in Vercel and add the 4 keys mentioned above.
4. Deploy! It will give you a live link.

---

## 📂 Folders
- `app/`: The UI and pages.
- `lib/`: The "brain" (AI logic and data fetching).
- `data/`: Sample files for reference.
- `components/`: Reusable UI pieces (Nav, Chat bubbles).
