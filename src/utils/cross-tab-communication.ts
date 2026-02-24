/**
 * Cross-Tab Communication Utility
 * 
 * A reusable utility for handling communication between browser tabs
 * using localStorage and storage events.
 */

export interface TabEventData<T = any> {
  type: string;
  id: string;
  timestamp: number;
  payload?: T;
}

export interface CrossTabOptions {
  storageKey?: string;
  generateTabId?: () => string;
}

export interface TabEventHandler<T = any> {
  (data: TabEventData<T>, event: StorageEvent): void;
}

/**
 * Cross-tab communication manager
 */
export class CrossTabCommunication {
  private tabId: string;
  private storageKey: string;
  private eventHandlers: Map<string, Set<TabEventHandler>> = new Map();
  private isListening: boolean = false;

  constructor(options: CrossTabOptions = {}) {
    this.storageKey = options.storageKey || 'tab-event';
    this.tabId = options.generateTabId ? options.generateTabId() : crypto.randomUUID();
    
    this.handleStorageEvent = this.handleStorageEvent.bind(this);
  }

  /**
   * Get the current tab ID
   */
  getTabId(): string {
    return this.tabId;
  }

  /**
   * Send data to other tabs
   */
  broadcast<T = any>(type: string, payload?: T): void {
    const eventData: TabEventData<T> = {
      type,
      id: this.tabId,
      timestamp: Date.now(),
      payload,
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(eventData));
    } catch (error) {
      console.error('Failed to broadcast tab event:', error);
    }
  }

  /**
   * Listen for events from other tabs
   */
  on<T = any>(eventType: string, handler: TabEventHandler<T>): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    this.eventHandlers.get(eventType)!.add(handler);
    
    // Start listening if not already
    if (!this.isListening) {
      this.startListening();
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType);
        }
      }
      
      // Stop listening if no more handlers
      if (this.eventHandlers.size === 0) {
        this.stopListening();
      }
    };
  }

  /**
   * Remove all event listeners for a specific type
   */
  off(eventType: string): void {
    this.eventHandlers.delete(eventType);
    
    if (this.eventHandlers.size === 0) {
      this.stopListening();
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.eventHandlers.clear();
    this.stopListening();
  }

  /**
   * Set up automatic broadcasting on tab close
   */
  broadcastOnClose<T = any>(eventType: string = 'CLOSING', payload?: T): () => void {
    const broadcastClose = () => {
      this.broadcast(eventType, payload);
    };

    window.addEventListener('beforeunload', broadcastClose);
    window.addEventListener('pagehide', broadcastClose);

    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', broadcastClose);
      window.removeEventListener('pagehide', broadcastClose);
    };
  }

  /**
   * Start listening for storage events
   */
  private startListening(): void {
    if (!this.isListening) {
      window.addEventListener('storage', this.handleStorageEvent);
      this.isListening = true;
    }
  }

  /**
   * Stop listening for storage events
   */
  private stopListening(): void {
    if (this.isListening) {
      window.removeEventListener('storage', this.handleStorageEvent);
      this.isListening = false;
    }
  }

  /**
   * Handle storage events
   */
  private handleStorageEvent(event: StorageEvent): void {
    if (event.key !== this.storageKey || !event.newValue) {
      return;
    }

    try {
      const data: TabEventData = JSON.parse(event.newValue);
      
      // Ignore events from the same tab
      if (data.id === this.tabId) {
        return;
      }

      // Call registered handlers for this event type
      const handlers = this.eventHandlers.get(data.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data, event);
          } catch (error) {
            console.error('Error in tab event handler:', error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to parse tab event data:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
  }
}

/**
 * Create a new cross-tab communication instance
 */
export function createCrossTabCommunication(options?: CrossTabOptions): CrossTabCommunication {
  return new CrossTabCommunication(options);
}

/**
 * Default instance for simple usage
 */
export const crossTabComm = createCrossTabCommunication();