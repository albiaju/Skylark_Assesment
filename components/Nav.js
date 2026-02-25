'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, LayoutDashboard, Zap } from 'lucide-react';

export default function Nav() {
    const path = usePathname();
    return (
        <nav className="top-nav">
            <div className="nav-brand">
                <div className="nav-logo-box">
                    <Zap size={16} strokeWidth={2.5} />
                </div>
                <span className="nav-name">Skylark BI</span>
            </div>
            <div className="nav-links">
                <Link href="/" className={`nav-link ${path === '/' ? 'active' : ''}`}>
                    <MessageSquare size={14} strokeWidth={2} />
                    Chat
                </Link>
                <Link href="/dashboard" className={`nav-link ${path === '/dashboard' ? 'active' : ''}`}>
                    <LayoutDashboard size={14} strokeWidth={2} />
                    Dashboard
                </Link>
            </div>
            <div className="nav-tag">ARIA · Powered by Gemini</div>
        </nav>
    );
}
