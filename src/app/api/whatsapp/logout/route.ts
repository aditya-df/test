import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp-service';

export async function POST(request: NextRequest) {
  try {
    // Get agentId from query parameters
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agentId');
    
    const whatsappService = WhatsAppService.getInstance();
    
    // Logout from WhatsApp
    await whatsappService.logout(agentId || undefined);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully logged out from WhatsApp' 
    });
  } catch (error) {
    console.error('Error logging out from WhatsApp:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}