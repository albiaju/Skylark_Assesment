import './globals.css';
import Nav from '@/components/Nav';

export const metadata = {
    title: 'Skylark BI Agent — Powered by Gemini AI',
    description: 'Business intelligence agent for Skylark Drones — query your Monday.com boards conversationally.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body>
                <Nav />
                <main className="main-content">{children}</main>
            </body>
        </html>
    );
}

