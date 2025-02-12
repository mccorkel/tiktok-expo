import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Platform
} from 'react-native';
import { useChat } from '../providers/ChatProvider';
import { getCurrentUser } from 'aws-amplify/auth';
import { Ionicons } from '@expo/vector-icons';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

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
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { joinRoom, isConnected } = useChat();
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000; // 3 seconds
  const retryTimeoutRef = React.useRef<NodeJS.Timeout>();

  useEffect(() => {
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

  return (
    <View style={[
      styles.container,
      isFullscreen && styles.containerFullscreen
    ]}>
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
      
      <View style={styles.messagesContainer}>
        <ChatMessages isFullscreen={isFullscreen} />
      </View>

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

      <ChatInput isFullscreen={isFullscreen} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#000',
  },
  textWhite: {
    color: '#fff',
  },
  status: {
    marginLeft: 'auto',
    fontSize: 12,
  },
  messagesContainer: {
    flex: 1,
  },
  errorContainer: {
    padding: 10,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 