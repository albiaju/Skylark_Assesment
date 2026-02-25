import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDeals, getWorkOrders } from './monday.js';
import { normalizeDeal, normalizeWorkOrder, summarizeDeals, summarizeWorkOrders } from './normalize.js';

// ── In-memory cache (5-minute TTL) ──────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function cached(key, fn) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    const data = await fn();
    cache.set(key, { data, ts: Date.now() });
    return data;
}

// ── Build compact data context for the prompt ─────────────────────────────────
function buildContext(deals, wos) {
    // Sector aggregates — deals
    const dealsBySector = {};
    const dealsByStatus = {};
    const dealsByStage = {};
    deals.forEach(d => {
        const s = d.sector || 'Unknown';
        const st = d.status || 'Unknown';
        const sg = d.dealStage || 'Unknown';
        if (!dealsBySector[s]) dealsBySector[s] = { total: 0, open: 0, won: 0, dead: 0, openValue: 0, wonValue: 0 };
        dealsBySector[s].total++;
        if (st === 'Open') { dealsBySector[s].open++; if (d.dealValue) dealsBySector[s].openValue += d.dealValue; }
        if (st === 'Won') { dealsBySector[s].won++; if (d.dealValue) dealsBySector[s].wonValue += d.dealValue; }
        if (st === 'Dead') { dealsBySector[s].dead++; }
        dealsByStatus[st] = (dealsByStatus[st] || 0) + 1;
        dealsByStage[sg] = (dealsByStage[sg] || 0) + 1;
    });

    // Sector aggregates — work orders
    const wosBySector = {};
    const wosByStatus = {};
    let totalValue = 0, totalBilled = 0, totalCollected = 0, totalReceivable = 0;
    wos.forEach(w => {
        const s = w.sector || 'Unknown';
        const es = w.executionStatus || 'Unknown';
        if (!wosBySector[s]) wosBySector[s] = { count: 0, value: 0, billed: 0, collected: 0, receivable: 0 };
        wosBySector[s].count++;
        if (w.amountExclGST) { wosBySector[s].value += w.amountExclGST; totalValue += w.amountExclGST; }
        if (w.billedExclGST) { wosBySector[s].billed += w.billedExclGST; totalBilled += w.billedExclGST; }
        if (w.collectedAmount) { wosBySector[s].collected += w.collectedAmount; totalCollected += w.collectedAmount; }
        if (w.amountReceivable) { wosBySector[s].receivable += w.amountReceivable; totalReceivable += w.amountReceivable; }
        wosByStatus[es] = (wosByStatus[es] || 0) + 1;
    });

    // Compact deal list (key fields only)
    const dealList = deals.map(d =>
        `${d.name}|${d.status}|${d.dealStage}|${d.sector}|${d.dealValue ?? 'N/A'}|${d.closureProbability ?? ''}%|${d.tentativeCloseDate ?? ''}`
    ).join('\n');

    // Compact WO list (key fields only)
    const woList = wos.map(w =>
        `${w.serialNo ?? w.dealName}|${w.sector}|${w.executionStatus}|${w.billingStatus}|${w.amountExclGST ?? 'N/A'}|${w.billedExclGST ?? 'N/A'}|${w.collectedAmount ?? 'N/A'}|${w.amountReceivable ?? 'N/A'}`
    ).join('\n');

    return `
## LIVE DATA — Skylark Drones (fetched ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})

### DEALS PIPELINE (${deals.length} total)
Status breakdown: ${JSON.stringify(dealsByStatus)}
Stage breakdown: ${JSON.stringify(dealsByStage)}
Sector breakdown (open value in ₹): ${JSON.stringify(dealsBySector)}

Columns: Name|Status|Stage|Sector|Value(₹)|Prob%|CloseDate
${dealList}

### WORK ORDERS (${wos.length} total)
Execution status: ${JSON.stringify(wosByStatus)}
Totals: Value=₹${totalValue.toFixed(0)} Billed=₹${totalBilled.toFixed(0)} Collected=₹${totalCollected.toFixed(0)} Receivable=₹${totalReceivable.toFixed(0)}
Sector breakdown: ${JSON.stringify(wosBySector)}

Columns: ID|Sector|ExecStatus|BillingStatus|Value(₹)|Billed(₹)|Collected(₹)|Receivable(₹)
${woList}
`.trim();
}

