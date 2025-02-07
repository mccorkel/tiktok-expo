import { createContext, useContext, useState, useRef } from 'react';
import { WebSocket, WebSocketMessageEvent } from 'react-native-websocket';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { Ivschat } from '@aws-sdk/client-ivschat';
import { type Schema } from '../../amplify/data/resource';

type ChatMessage = {
  id: string;
  content: string;
  senderId: string;
  timestamp: number;
};

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
  joinRoom: (roomArn: string, user: {id: string, username: string}) => Promise<WebSocket>;
  getUserChatRoom: (userId: string, displayName: string) => Promise<string>;
  listChannels: () => Promise<ChatRoom[]>;
  currentChannel: ChatRoom | null;
  sendMessage: (content: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextType>({} as ChatContextType);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChannel, setCurrentChannel] = useState<ChatRoom | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const client = generateClient<Schema>();

  const createUserChatRoom = async (userId: string, displayName: string) => {
    try {
      // First check for existing room
      const existingRooms = await client.models.ChatRoom.list({
        filter: { userId: { eq: userId }, isActive: { eq: true } }
      });

      if (existingRooms.data.length > 0 && existingRooms.data[0].roomArn) {
        return existingRooms.data[0].roomArn;
      }

      // Create new room if none exists
      const { credentials } = await fetchAuthSession();
      if (!credentials) throw new Error('No credentials available');

      const ivsClient = new Ivschat({
        region: 'us-west-2',
        credentials
      });

      // Create room with unique ID
      const roomId = `${userId}-${Date.now()}`;
      const response = await ivsClient.createRoom({
        name: roomId,
        maximumMessageLength: 500,
        maximumMessageRatePerSecond: 5
      });

      console.log('IVS Create Room Response:', response);

      if (!response || !response.arn) {
        console.error('Invalid response:', response);
        throw new Error('Invalid response from IVS Chat');
      }

      // Save room info
      await client.models.ChatRoom.create({
        userId,
        roomArn: response.arn,
        createdAt: new Date().toISOString(),
        isActive: true,
        displayName,
        lastMessageAt: new Date().toISOString(),
      });

      return response.arn;
    } catch (error) {
      console.error('Failed to create chat room:', error);
      throw error;
    }
  };

  const joinRoom = async (roomArn: string, user: {id: string, username: string}) => {
    try {
      const { credentials } = await fetchAuthSession();
      if (!credentials) throw new Error('No credentials available');

      const ivsClient = new Ivschat({
        region: 'us-west-2',
        credentials
      });

      const response = await ivsClient.createChatToken({
        roomIdentifier: roomArn,
        userId: user.id,
        attributes: {
          'display-name': user.username
        }
      });
      
      if (!response.token) throw new Error('No token received');
      
      const ws = new WebSocket(`wss://edge.ivschat.us-west-2.amazonaws.com`, [response.token]);
      
      ws.onopen = () => {
        socket.current = ws;
      };

      ws.onmessage = (event: WebSocketMessageEvent) => {
        const msg = JSON.parse(event.data);
        setMessages(prev => [...prev, {
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          timestamp: Date.now()
        }]);
      };

      return ws;
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  };

  const getUserChatRoom = async (userId: string, displayName: string) => {
    try {
      // First check if user already has a room
      const existingRooms = await client.models.ChatRoom.list({
        filter: { userId: { eq: userId }, isActive: { eq: true } }
      });

      if (existingRooms.data.length > 0 && existingRooms.data[0].roomArn) {
        return existingRooms.data[0].roomArn;
      }

      // If no room exists, create one
      return await createUserChatRoom(userId, displayName);
    } catch (error) {
      console.error('Failed to get chat room:', error);
      throw error;
    }
  };

  const listChannels = async () => {
    try {
      const response = await client.models.ChatRoom.list({
        filter: { isActive: { eq: true } }
      });
      return response.data.filter((room): room is Required<ChatRoom> => 
        !!room.userId && 
        !!room.roomArn && 
        !!room.displayName && 
        !!room.isActive && 
        !!room.lastMessageAt &&
        !!room.createdAt
      );
    } catch (error) {
      console.error('Failed to list channels:', error);
      return [];
    }
  };

  const sendMessage = async (content: string) => {
    if (!socket.current) {
      throw new Error('Not connected to chat');
    }

    try {
      (socket.current as any).send(JSON.stringify({
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
      sendMessage
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);