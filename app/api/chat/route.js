import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent.js';

export async function POST(request) {
    try {
        const { messages } = await request.json();
        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
        }
        const response = await runAgent(messages);
        return NextResponse.json({ response });
    } catch (error) {
        console.error('Chat API error:', error);

        // Friendly rate-limit message
        if (error.message?.includes('429') || error.message?.includes('quota')) {
            return NextResponse.json({
                error: '⏳ Gemini API rate limit hit. The agent will automatically retry. Please wait ~60 seconds and try again.\n\n*Tip: Board data is cached for 5 minutes, so subsequent queries will be faster.*',
            }, { status: 429 });
        }

        return NextResponse.json({ error: `Agent error: ${error.message}` }, { status: 500 });
    }
}
