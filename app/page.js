'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ChatMessage from '@/components/ChatMessage';
import {
    DollarSign, Trophy, AlertTriangle, Target, ClipboardList, CreditCard,
    RefreshCw, ArrowUpRight, Send, Trash2, BarChart2, Bot, X,
} from 'lucide-react';

const STORAGE_KEY = 'skylark_chat_messages';

const INR = (v) => {
    if (!v && v !== 0) return '—';
    if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
    if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
    return `₹${v.toLocaleString('en-IN')}`;
};

function getFollowUps(content = '') {
    const c = content.toLowerCase();
    if (c.includes('pipeline') || c.includes('deals')) return [
        'Break it down by sector →',
        'Which deals close this quarter?',
        'Show me deals in negotiations stage',
    ];
    if (c.includes('work order') || c.includes('execution')) return [
        'Which are stuck or paused?',
        "What's our total receivables?",
        'Show WOs by sector',
    ];
    if (c.includes('sector') || c.includes('mining') || c.includes('renew')) return [
        'Compare all sectors →',
        'Which sector has best win rate?',
        'Show work orders in this sector',
    ];
    if (c.includes('receivabl') || c.includes('collect') || c.includes('bill')) return [
        'Which clients owe the most?',
        "What's our collection rate?",
        'Show overdue work orders',
    ];
    if (c.includes('summary') || c.includes('executive') || c.includes('leadership')) return [
        'Deep dive on pipeline health',
        'Show me top risks',
        'What should we prioritize this week?',
    ];
    return [
        'Give me a business summary',
        'Which sectors are performing best?',
        'Show outstanding receivables',
    ];
}

const SUGGESTIONS = [
    'Give me a business summary — pipeline + operations',
    'What is our total open pipeline value?',
    'How are renewables deals performing?',
    'Which sectors have the most active work orders?',
    'Which work orders are stuck or paused?',
    'Prepare a leadership update on pipeline health',
    'How many deals are in negotiations stage?',
    'What is our total receivables amount?',
];

// ── Mini Sidebar Dashboard ───────────────────────────────────────────────────
const MINI_KPIS = [
    { key: 'totalPipeline', label: 'Open Pipeline', color: 'blue', Icon: DollarSign, fmt: (v) => INR(v) },
    { key: 'totalWon', label: 'Won Revenue', color: 'green', Icon: Trophy, fmt: (v) => INR(v) },
    { key: 'totalReceivable', label: 'Receivables', color: 'red', Icon: AlertTriangle, fmt: (v) => INR(v) },
    { key: 'winRate', label: 'Win Rate', color: 'purple', Icon: Target, fmt: (v) => v != null ? `${v}%` : 'N/A' },
    { key: 'openWOs', label: 'Open Work Orders', color: 'cyan', Icon: ClipboardList, fmt: (v, k) => `${v} / ${k.totalWOs} total` },
    { key: 'collectionRate', label: 'Collection Rate', color: 'teal', Icon: CreditCard, fmt: (v) => v != null ? `${v}%` : 'N/A' },
];

