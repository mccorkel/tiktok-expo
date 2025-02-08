import { createContext, useContext, useState, useRef } from 'react';
import { Platform } from 'react-native';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { Ivschat } from '@aws-sdk/client-ivschat';
import { type Schema } from '../../amplify/data/resource';
import { ivsConfig } from '../config/ivs';
import { z } from 'zod';
import { ChatRoom } from 'amazon-ivs-chat-messaging';

const MessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  attributes: z.object({
    senderId: z.string().optional(),
    displayName: z.string().optional(),
    clientTimestamp: z.string().or(z.number()).optional()
  }).optional().default({}),
  sender: z.object({
    userId: z.string(),
    attributes: z.record(z.string()).optional()
  }).optional()
}).passthrough();

type ChatMessage = z.infer<typeof MessageSchema>;

type ChatToken = {
  token: string;
  sessionExpirationTime: Date;
  tokenExpirationTime: Date;
};

type ChatRoomType = {
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
  listChannels: () => Promise<ChatRoomType[]>;
  currentChannel: ChatRoomType | null;
  sendMessage: (content: string) => Promise<void>;
  isConnected: boolean;
};

const ChatContext = createContext<ChatContextType>({} as ChatContextType);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<ChatRoomType | null>(null);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const client = generateClient<Schema>();

  const tokenProvider = async (user: {id: string, username: string}): Promise<ChatToken> => {
    const { credentials } = await fetchAuthSession();
    const ivsClient = new Ivschat({ region: 'us-east-1', credentials });
    
    const response = await ivsClient.createChatToken({
      roomIdentifier: ivsConfig.chatRoomArn,
      userId: user.id,
      capabilities: ["SEND_MESSAGE"],
      attributes: { displayName: user.username }
    });

    if (!response.token || !response.sessionExpirationTime || !response.tokenExpirationTime) {
      throw new Error('Invalid token response from IVS Chat');
    }

    return {
      token: response.token,
      sessionExpirationTime: response.sessionExpirationTime,
      tokenExpirationTime: response.tokenExpirationTime
    };
  };

  const joinRoom = async (roomArn: string, user: {id: string, username: string}) => {
    try {
      const chatRoom = new ChatRoom({
        regionOrUrl: 'us-east-1',
        tokenProvider: () => tokenProvider({
          id: user.id,
          username: user.username === 'Anonymous' ? `Guest${user.id.slice(-5)}` : user.username
        })
      });

      chatRoom.addListener('connecting', () => console.log('Connecting...'));
      chatRoom.addListener('connect', () => setIsConnected(true));
      chatRoom.addListener('disconnect', () => setIsConnected(false));
      chatRoom.addListener('message', (message: any) => {
        console.log('Raw message received:', JSON.stringify(message, null, 2));
        try {
          const parsedMessage = MessageSchema.parse(message);
          console.log('Parsed message:', parsedMessage);
          setMessages(prev => [...prev, parsedMessage]);
        } catch (error) {
          console.error('Failed to parse message:', error);
          console.error('Original message:', message);
        }
      });

      await chatRoom.connect();
      setRoom(chatRoom);
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  };

  const sendMessage = async (content: string) => {
    if (!room || !isConnected) {
      throw new Error('Not connected to chat');
    }

    try {
      const user = await getCurrentUser();
      if (!user.userId) {
        throw new Error('User ID is required');
      }
      
      // Fetch user's profile to get display name
      const { data: profiles } = await client.models.Profile.list({
        filter: {
          userId: { eq: user.userId }
        }
      });

      const guestId = `Guest${user.userId.slice(-5)}`;
      const displayName = profiles.length > 0 ? profiles[0].displayName : guestId;

      await room.sendMessage({
        action: 'SEND_MESSAGE',
        content,
        requestId: Date.now().toString(),
        attributes: {
          senderId: user.userId,
          displayName,
          clientTimestamp: Date.now().toString()
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const getUserChatRoom = async (userId: string, displayName: string) => {
    try {
      console.log('Getting chat room for user:', userId);
      return ivsConfig.chatRoomArn;
    } catch (error) {
      console.error('Failed to get chat room:', error);
      throw error;
    }
  };

  const listChannels = async () => {
    try {
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