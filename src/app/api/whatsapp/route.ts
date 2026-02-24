// app/api/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import whatsappService from '@/lib/whatsapp-service';

interface SendMessageRequest {
    to: string;
    message: string;
}

export async function GET(request: Request): Promise<NextResponse> {
    // Disable WhatsApp API temporarily
    if (process.env.NEXT_PUBLIC_USING_WHATSAPP !== 'true') {
        return NextResponse.json(
            { error: 'WhatsApp service is temporarily disabled' },
            { status: 503 }
        );
    }

    try {
        // Get agentId from query parameters
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('agentId');

        // Initialize the WhatsApp service if not already initialized
        if (agentId) {
            await whatsappService.initialize(agentId);
            // Get the current status for specific agent
            const status = whatsappService.getStatus(agentId);

            return NextResponse.json({
                status: status.isReady ? 'ready' : (status.isInitializing ? 'initializing' : 'disconnected'),
                qr: status.qr,
                info: status.info,
                isScanned: status.isReady, // Directly use the ready status
                phoneNumber: status.isReady ? status.info?.wid?.user : undefined,
                lastUpdated: new Date().toISOString(),
                error: status.error,
                agentId: agentId
            });
        } else {
            // Legacy behavior without agentId
            await whatsappService.initialize();
            const status = whatsappService.getStatus();

            return NextResponse.json({
                status: status.isReady ? 'ready' : (status.isInitializing ? 'initializing' : 'disconnected'),
                qr: status.qr,
                info: status.info,
                isScanned: status.isReady, // Directly use the ready status
                phoneNumber: status.isReady ? status.info?.wid?.user : undefined,
                lastUpdated: new Date().toISOString(),
                error: status.error
            });
        }
    } catch (error: any) {
        console.error('Error in GET /api/whatsapp:', error);
        return NextResponse.json(
            {
                status: 'error',
                error: error.message || 'Failed to initialize WhatsApp service',
                isScanned: false,
                lastUpdated: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (process.env.NEXT_PUBLIC_USING_WHATSAPP !== 'true') {
        return NextResponse.json(
            { error: 'WhatsApp service is temporarily disabled' },
            { status: 503 }
        );
    }
    try {
        const body: SendMessageRequest = await request.json();
        const { to, message } = body;

        if (!to || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: to, message' },
                { status: 400 }
            );
        }

        // Check if the service is ready
        const status = whatsappService.getStatus();
        if (!status.isReady) {
            return NextResponse.json(
                { error: 'WhatsApp client not ready. Please wait for initialization.' },
                { status: 400 }
            );
        }

        // Send the message
        await whatsappService.sendMessage(to, message);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error in POST /api/whatsapp:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send message' },
            { status: 500 }
        );
    }
}