function MiniDashboard({ onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [spinning, setSpinning] = useState(false);

    const load = useCallback((bust = false) => {
        setSpinning(true);
        const url = bust ? `/api/dashboard?t=${Date.now()}` : '/api/dashboard';
        fetch(url)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); setSpinning(false); })
            .catch(() => { setLoading(false); setSpinning(false); });
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="mini-dash">
            <div className="mini-dash-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BarChart2 size={13} color="var(--blue)" strokeWidth={2} />
                    <span className="mini-dash-title">Live KPIs</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button className={`mini-refresh-btn${spinning ? ' spinning' : ''}`} onClick={() => load(true)} title="Refresh">
                        <RefreshCw size={13} strokeWidth={2} />
                    </button>
                    <Link href="/dashboard" className="mini-dash-link">
                        <ArrowUpRight size={12} strokeWidth={2} />
                        Full
                    </Link>
                    <button className="mini-close-btn" onClick={onClose} title="Close sidebar">
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="mini-dash-loading">
                    <div className="spin-ring" style={{ width: 24, height: 24, borderWidth: 2 }} />
                </div>
            ) : data ? (
                <div className="mini-kpi-list">
                    {MINI_KPIS.map(({ key, label, color, Icon, fmt }) => (
                        <div key={key} className={`mini-kpi mini-kpi-${color}`}>
                            <div className={`mini-kpi-icon-box mini-icon-${color}`}>
                                <Icon size={13} strokeWidth={2} />
                            </div>
                            <div className="mini-kpi-text">
                                <div className="mini-kpi-value">{fmt(data.kpis[key], data.kpis)}</div>
                                <div className="mini-kpi-label">{label}</div>
                            </div>
                        </div>
                    ))}
                    <div className="mini-updated">
                        Updated {new Date(data.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            ) : (
                <div className="mini-dash-loading" style={{ fontSize: 12, color: 'var(--red)' }}>Failed to load</div>
            )}
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [leadershipMode, setLeadershipMode] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setMessages(JSON.parse(saved));
        } catch { }
    }, []);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { }
    }, [messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleSend = async (text) => {
        const content = (text || input).trim();
        if (!content || loading) return;
        const finalContent = leadershipMode ? `[LEADERSHIP UPDATE MODE] ${content}` : content;
        const userMsg = { role: 'user', content: finalContent, timestamp: Date.now() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setLoading(true);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: Date.now() }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${err.message}`, isError: true, timestamp: Date.now() }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleTextareaInput = (e) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
    };

    const clearChat = () => {
        if (confirm('Clear all chat history?')) { setMessages([]); localStorage.removeItem(STORAGE_KEY); }
    };

    const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant' && !m.isError);
    const followUps = lastAiMsg ? getFollowUps(lastAiMsg.content) : [];

    return (
        <div className="chat-layout">
            {/* ── Chat Panel ── */}
            <div className="app">
                <div className="chat-topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="aria-avatar-sm">
                            <Bot size={14} strokeWidth={2} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>ARIA Chat</span>
                        {messages.length > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                                · {messages.filter(m => m.role === 'user').length} queries
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {messages.length > 0 && (
                            <button className="topbar-btn" onClick={clearChat} title="Clear chat">
                                <Trash2 size={13} strokeWidth={2} /> Clear
                            </button>
                        )}
                        <button
                            className={`topbar-btn${sidebarOpen ? ' active' : ''}`}
                            onClick={() => setSidebarOpen(o => !o)}
                        >
                            <BarChart2 size={13} strokeWidth={2} />
                            {sidebarOpen ? 'Hide KPIs' : 'Show KPIs'}
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="messages">
                    {messages.length === 0 && !loading ? (
                        <div className="empty-state">
                            <div>
                                <div className="empty-hero-box">
                                    <Bot size={32} strokeWidth={1.5} />
                                </div>
                                <div className="empty-title">Hello, I&apos;m ARIA</div>
                                <div className="empty-sub">
                                    Your AI business intelligence agent for Skylark Drones. Ask me anything about your deals pipeline, work orders, sectors, revenue, or receivables.
                                </div>
                            </div>
                            <div className="suggestions">
                                {SUGGESTIONS.map((s, i) => (
                                    <button key={i} className="suggestion-btn" onClick={() => handleSend(s)}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, i) => <ChatMessage key={i} message={msg} />)}
                            {loading && (
                                <div className="message ai">
                                    <div className="msg-avatar ai"><Bot size={16} strokeWidth={2} /></div>
                                    <div className="msg-content">
                                        <div className="typing-dots"><span /><span /><span /></div>
                                        <div className="typing-label">Querying Monday.com &amp; analysing data…</div>
                                    </div>
                                </div>
                            )}
                            {!loading && followUps.length > 0 && (
                                <div style={{ paddingLeft: 46 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Suggested follow-ups</div>
                                    <div className="followup-chips">
                                        {followUps.map((q, i) => (
                                            <button key={i} className="followup-chip" onClick={() => handleSend(q)}>{q}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="input-area">
                    <div className="mode-toggle">
                        <label className="toggle-switch" title="Leadership Update Mode">
                            <input type="checkbox" checked={leadershipMode} onChange={e => setLeadershipMode(e.target.checked)} />
                            <div className="toggle-track" />
                            <div className="toggle-thumb" />
                        </label>
                        <span style={{ color: leadershipMode ? 'var(--blue)' : 'var(--text3)', transition: 'color 0.2s' }}>
                            {leadershipMode ? 'Leadership Update Mode — ON' : 'Leadership Update Mode'}
                        </span>
                    </div>
                    <div className="input-row">
                        <textarea
                            ref={textareaRef}
                            className="input-box"
                            value={input}
                            onChange={handleTextareaInput}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about pipeline, revenue, sectors, work orders…"
                            rows={1}
                            disabled={loading}
                        />
                        <button className="send-btn" onClick={() => handleSend()} disabled={loading || !input.trim()} title="Send">
                            {loading
                                ? <div className="spin-ring" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                : <Send size={18} strokeWidth={2} />
                            }
                        </button>
                    </div>
                    <div className="input-hint">Enter to send · Shift+Enter for new line</div>
                </div>
            </div>

            {/* ── Mini Sidebar ── */}
            {sidebarOpen && (
                <>
                    <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
                    <MiniDashboard onClose={() => setSidebarOpen(false)} />
                </>
            )}
        </div>
    );
}
