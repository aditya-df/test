import { prisma } from '@/config/db'
import { NextRequest } from 'next/server'

// Function to verify session token with backend
async function verifySessionToken(sessionToken: string) {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
        const response = await fetch(`${backendUrl}/v1/session/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session_token: sessionToken }),
        });

        if (!response.ok) {
            console.log("Session token verification failed:", response.status);
            return null;
        }

        const sessionData = await response.json();
        
        if (!sessionData.data || !sessionData.data.agent_id) {
            console.log("Invalid session data received");
            return null;
        }

        // Get agent details from the database
        const agent = await prisma.agent.findFirst({
            where: {
                id: sessionData.data.agent_id,
            },
        });

        return agent;
    } catch (error) {
        console.error("Error verifying session token:", error);
        return null;
    }
}

// Legacy function for backward compatibility
async function verifyAgentToken(token: string) {
    try {
        const agent = await prisma.agent.findFirst({ 
            where: { token: token } 
        });
        return agent;
    } catch (error) {
        console.error("Error verifying agent token:", error);
        return null;
    }
}

//  Path: src\app\api\agent\sdk\[token]\route.ts
export async function GET(req: NextRequest, params: { params: Promise<{ token: string }> }) {
    const { token } = await params.params

    let agent;
    
    // Check if token is a session token (starts with 'sess_') or legacy agent token
    if (token.startsWith('sess_')) {
        // Use session token verification
        agent = await verifySessionToken(token);
    } else {
        // Legacy agent token verification (for backward compatibility)
        agent = await verifyAgentToken(token);
    }

    if (!agent) {
        return Response.json({ 
            data: null,
            error: token.startsWith('sess_') ? 'Invalid or expired session token' : 'Invalid agent token'
        }, { status: 401 });
    }

    return Response.json({ data: agent })
}