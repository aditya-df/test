
/**
 * WebSocket connection interface
 */

export interface WebSocketRequest {
  url: string | URL;
  headers: Record<string, string>;
}

export interface WebSocketConnection {
  socket: WebSocket;
  request: WebSocketRequest;
}

/**
 * A handler for WebSocket connections in Next.js App Router
 */
export class WebSocketHandler {
  private connections = new Set<WebSocketConnection>();
  private messageHandlers: ((ws: WebSocket, req: WebSocketRequest) => void)[] = [];

  // Add a connection handler (this would be called when WebSocket upgrades)
  onConnection(handler: (ws: WebSocket, req: WebSocketRequest) => void) {
    this.messageHandlers.push(handler);
  }

  // Simulate adding a connection (in real implementation, this would be automatic)
  addConnection(ws: WebSocket, req: WebSocketRequest) {
    const connection = { socket: ws, request: req };
    this.connections.add(connection);

    // Call all registered handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(ws, req);
      } catch (error) {
        console.error('WebSocket handler error:', error);
      }
    });

    // Clean up on close
    ws.addEventListener('close', () => {
      this.connections.delete(connection);
    });
  }

  // Get all active connections
  getConnections(): WebSocketConnection[] {
    return Array.from(this.connections);
  }

  // Broadcast message to all connections
  broadcast(message: string | object) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    this.connections.forEach(({ socket }) => {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(messageStr);
        } catch (error) {
          console.error('Failed to send WebSocket message:', error);
        }
      }
    });
  }

  // Close all connections
  close() {
    this.connections.forEach(({ socket }) => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        try {
          socket.close();
        } catch (error) {
          console.error('Failed to close WebSocket:', error);
        }
      }
    });
    this.connections.clear();
  }
}

/**
 * WebSocketPair class for Next.js Edge Runtime
 * This is a polyfill for the WebSocketPair API
 */
// class WebSocketPair {
//   private readonly pair: [WebSocket, WebSocket];

//   constructor() {
//     // In a real implementation, this would create a pair of connected WebSockets
//     // For now, we're creating a mock implementation
//     const client = {
//       send: (data: string) => {
//         if (server.onmessage) server.onmessage({ data });
//       },
//       close: () => {
//         if (server.onclose) server.onclose();
//       },
//       onmessage: null as any,
//       onclose: null as any
//     };

//     const server = {
//       send: (data: string) => {
//         if (client.onmessage) client.onmessage({ data });
//       },
//       close: () => {
//         if (client.onclose) client.onclose();
//       },
//       onmessage: null as any,
//       onclose: null as any
//     };

//     this.pair = [client as unknown as WebSocket, server as unknown as WebSocket];
//   }

//   get 0() {
//     return this.pair[0];
//   }

//   get 1() {
//     return this.pair[1];
//   }
// }