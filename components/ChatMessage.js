'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import { User, Bot, Copy, Check, FileText } from 'lucide-react';

export default function ChatMessage({ message }) {
    const [copied, setCopied] = useState(false);
    const isUser = message.role === 'user';
    const isError = message.isError;

    // Detect if this is a structured leadership report
    const isReport = !isUser && message.content.includes('## 📊 Executive Summary');
    // Clean up the [LEADERSHIP UPDATE MODE] tag for display if it's there
    const cleanContent = message.content.replace(/^\[LEADERSHIP UPDATE MODE\]\s*/, '');

    const handleCopy = () => {
        navigator.clipboard.writeText(cleanContent).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const time = message.timestamp
        ? new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <div className={`message ${isUser ? 'user' : 'ai'} ${isReport ? 'report-wrapper' : ''}`}>
            <div className={`msg-avatar ${isUser ? 'user' : 'ai'}`}>
                {isUser ? <User size={16} strokeWidth={2.5} /> : <Bot size={16} strokeWidth={2.5} />}
            </div>
            <div className="msg-content">
                {isReport && (
                    <div className="report-badge">
                        <FileText size={12} strokeWidth={2} />
                        EXECUTIVE REPORT
                    </div>
                )}
                <div className={`msg-bubble ${isError ? 'error' : ''} ${isReport ? 'report-bubble' : ''}`} style={{ wordBreak: 'break-word' }}>
                    {isUser ? (
                        <p style={{ margin: 0 }}>{cleanContent}</p>
                    ) : (
                        <div className="markdown-container">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {cleanContent}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
                {!isUser && !isError && (
                    <button className="copy-btn" onClick={handleCopy} title="Copy response">
                        {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} strokeWidth={2} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                )}
                {time && <div className="msg-time">{time}</div>}
            </div>
        </div>
    );
}
