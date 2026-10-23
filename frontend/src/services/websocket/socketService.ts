/**
 * LastPlate Real-Time WebSocket Client & Telemetry Service.
 * Provides resilient auto-reconnecting stream, channel subscriptions,
 * live toast integration, and courier GPS location transmission.
 */

type EventHandler = (payload: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private isConnecting = false;

  public isConnected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      this.connect();
    } else {
      this.disconnect();
    }
  }

  public connect() {
    if (this.ws || this.isConnecting || !this.token) return;
    this.isConnecting = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Connect to backend WebSocket endpoint
      const wsUrl = `${protocol}//127.0.0.1:8000/api/v1/ws/stream?token=${this.token}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connection_status', { connected: true });
        console.info('[WebSocket] Connected to LastPlate real-time stream.');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;
          const payload = data.payload || data;

          // Dispatch to specific event listeners
          this.emit(type, payload);
          // Dispatch to wildcard listener
          this.emit('*', data);
        } catch (e) {
          console.debug('[WebSocket] Error parsing inbound frame:', e);
        }
      };

      this.ws.onclose = (event) => {
        this.cleanup();
        this.emit('connection_status', { connected: false });
        console.info(`[WebSocket] Closed (code ${event.code}).`);
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.debug('[WebSocket] Transport error:', err);
        this.cleanup();
      };
    } catch (e) {
      this.cleanup();
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.cleanup();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private cleanup() {
    this.isConnecting = false;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  public subscribe(channel: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  }

  public sendCourierLocation(telemetry: {
    latitude: number;
    longitude: number;
    speed_kmh?: number;
    heading_deg?: number;
    route_id?: string;
    pickup_id?: string;
  }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'courier_location',
          payload: telemetry,
        })
      );
    }
  }

  public on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  public off(event: string, handler: EventHandler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, payload: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(payload);
        } catch (e) {
          console.error(`[WebSocket] Error in handler for event ${event}:`, e);
        }
      });
    }
  }
}

export const socketService = new SocketService();
