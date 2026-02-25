# Skylark Drones — Monday.com BI Agent

An AI-powered business intelligence agent that answers founder-level queries from Skylark Drones' Monday.com boards. Ask questions conversationally and get live, accurate insights on pipeline, work orders, sectors, and revenue.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│               Next.js App                   │
│                                             │
│  /            → Chat interface (ARIA)       │
│  /dashboard   → Visual KPI dashboard        │
│                                             │
│  /api/chat      → POST: run AI agent        │
│  /api/dashboard → GET: aggregated metrics   │
└─────────────────┬───────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
  ┌──────▼──────┐   ┌──────▼──────┐
  │ Gemini 2.5  │   │ Monday.com  │
  │   Flash AI  │   │   REST API  │
  └─────────────┘   └─────────────┘
```

**Data flow:**
1. User sends query → `/api/chat`
2. Server fetches both boards from Monday.com (cached 5 min)
3. Data is aggregated + injected into the Gemini prompt
4. Gemini responds in a single call (no tool-calling round-trips)
5. Response streamed back to the chat UI

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 App Router | Full-stack, API routes included |
| AI Model  | Gemini 2.5 Flash | 1M TPM free tier, structured output |
| Charts    | Chart.js 4 (CDN) | Lightweight, dark-mode friendly |
| Styling   | Vanilla CSS | Full control, no Tailwind overhead |
| Data      | Monday.com REST API | Direct integration, no CSV hardcoding |
| Deployment| Vercel (recommended) | Zero-config Next.js hosting |

---

## Monday.com Setup

### 1. Import CSV Data

Import the two provided CSV files as Monday.com boards:

**Deals Pipeline board** — suggested columns:
| Column | Type |
|--------|------|
| Name (Deal) | Item name |
| Status | Status |
| Deal Stage | Text |
| Sector | Dropdown |
| Owner | Text |
| Client | Text |
| Deal Value | Numbers |
| Closure Probability | Numbers |
| Tentative Close Date | Date |
| Product | Text |

**Work Orders board** — suggested columns:
| Column | Type |
|--------|------|
| Name (Deal Name) | Item name |
| Customer Code | Text |
| Serial No | Text |
| Sector | Dropdown |
| Nature of Work | Text |
| Execution Status | Status |
| Billing Status | Status |
| Amount Excl GST | Numbers |
| Amount Incl GST | Numbers |
| Billed Excl GST | Numbers |
| Collected Amount | Numbers |
| Amount Receivable | Numbers |
| PO Date / Start Date / End Date | Date |

### 2. Get Board IDs

Open each board in Monday.com → the URL will be:
`https://yourteam.monday.com/boards/BOARD_ID_HERE`

---

## Local Setup

### Prerequisites
- Node.js 18+
- npm

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd skylark-assignment
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your keys (see below)

# 3. Run development server
npm run dev

# 4. Open http://localhost:3000
```

### Environment Variables (`.env.local`)

```env
MONDAY_API_KEY=your_monday_api_key_here
DEALS_BOARD_ID=your_deals_board_id
WORK_ORDERS_BOARD_ID=your_work_orders_board_id
GEMINI_API_KEY=your_gemini_api_key_here
```

**Getting API keys:**
- **Monday.com API key:** Profile picture → Developers → My Access Tokens
- **Gemini API key:** [aistudio.google.com](https://aistudio.google.com) → Get API Key

---

## Deployment (Vercel)

```bash
npm install -g vercel
vercel deploy
```

Add environment variables in Vercel dashboard:  
Project Settings → Environment Variables → add the 4 keys from `.env.local`

---

## Features

### 💬 Chat Interface (ARIA)
- Natural language queries about pipeline, work orders, sectors, revenue
- Markdown-formatted responses with tables
- Context-aware follow-up suggestions after each response
- **Leadership Update Mode** — structures response as an executive brief

### 📊 Dashboard (`/dashboard`)
- **6 KPI cards:** Pipeline value, Won revenue, Receivables, Win rate, WO value, Collection rate
- **4 live charts:**
  - Open pipeline vs Won revenue by sector (bar)
  - Deal stage distribution funnel (horizontal bar)
  - Work order execution status (doughnut)
  - Billed vs receivable by sector (grouped bar)
- **Top work orders** table sorted by contract value
- **Data quality badge** — warns when records have missing values

### 🛡️ Data Resilience
- Handles `#VALUE!` errors, blank cells, inconsistent date formats
- Reports data quality caveats in responses
- Graceful fallback for missing monetary values

---

## Project Structure

```
├── app/
│   ├── page.js              # Chat interface
│   ├── dashboard/page.js    # Visual dashboard
│   ├── layout.js            # Root layout with Nav
│   ├── globals.css          # All styles
│   └── api/
│       ├── chat/route.js    # POST /api/chat
│       └── dashboard/route.js # GET /api/dashboard
├── components/
│   ├── Nav.js               # Top navigation
│   └── ChatMessage.js       # Message bubble component
├── data/
│   ├── Deal_funnel_Data.csv # Reference deal data
│   └── Work_Order_Tracker_Data.csv # Reference work order data
├── lib/
│   ├── agent.js             # Gemini AI agent
│   ├── monday.js            # Monday.com API client
│   └── normalize.js         # Data cleaning utilities
├── DECISION_LOG.md          # Key decisions & trade-offs
└── .env.local.example       # Environment variables template
```
