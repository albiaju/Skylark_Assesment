# Decision Log — Skylark Drones BI Agent

**Author:** Skylark Assignment  
**Date:** February 2026  
**Timeline:** 6 hours

---

## Key Assumptions

1. **Monday.com as source of truth** — No CSV data was hardcoded. All queries go live to Monday.com via the REST API. Board IDs are configured via environment variables.

2. **Anonymized data is intentional** — Owner codes (OWNER_00X) and client codes (COMPANY_XXX) in the CSV are treated as-is. The agent explains this to users who ask "who is this client?"

3. **"Leadership update" = structured executive brief** — Interpreted as a formatted markdown report with sections: Executive Summary, Key Financial Metrics, Pipeline Health, Risks, and Recommended Actions. Triggered by a toggle in the UI or by phrasing like "prepare a leadership update".

4. **"Energy sector" maps to "Renewables"** — Skylark's sector naming uses "Renewables" for energy-related deals. The agent interprets natural language sector references accordingly.

5. **Figures are excl. GST unless stated** — All monetary values from the boards are treated as exclusive of GST, consistent with typical Indian B2B invoicing.

---

## Trade-offs

### API Strategy: Single-call vs Tool-calling

**Decision:** Single Gemini API call with data pre-loaded as context.

**Rationale:** The initial implementation used Gemini's function-calling (tool-calling loop) which required 3–5 API round-trips per user query. At free-tier limits (15 RPM), this caused frequent rate limit errors. The single-call approach injects pre-aggregated board data directly into the prompt, reducing API calls to 1 per query — more reliable, faster, and cheaper.

**Trade-off:** The model sees all board data rather than selectively fetching. For 346 deals + 176 work orders with compact field selection, this is ~6K tokens — well within Gemini's limits.

### Caching Strategy

**Decision:** 5-minute in-memory cache for Monday.com board data.

**Rationale:** Monday.com's API has rate limits, and board data doesn't change second-by-second. A 5-minute cache eliminates redundant fetches for rapid successive queries while keeping data reasonably fresh.

### AI Model: Gemini 2.5 Flash

**Decision:** Google Gemini 2.5 Flash over GPT-4o, Claude, or Llama.

**Rationale:** Gemini's free tier (1M TPM) is orders of magnitude more generous than alternatives tested (Groq: 12K TPM). Flash variant is optimised for speed and structured output — ideal for BI queries that need table/list formatting.

### Framework: Next.js App Router

**Decision:** Next.js 14+ with App Router over Express + React SPA.

**Rationale:** Single deployment unit, built-in API routes, server-side caching compatibility, and Vercel-native. Avoids managing a separate backend service.

---

## What I'd Do Differently With More Time

1. **Vector search on deals** — Embed deal descriptions so users can ask "find deals similar to our Tata Steel win" using semantic search rather than exact filtering.

2. **Persistent conversation memory** — Currently each session starts fresh. Adding a server-side session store (Redis) would let the agent remember context across page refreshes.

3. **Real-time dashboard** — Replace the 5-minute poll with Monday.com webhooks to push updates instantly to the dashboard.

4. **Export to PDF** — Add a "Download as PDF" button for leadership updates using `@react-pdf/renderer`.

5. **Multi-board config UI** — Let users paste their board IDs in a settings page rather than via `.env.local`, making the agent reusable without code changes.

6. **Trend analysis** — Track metrics over time (weekly snapshots stored in a DB) to answer "how did our pipeline change this month?"

---

## How I Interpreted "Leadership Updates"

The requirement was intentionally vague: *"The agent should help prepare data for leadership updates."*

**My interpretation:** A leadership update is a **structured, decision-ready brief** — not a raw data dump. Founders and VCs don't want to see 346 rows; they want:
- One number for pipeline health
- The top risks requiring action
- Clear recommendations

**Implementation:** A toggle in the chat UI switches to "Leadership Update Mode" which instructs the AI to respond in a five-section executive brief format. The same mode can be triggered conversationally ("prepare a leadership update").

The dashboard page complements this: it provides the visual at-a-glance layer that leadership teams typically review in a weekly standup.
