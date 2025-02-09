import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Button
} from 'react-native';
import { useChat } from '../providers/ChatProvider';
import { getCurrentUser } from 'aws-amplify/auth';
import { Ionicons } from '@expo/vector-icons';
import { ivsConfig } from '../config/ivs';

type ChatViewProps = {
  channel: {
    roomArn: string;
    displayName: string;
  };
  onBack: () => void;
  showHeader?: boolean;
  isFullscreen?: boolean;
};

export default function ChatView({ channel, onBack, showHeader = true, isFullscreen }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { joinRoom, sendMessage, messages, isConnected, loadRecentMessages } = useChat();
  const scrollViewRef = useRef<ScrollView>(null);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000; // 3 seconds
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    console.log('Connecting to channel:', {
      channelArn: ivsConfig.channelArn,
      chatRoomArn: ivsConfig.chatRoomArn,
      playbackUrl: ivsConfig.playbackUrl
    });
    connectToChannel();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [channel.roomArn]);

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRIES) {
      setConnectionError('Unable to connect to chat after multiple attempts');
      return;
    }

    try {
      setConnectionError('Attempting to reconnect...');
      await connectToChannel();
      setConnectionError(null);
      setRetryCount(0);
    } catch (err) {
      console.error('Chat retry attempt failed:', err);
      setRetryCount(prev => prev + 1);
      retryTimeoutRef.current = setTimeout(handleRetry, RETRY_DELAY);
    }
  };

  const connectToChannel = async () => {
    try {
      const user = await getCurrentUser();
      if (!user.userId) {
        throw new Error('User ID is required');
      }
      await joinRoom(channel.roomArn, {
        id: user.userId,
        username: `Guest${user.userId.slice(-5)}`
      });
      setError(null);
      setConnectionError(null);
    } catch (error) {
      console.error('Failed to connect to channel:', error);
      if (error instanceof Error && error.message.includes('Network')) {
        setConnectionError('Network connection lost. Retrying...');
        retryTimeoutRef.current = setTimeout(handleRetry, RETRY_DELAY);
      } else {
        setError('Failed to connect to chat');
      }
    }
  };

  const handleSend = async () => {
    if (!isConnected) {
      setConnectionError('Not connected to chat. Attempting to reconnect...');
      await handleRetry();
      return;
    }

    try {
      await sendMessage(message);
      setMessage('');
      setError(null);
      setConnectionError(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      if (error instanceof Error && error.message.includes('Network')) {
        setConnectionError('Network error. Message not sent. Retrying connection...');
        handleRetry();
      } else {
        setError('Failed to send message');
      }
    }
  };

  // Create a map of unique messages based on id and content
  const uniqueMessages = messages.reduce((acc, msg) => {
    const key = `${msg.id}-${msg.content}`;
    if (!acc.has(key)) {
      acc.set(key, msg);
    }
    return acc;
  }, new Map());

  return (
    <KeyboardAvoidingView 
      style={[
        styles.container,
        isFullscreen && styles.containerFullscreen
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {showHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={isFullscreen ? "white" : "black"} />
          </TouchableOpacity>
          <Text style={[styles.channelName, isFullscreen && styles.textWhite]}>
            {channel.displayName}
          </Text>
          <Text style={[
            styles.status, 
            { color: connectionError ? 'red' : (isConnected ? 'green' : 'red') }
          ]}>
            {connectionError ? 'Reconnecting' : (isConnected ? 'Connected' : 'Disconnected')}
          </Text>
        </View>
      )}
      
      <ScrollView 
        ref={scrollViewRef}
        style={[styles.messages, !showHeader && styles.messagesNoHeader]}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {Array.from(uniqueMessages.values()).map((msg) => (
          <View key={`${msg.id}-${msg.content}`} style={[
            styles.message,
            isFullscreen && styles.messageFullscreen
          ]}>
            <Text style={[styles.sender, isFullscreen && styles.textWhite]}>
              {msg.attributes.displayName || 
                (msg.attributes.senderId ? 
                  `Guest${msg.attributes.senderId.slice(-5)}` : 
                  'Guest'
                )
              }:
            </Text>
            <Text style={[styles.content, isFullscreen && styles.textWhite]}>
              {msg.content}
            </Text>
          </View>
        ))}
      </ScrollView>

      {(error || connectionError) && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || connectionError}</Text>
          {connectionError && (
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleRetry}
            >
              <Text style={styles.retryButtonText}>Retry Now</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={[styles.inputContainer, isFullscreen && styles.inputContainerFullscreen]}>
        <TextInput
          style={[styles.input, isFullscreen && styles.inputFullscreen]}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor={isFullscreen ? "#999" : "#666"}
          editable={isConnected && !connectionError}
        />
        <Button 
          title="Send" 
          onPress={handleSend}
          disabled={!isConnected || !message.trim() || Boolean(connectionError)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerFullscreen: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  channelName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  messages: {
    flex: 1,
    padding: 10,
  },
  message: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  sender: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  content: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  status: {
    marginLeft: 'auto',
    fontWeight: 'bold',
  },
  messagesNoHeader: {
    paddingTop: 0,
  },
  messageFullscreen: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  textWhite: {
    color: '#fff',
  },
  inputContainerFullscreen: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputFullscreen: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
  },
}); 