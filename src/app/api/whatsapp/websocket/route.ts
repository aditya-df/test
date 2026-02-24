// app/api/whatsapp/websocket/route.ts
/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp-service';
import { WhatsAppWebSocketManager } from '@/lib/whatsapp-websocket';

// Since Next.js doesn't have built-in WebSocket support for API routes,
// this is a placeholder implementation. In production, you would typically
// use a separate WebSocket server or a library like Socket.IO

// For demonstration purposes, we'll create a simple HTTP endpoint
// that returns WebSocket connection information

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');

  try {
    // Get WhatsApp service instance
    const whatsappService = WhatsAppService.getInstance();
    const status = whatsappService.getStatus(agentId || undefined);

    // Return current WhatsApp status
    return new Response(
      JSON.stringify({
        message: 'WebSocket endpoint for WhatsApp QR updates',
        agentId: agentId || 'default',
        currentStatus: {
          isReady: status.isReady,
          qr: status.qr,
          isScanned: status.isReady,
          phoneNumber: status.isReady && status.info?.wid?.user ? status.info.wid.user : undefined,
          error: status.error,
          isInitializing: status.isInitializing,
          lastUpdated: new Date().toISOString()
        },
        note: 'This endpoint would be upgraded to WebSocket in production with a proper WebSocket server'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('Error in WebSocket route:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to get WhatsApp status',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');

  try {
    const body = await request.json();
    const { action, message } = body;

    const whatsappService = WhatsAppService.getInstance();
    const whatsappManager = WhatsAppWebSocketManager.getInstance();

    switch (action) {
      case 'initialize':
        if (agentId) {
          await whatsappService.initialize(agentId);
        } else {
          await whatsappService.initialize();
        }
        break;

      case 'restart':
        if (agentId) {
          await whatsappService.restart(agentId);
        } else {
          await whatsappService.restart();
        }
        break;

      case 'disconnect':
        if (agentId) {
          await whatsappService.disconnect(agentId);
        } else {
          await whatsappService.disconnect();
        }
        break;

      case 'send_message':
        if (!body.to || !message) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: to, message' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const result = await whatsappService.sendMessage(body.to, message, agentId || undefined);
        return new Response(
          JSON.stringify({ success: true, result }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Return updated status after action
    const status = whatsappService.getStatus(agentId || undefined);

    return new Response(
      JSON.stringify({
        success: true,
        action,
        agentId: agentId || 'default',
        status: {
          isReady: status.isReady,
          qr: status.qr,
          isScanned: status.isReady,
          phoneNumber: status.isReady && status.info?.wid?.user ? status.info.wid.user : undefined,
          error: status.error,
          isInitializing: status.isInitializing,
          lastUpdated: new Date().toISOString()
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );

  } catch (error) {
    console.error('Error in WebSocket POST route:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}