import { createContext, useContext, useState, useRef } from 'react';
import { Platform } from 'react-native';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { Ivschat } from '@aws-sdk/client-ivschat';
import { type Schema } from '../../amplify/data/resource';
import { ivsConfig } from '../config/ivs';
import NetInfo from '@react-native-community/netinfo';
import { z } from 'zod';

// Use different WebSocket implementations based on platform
const WebSocketClass = Platform.select({
  web: () => window.WebSocket,
  default: () => require('react-native-websocket').default,
})();

// Add these constants
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

const MessageSchema = z.object({
  id: z.string(),
  type: z.literal("MESSAGE"),
  content: z.string(),
  attributes: z.object({
    senderId: z.string(),
    clientTimestamp: z.number()
  }),
  serverTimestamp: z.number()
});

type ChatMessage = z.infer<typeof MessageSchema>;

type ChatRoom = {
  id: string;
  userId: string | null;
  roomArn: string | null;
  displayName: string | null;
  isActive: boolean | null;
  lastMessageAt: string | null;
  createdAt: string | null;
  owner: string | null;
  updatedAt: string;
};

type ChatContextType = {
  messages: ChatMessage[];
  joinRoom: (roomArn: string, user: {id: string, username: string}) => Promise<void>;
  getUserChatRoom: (userId: string, displayName: string) => Promise<string>;
  listChannels: () => Promise<ChatRoom[]>;
  currentChannel: ChatRoom | null;
  sendMessage: (content: string) => Promise<void>;
  isConnected: boolean;
};

const ChatContext = createContext<ChatContextType>({} as ChatContextType);

// Update WebSocketEvent type
type WebSocketEvent = {
  data: string;
  type: string;
  target: WebSocket;
} & Event;

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChannel, setCurrentChannel] = useState<ChatRoom | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socket = useRef<any>(null);
  const client = generateClient<Schema>();

  const getUserChatRoom = async (userId: string, displayName: string) => {
    try {
      const { credentials } = await fetchAuthSession();
      if (!credentials) throw new Error('No credentials available');

      const ivsClient = new Ivschat({
        region: 'us-east-1',
        credentials
      });

      // First try to get the existing room
      try {
        console.log('Checking if chat room exists:', ivsConfig.chatRoomArn);
        const room = await ivsClient.getRoom({
          identifier: ivsConfig.chatRoomArn
        });
        console.log('Found existing chat room:', room);
        return ivsConfig.chatRoomArn;
      } catch (error) {
        console.log('Chat room not found, creating new one');
        
        // Create a new room if it doesn't exist
        const response = await ivsClient.createRoom({
          name: `chat-room-${userId}`,
          maximumMessageLength: 500,
          maximumMessageRatePerSecond: 5,
          tags: {
            userId,
            displayName
          }
        });

        if (!response.arn) {
          throw new Error('Failed to create chat room');
        }

        console.log('Created new chat room:', response.arn);
        return response.arn;
      }
    } catch (error) {
      console.error('Failed to get/create chat room:', error);
      throw error;
    }
  };

  const listChannels = async () => {
    try {
      // Return a single channel based on our IVS stack
      return [{
        id: 'default',
        userId: null,
        roomArn: ivsConfig.chatRoomArn,
        displayName: 'Default Channel',
        isActive: true,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        owner: null,
        updatedAt: new Date().toISOString()
      }];
    } catch (error) {
      console.error('Failed to list channels:', error);
      return [];
    }
  };

  const connectWithRetry = async (ws: WebSocket, token: string): Promise<void> => {
    let attempts = 0;
    
    while (attempts < MAX_RETRY_ATTEMPTS) {
      try {
        return await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (ws && typeof ws.close === 'function') {
              ws.close();
            }
            reject(new Error(`Connection timeout on attempt ${attempts + 1}`));
          }, 10000);

          ws.onopen = (event: Event) => {
            clearTimeout(timeout);
            console.log(`WebSocket connected on attempt ${attempts + 1}:`, event);
            socket.current = ws;
            setIsConnected(true);
            
            // Send initial connection message
            ws.send(JSON.stringify({
              action: "CONNECT",
              requestId: Date.now().toString(),
            }));
            resolve();
          };
        });
      } catch (error) {
        attempts++;
        console.log(`Connection attempt ${attempts} failed:`, error);
        
        if (attempts === MAX_RETRY_ATTEMPTS) {
          throw new Error('Max retry attempts reached');
        }
        
        // Check network connectivity before retrying
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          throw new Error('No internet connection available');
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        
        // Create new WebSocket instance for retry
        const wsEndpoint = `${ivsConfig.webSocketEndpoint}/chat/connect`;
        console.log('Attempting WebSocket connection to constructed endpoint:', wsEndpoint);

        const ws = Platform.OS === 'web' 
          ? new WebSocketClass(wsEndpoint, [token])
          : new WebSocketClass(wsEndpoint, [token], {
              debug: true
            });
      }
    }
  };

  const joinRoom = async (roomArn: string, user: {id: string, username: string}) => {
    try {
      const { credentials } = await fetchAuthSession();
      if (!credentials) throw new Error('No credentials available');

      const ivsClient = new Ivschat({
        region: 'us-east-1',
        credentials
      });

      console.log('Getting chat token for room:', roomArn);
      const response = await ivsClient.createChatToken({
        roomIdentifier: roomArn,
        userId: user.id,
        capabilities: ["SEND_MESSAGE"],
        attributes: {
          "displayName": user.username,
        }
      });
      
      if (!response.token) throw new Error('No token received');
      console.log('Got chat token:', response.token.substring(0, 20) + '...');
      console.log('Session expiration:', response.sessionExpirationTime);
      console.log('Token expiration:', response.tokenExpirationTime);
      
      console.log('Attempting WebSocket connection to:', ivsConfig.webSocketEndpoint);
      console.log('Platform:', Platform.OS);

      const ws = Platform.OS === 'web' 
        ? new WebSocketClass(ivsConfig.webSocketEndpoint, [response.token])
        : new WebSocketClass(ivsConfig.webSocketEndpoint, [response.token], {
            debug: true
          });

      // Set up event handlers
      ws.onclose = (event: CloseEvent) => {
        console.log('WebSocket closed:', event);
        socket.current = null;
        setIsConnected(false);
      };

      ws.onerror = (event: Event) => {
        console.error('WebSocket error:', event);
        socket.current = null;
        setIsConnected(false);
      };

      ws.onmessage = (event: MessageEvent) => {
        console.log('WebSocket message received:', event);
        try {
          const msg = JSON.parse(event.data);
          setMessages(prev => [...prev, {
            id: msg.id,
            type: msg.type,
            content: msg.content,
            attributes: {
              senderId: msg.attributes.senderId,
              clientTimestamp: msg.attributes.clientTimestamp
            },
            serverTimestamp: msg.serverTimestamp
          }]);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      // Attempt connection with retry logic
      await connectWithRetry(ws, response.token);

    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  };

  const sendMessage = async (content: string) => {
    if (!socket.current || !isConnected) {
      throw new Error('Not connected to chat');
    }

    try {
      socket.current.send(JSON.stringify({
        action: 'SEND_MESSAGE',
        content,
        requestId: Date.now().toString(),
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  return (
    <ChatContext.Provider value={{ 
      messages, 
      joinRoom,
      getUserChatRoom,
      listChannels,
      currentChannel,
      sendMessage,
      isConnected
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);