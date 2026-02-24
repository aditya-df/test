// lib/whatsapp-websocket.ts
// Move the WebSocket logic to a separate service file

export class WhatsAppWebSocketManager {
    private static instance: WhatsAppWebSocketManager;
    private connections: Set<WebSocket>; // Legacy connections
    private agentConnections: Map<string, Set<WebSocket>>; // Agent-specific connections

    private constructor() {
        this.connections = new Set();
        this.agentConnections = new Map();
    }

    static getInstance(): WhatsAppWebSocketManager {
        if (!WhatsAppWebSocketManager.instance) {
            WhatsAppWebSocketManager.instance = new WhatsAppWebSocketManager();
        }
        return WhatsAppWebSocketManager.instance;
    }

    // Add a new connection for an agent
    addConnection(agentIdOrWs: string | WebSocket, ws?: WebSocket) {
        // If only one parameter is provided, treat it as legacy behavior
        if (!ws) {
            this.connections.add(agentIdOrWs as WebSocket);
            return;
        }
        
        // Otherwise, add to agent-specific connections
        const agentId = agentIdOrWs as string;
        if (!this.agentConnections.has(agentId)) {
            this.agentConnections.set(agentId, new Set());
        }
        this.agentConnections.get(agentId)!.add(ws);
    }

    // Remove a connection
    removeConnection(agentIdOrWs: string | WebSocket, ws?: WebSocket) {
        // If only one parameter is provided, treat it as legacy behavior
        if (!ws) {
            this.connections.delete(agentIdOrWs as WebSocket);
            return;
        }
        
        // Otherwise, remove from agent-specific connections
        const agentId = agentIdOrWs as string;
        const connections = this.agentConnections.get(agentId);
        if (connections) {
            connections.delete(ws);
            if (connections.size === 0) {
                this.agentConnections.delete(agentId);
            }
        }
    }

    // Broadcast updates to connected clients
    broadcastWhatsAppUpdate(update: any, agentId?: string) {
        const message = {
            action: 'qr_update',
            ...update
        };

        // If agentId is provided, only broadcast to that agent's connections
        if (agentId) {
            const connections = this.agentConnections.get(agentId);
            if (connections) {
                message.agentId = agentId;
                connections.forEach(ws => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(message));
                    }
                });
            }
            return;
        }

        // Legacy behavior - broadcast to all connections
        this.connections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        });
    }
    
    // Simulate WhatsApp status updates
    simulateWhatsAppUpdates(agentId: string) {
        const connections = this.agentConnections.get(agentId);
        if (!connections || connections.size === 0) return;

        // Simulate different states
        const states = [
            { status: 'initializing', isScanned: false },
            { status: 'initializing', isScanned: true },
            { status: 'ready', isScanned: true, phoneNumber: '+1234567890' }
        ];

        let currentState = 0;
        const interval = setInterval(() => {
            if (currentState >= states.length) {
                clearInterval(interval);
                return;
            }

            const update = {
                action: 'qr_update',
                agentId,
                ...states[currentState]
            };

            connections.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(update));
                }
            });

            currentState++;
        }, 10000); // Update every 10 seconds
    }
}


// Usage example - how to use the service from other parts of your app:
// import { whatsappWebSocketService } from '@/lib/whatsapp-websocket';
// whatsappWebSocketService.broadcastWhatsAppUpdate(agentId, update);