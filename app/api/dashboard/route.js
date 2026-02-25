import { NextResponse } from 'next/server';
import { getDeals, getWorkOrders } from '@/lib/monday.js';
import { normalizeDeal, normalizeWorkOrder } from '@/lib/normalize.js';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function cached(key, fn) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    const data = await fn();
    cache.set(key, { data, ts: Date.now() });
    return data;
}

export async function GET() {
    try {
        const [rawDeals, rawWOs] = await Promise.all([
            cached('deals', getDeals),
            cached('workorders', getWorkOrders),
        ]);

        const deals = rawDeals.map(normalizeDeal).filter(d => d.name);
        const wos = rawWOs.map(normalizeWorkOrder).filter(w => w.dealName);

        // ── KPI cards ──────────────────────────────────────────────────────────
        let totalPipeline = 0, totalWon = 0, totalReceivable = 0;
        let openDeals = 0, wonDeals = 0, deadDeals = 0;

        deals.forEach(d => {
            if (d.status === 'Open') { openDeals++; if (d.dealValue) totalPipeline += d.dealValue; }
            if (d.status === 'Won') { wonDeals++; if (d.dealValue) totalWon += d.dealValue; }
            if (d.status === 'Dead') { deadDeals++; }
        });

        let openWOs = 0, completedWOs = 0, totalWOValue = 0;
        wos.forEach(w => {
            const es = (w.executionStatus || '').toLowerCase();
            if (!es.includes('complet')) openWOs++;
            else completedWOs++;
            if (w.amountExclGST) totalWOValue += w.amountExclGST;
            if (w.amountReceivable) totalReceivable += w.amountReceivable;
        });

        const winRate = (wonDeals + deadDeals) > 0
            ? Math.round((wonDeals / (wonDeals + deadDeals)) * 100)
            : null;

        // ── Deal stage funnel ──────────────────────────────────────────────────
        const stageOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
        const stageLabels = {
            A: 'Lead Gen', B: 'SQL', C: 'Demo', D: 'Feasibility', E: 'Proposal',
            F: 'Negotiations', G: 'Won', H: 'WO Received', I: 'POC',
            J: 'Invoice Sent', K: 'Accrued', L: 'Lost', M: 'On Hold',
        };
        const stageCounts = {};
        deals.forEach(d => {
            const sg = (d.dealStage || '').trim().toUpperCase();
            stageCounts[sg] = (stageCounts[sg] || 0) + 1;
        });
        const stageFunnel = stageOrder.map(s => ({
            stage: s,
            label: stageLabels[s] || s,
            count: stageCounts[s] || 0,
        }));

        // ── Deal value by sector ───────────────────────────────────────────────
        const dealsBySector = {};
        deals.forEach(d => {
            const s = d.sector || 'Unknown';
            if (!dealsBySector[s]) dealsBySector[s] = { open: 0, won: 0, count: 0 };
            dealsBySector[s].count++;
            if (d.status === 'Open' && d.dealValue) dealsBySector[s].open += d.dealValue;
            if (d.status === 'Won' && d.dealValue) dealsBySector[s].won += d.dealValue;
        });

        // ── Work order status ──────────────────────────────────────────────────
        const woStatusCounts = {};
        wos.forEach(w => {
            const s = w.executionStatus || 'Unknown';
            woStatusCounts[s] = (woStatusCounts[s] || 0) + 1;
        });

        // ── WO value by sector ─────────────────────────────────────────────────
        const wosBySector = {};
        wos.forEach(w => {
            const s = w.sector || 'Unknown';
            if (!wosBySector[s]) wosBySector[s] = { billed: 0, receivable: 0, count: 0 };
            wosBySector[s].count++;
            if (w.billedExclGST) wosBySector[s].billed += w.billedExclGST;
            if (w.amountReceivable) wosBySector[s].receivable += w.amountReceivable;
        });

        // ── Billing collection rate ────────────────────────────────────────────
        let totalBilled = 0, totalCollected = 0;
        wos.forEach(w => {
            if (w.billedExclGST) totalBilled += w.billedExclGST;
            if (w.collectedAmount) totalCollected += w.collectedAmount;
        });

        // ── Recent WOs (top 10 by value) ──────────────────────────────────────
        const recentWOs = [...wos]
            .filter(w => w.amountExclGST)
            .sort((a, b) => b.amountExclGST - a.amountExclGST)
            .slice(0, 10)
            .map(w => ({
                name: w.dealName, sector: w.sector,
                status: w.executionStatus, value: w.amountExclGST,
                receivable: w.amountReceivable,
            }));

        return NextResponse.json({
            kpis: {
                totalPipeline, totalWon, totalReceivable,
                totalWOValue, totalBilled, totalCollected,
                openDeals, wonDeals, deadDeals,
                openWOs, completedWOs,
                totalDeals: deals.length, totalWOs: wos.length,
                winRate,
                collectionRate: totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : null,
            },
            stageFunnel,
            dealsBySector,
            woStatusCounts,
            wosBySector,
            recentWOs,
            dataQuality: {
                dealsWithMissingValue: deals.filter(d => !d.dealValue && d.status === 'Open').length,
                wosWithMissingAmount: wos.filter(w => !w.amountExclGST).length,
            },
            lastUpdated: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Dashboard API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
