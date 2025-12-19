import { Message } from '../types';

const WS_URL = 'ws://localhost:8000/ws/chat';

class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandler: ((msg: string) => void) | null = null;
  private userId: string = 'guest';

  connect(userId: string, sessionId: string, onMessage: (msg: string) => void) {
    this.userId = userId;
    this.messageHandler = onMessage;
    this.ws = new WebSocket(`${WS_URL}/${userId}/${sessionId}`);

    this.ws.onopen = () => {
      console.log('Connected to Chat WebSocket');
    };

    this.ws.onmessage = (event) => {
      if (this.messageHandler) {
        this.messageHandler(event.data);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from Chat WebSocket');
      // Optional: Reconnect logic
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };
  }

  sendMessage(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(text);
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const webSocketService = new WebSocketService();
