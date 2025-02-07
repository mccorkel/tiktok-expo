declare module 'react-native-websocket' {
  export class WebSocket {
    constructor(url: string, protocols?: string[]);
    onopen: (event: WebSocketMessageEvent) => void;
    onmessage: (event: WebSocketMessageEvent) => void;
    onclose: (event: WebSocketMessageEvent) => void;
    onerror: (event: WebSocketMessageEvent) => void;
  }

  export interface WebSocketMessageEvent {
    data: string;
    type: string;
    target: WebSocket;
  }
} 