// ── System Prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are ARIA (Actionable Revenue Intelligence Agent), a business intelligence assistant for Skylark Drones — a drone survey company operating across India.

You will receive live Monday.com board data embedded in each user message. Use it to answer accurately.

BOARD CONTEXT:
- Deals Pipeline stages: A=Lead Generated, B=SQL, C=Demo Done, D=Feasibility, E=Proposal Sent, F=Negotiations, G=Project Won, H=Work Order Received, I=POC, J=Invoice Sent, K=Amount Accrued, L=Project Lost, M=On Hold, N/O=Not Relevant
- Active stages (Open): A–H. Won=G+. Dead=L. On Hold=M.
- Sectors: Mining, Renewables, Railways, Powerline, Construction, DSP, Tender, Others, Aviation, Manufacturing
- All figures in Indian Rupees excl. GST. Use Lakhs (L) and Crores (Cr) for readability (1 Cr = 10,000,000).
- Names are anonymized: owners=OWNER_00X, clients=COMPANY_XXX

GUIDELINES:
1. Answer directly from the data provided — no need to say you're fetching
2. Be concise and insight-driven, not just a data dump
3. Flag data quality issues (missing values, #VALUE!) when relevant
4. Cross-reference Deals and Work Orders when the question calls for it

### LEADERSHIP UPDATE PROTOCOL
When the user message contains "[LEADERSHIP UPDATE MODE]" or asks for a "leadership update," "executive summary," or "report," you MUST use the following EXACT structure. DO NOT depart from this format.

## 📊 Executive Summary
A high-level 2-3 sentence overview of the current business state. Highlight the single most important trend or achievement.

## 💰 Key Financial Metrics
| Metric | Value | Status |
| :--- | :--- | :--- |
| **Open Pipeline** | ₹XX Cr/L | [Health Indicator] |
| **Won Revenue** | ₹XX Cr/L | [Target Progress] |
| **Receivables** | ₹XX Cr/L | [Risk Level] |
| **Win Rate** | XX% | [Performance] |

## 🔄 Sectoral Pipeline Distribution
- **Top Sector**: [Sector Name] (₹XX L) - [Brief Insight]
- **Growth Sector**: [Sector Name] (₹XX L) - [Brief Insight]
- **Lagging Sector**: [Sector Name] (₹XX L) - [Brief Insight]

## ⚠️ Critical Risks & Bottlenecks
- [Risk 1]: (e.g., High receivables in Mining)
- [Risk 2]: (e.g., 5 deals stalled in Negotiations stage)
- [Risk 3]: (e.g., Missing value data in Renewables work orders)

## ✅ Recommended Actions
1. **Immediate**: [Specific action for this week]
2. **Strategic**: [Action for the month]
3. **Operational**: [Data cleanup or follow-up recommendation]

---
*Generated by ARIA Intelligence for Skylark Leadership*`;

// ── Main agent — single API call ──────────────────────────────────────────────
export async function runAgent(messages) {
    // Pre-load board data (both boards in parallel, cached 5 min)
    const [rawDeals, rawWOs] = await Promise.all([
        cached('deals', getDeals),
        cached('workorders', getWorkOrders),
    ]);

    const deals = rawDeals.map(normalizeDeal).filter(d => d.name);
    const wos = rawWOs.map(normalizeWorkOrder).filter(w => w.dealName);

    const dataContext = buildContext(deals, wos);

    // Inject data into the last user message
    const augmentedMessages = messages.map((m, i) => {
        if (i === messages.length - 1 && m.role === 'user') {
            return { ...m, content: `${m.content}\n\n${dataContext}` };
        }
        return m;
    });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    });

    const history = augmentedMessages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
    }));

    const lastMessage = augmentedMessages[augmentedMessages.length - 1];
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
}
