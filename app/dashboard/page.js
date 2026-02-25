'use client';
import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import {
    DollarSign, Trophy, AlertTriangle, Target,
    ClipboardList, CreditCard, RefreshCw, ExternalLink,
    TrendingUp, BarChart2, Activity,
} from 'lucide-react';

const INR = (v) => {
    if (!v && v !== 0) return '—';
    if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
    if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
    return `₹${v.toLocaleString('en-IN')}`;
};

const SECTOR_COLORS = [
    '#6C63FF', '#00C9FF', '#FF6B6B', '#FFD166', '#06D6A0',
    '#EF8C8C', '#A8DADC', '#F4A261', '#E76F51', '#2EC4B6',
];

const KPI_DEFS = [
    { key: 'totalPipeline', label: 'Open Pipeline', sub: (k) => `${k.openDeals} open deals`, Icon: DollarSign, color: 'blue', fmt: INR },
    { key: 'totalWon', label: 'Won Revenue', sub: (k) => `${k.wonDeals} deals won`, Icon: Trophy, color: 'green', fmt: INR },
    { key: 'totalReceivable', label: 'Receivables', sub: () => 'Billed but uncollected', Icon: AlertTriangle, color: 'red', fmt: INR },
    { key: 'winRate', label: 'Win Rate', sub: (k) => `${k.wonDeals} won / ${k.deadDeals} lost`, Icon: Target, color: 'purple', fmt: (v) => v != null ? `${v}%` : 'N/A' },
    { key: 'totalWOValue', label: 'WO Contract Value', sub: (k) => `${k.totalWOs} work orders`, Icon: ClipboardList, color: 'cyan', fmt: INR },
    { key: 'collectionRate', label: 'Collection Rate', sub: (k) => `${INR(k.totalCollected)} collected`, Icon: CreditCard, color: 'teal', fmt: (v) => v != null ? `${v}%` : 'N/A' },
];

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [scriptReady, setScriptReady] = useState(false);
    const chartsRef = useRef({});

    const load = (bust = false) => {
        setRefreshing(true);
        const url = bust ? `/api/dashboard?t=${Date.now()}` : '/api/dashboard';
        fetch(url)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); setRefreshing(false); })
            .catch(e => { setError(e.message); setLoading(false); setRefreshing(false); });
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { if (data && scriptReady) renderCharts(); }, [data, scriptReady]);

    const destroyChart = (id) => {
        if (chartsRef.current[id]) { chartsRef.current[id].destroy(); delete chartsRef.current[id]; }
    };

    const renderCharts = () => {
        const Chart = window.Chart;
        if (!Chart) return;

        const sectors = Object.keys(data.dealsBySector).sort(
            (a, b) => data.dealsBySector[b].open - data.dealsBySector[a].open
        );

        destroyChart('sectorChart');
        const sCtx = document.getElementById('sectorChart')?.getContext('2d');
        if (sCtx) {
            chartsRef.current.sectorChart = new Chart(sCtx, {
                type: 'bar',
                data: {
                    labels: sectors,
                    datasets: [
                        { label: 'Open Pipeline (₹)', data: sectors.map(s => data.dealsBySector[s].open), backgroundColor: '#6C63FF', borderRadius: 6 },
                        { label: 'Won Revenue (₹)', data: sectors.map(s => data.dealsBySector[s].won), backgroundColor: '#06D6A0', borderRadius: 6 },
                    ],
                },
                options: chartOptions(),
            });
        }

        destroyChart('stageChart');
        const stCtx = document.getElementById('stageChart')?.getContext('2d');
        if (stCtx) {
            const stages = data.stageFunnel.filter(s => s.count > 0);
            chartsRef.current.stageChart = new Chart(stCtx, {
                type: 'bar',
                data: {
                    labels: stages.map(s => `${s.stage}: ${s.label}`),
                    datasets: [{ label: 'Deals', data: stages.map(s => s.count), backgroundColor: stages.map((_, i) => SECTOR_COLORS[i % SECTOR_COLORS.length]), borderRadius: 6 }],
                },
                options: { indexAxis: 'y', ...chartOptions(false) },
            });
        }

        destroyChart('woStatusChart');
        const wCtx = document.getElementById('woStatusChart')?.getContext('2d');
        if (wCtx) {
            const statuses = Object.keys(data.woStatusCounts);
            chartsRef.current.woStatusChart = new Chart(wCtx, {
                type: 'doughnut',
                data: {
                    labels: statuses,
                    datasets: [{ data: statuses.map(s => data.woStatusCounts[s]), backgroundColor: SECTOR_COLORS, borderColor: '#1e1e2e', borderWidth: 3 }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'right', labels: { color: '#cdd6f4', padding: 12, font: { size: 11 } } } },
                    cutout: '65%',
                },
            });
        }

        destroyChart('woBilledChart');
        const wbCtx = document.getElementById('woBilledChart')?.getContext('2d');
        if (wbCtx) {
            const woSectors = Object.keys(data.wosBySector).sort((a, b) => data.wosBySector[b].billed - data.wosBySector[a].billed);
            chartsRef.current.woBilledChart = new Chart(wbCtx, {
                type: 'bar',
                data: {
                    labels: woSectors,
                    datasets: [
                        { label: 'Billed (₹)', data: woSectors.map(s => data.wosBySector[s].billed), backgroundColor: '#00C9FF', borderRadius: 6 },
                        { label: 'Receivable (₹)', data: woSectors.map(s => data.wosBySector[s].receivable), backgroundColor: '#FF6B6B', borderRadius: 6 },
                    ],
                },
                options: chartOptions(),
            });
        }
    };

    if (loading) return (
        <div className="dash-loading">
            <div className="spin-ring" />
            <p style={{ color: 'var(--text3)', marginTop: 12, fontSize: 13 }}>Fetching live Monday.com data…</p>
        </div>
    );

    if (error) return (
        <div className="dash-loading">
            <AlertTriangle size={28} color="var(--red)" />
            <p style={{ color: 'var(--red)', marginTop: 8, fontSize: 13 }}>{error}</p>
        </div>
    );

    const { kpis, dataQuality, lastUpdated } = data;

    return (
        <>
            <Script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" onReady={() => setScriptReady(true)} />
            <div className="dashboard">

                {/* Header */}
                <div className="dash-header">
                    <div>
                        <div className="dash-header-row">
                            <BarChart2 size={20} color="var(--blue)" strokeWidth={2} />
                            <h1 className="dash-title">Business Dashboard</h1>
                        </div>
                        <p className="dash-sub">Live data from Monday.com · Updated {new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        {(dataQuality.dealsWithMissingValue > 0 || dataQuality.wosWithMissingAmount > 0) && (
                            <div className="data-quality-badge">
                                <AlertTriangle size={12} />
                                {dataQuality.dealsWithMissingValue} deals &amp; {dataQuality.wosWithMissingAmount} WOs have missing values
                            </div>
                        )}
                        <button className={`dash-refresh-btn ${refreshing ? 'spinning' : ''}`} onClick={() => load(true)}>
                            <RefreshCw size={14} strokeWidth={2} />
                            {refreshing ? 'Refreshing…' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="kpi-grid">
                    {KPI_DEFS.map(({ key, label, sub, Icon, color, fmt }) => (
                        <div key={key} className={`kpi-card kpi-${color}`}>
                            <div className={`kpi-icon-box kpi-icon-${color}`}>
                                <Icon size={16} strokeWidth={2} />
                            </div>
                            <div className="kpi-value">{fmt(kpis[key])}</div>
                            <div className="kpi-label">{label}</div>
                            <div className="kpi-sub">{sub(kpis)}</div>
                        </div>
                    ))}
                </div>

                {/* Charts */}
                <div className="chart-grid">
                    <div className="chart-card wide">
                        <div className="chart-title-row">
                            <TrendingUp size={14} strokeWidth={2} color="var(--blue)" />
                            <span className="chart-title">Open Pipeline vs Won Revenue by Sector</span>
                        </div>
                        <div className="chart-wrap"><canvas id="sectorChart" /></div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-title-row">
                            <Activity size={14} strokeWidth={2} color="var(--blue)" />
                            <span className="chart-title">Deal Stage Distribution</span>
                        </div>
                        <div className="chart-wrap"><canvas id="stageChart" /></div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-title-row">
                            <ClipboardList size={14} strokeWidth={2} color="var(--blue)" />
                            <span className="chart-title">Work Order Execution Status</span>
                        </div>
                        <div className="chart-wrap chart-wrap-sm"><canvas id="woStatusChart" /></div>
                    </div>

                    <div className="chart-card wide">
                        <div className="chart-title-row">
                            <CreditCard size={14} strokeWidth={2} color="var(--blue)" />
                            <span className="chart-title">Billed vs Receivable by Sector</span>
                        </div>
                        <div className="chart-wrap"><canvas id="woBilledChart" /></div>
                    </div>
                </div>

                {/* Top WOs Table */}
                <div className="chart-card">
                    <div className="chart-title-row" style={{ marginBottom: 16 }}>
                        <ClipboardList size={14} strokeWidth={2} color="var(--blue)" />
                        <span className="chart-title">Top Work Orders by Contract Value</span>
                    </div>
                    <div className="dash-table-wrapper">
                        <table className="dash-table">
                            <thead>
                                <tr><th>Work Order</th><th>Sector</th><th>Status</th><th>Contract Value</th><th>Receivable</th></tr>
                            </thead>
                            <tbody>
                                {data.recentWOs.map((w, i) => (
                                    <tr key={i}>
                                        <td>{w.name}</td>
                                        <td><span className="sector-tag">{w.sector || '—'}</span></td>
                                        <td><span className={`status-tag ${statusClass(w.status)}`}>{w.status || '—'}</span></td>
                                        <td>{INR(w.value)}</td>
                                        <td style={{ color: w.receivable > 0 ? 'var(--red)' : 'var(--emerald)' }}>{INR(w.receivable)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </>
    );
}

// ── shared chart options ──────────────────────────────────────────────────────
function chartOptions(yFmt = true) {
    return {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#cdd6f4', font: { size: 11 } } } },
        scales: {
            x: { ticks: { color: '#a6adc8', font: { size: 11 } }, grid: { color: '#313244' } },
            y: yFmt ? {
                ticks: {
                    color: '#a6adc8', font: { size: 11 },
                    callback: v => v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(0)}L` : v,
                },
                grid: { color: '#313244' },
            } : { ticks: { color: '#a6adc8', font: { size: 11 } }, grid: { display: false } },
        },
    };
}

function statusClass(s = '') {
    const l = s.toLowerCase();
    if (l.includes('complet')) return 'status-green';
    if (l.includes('ongoing') || l.includes('progress')) return 'status-blue';
    if (l.includes('pause') || l.includes('stuck')) return 'status-red';
    return 'status-gray';
}
