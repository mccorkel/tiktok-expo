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
};

export default function ChatView({ channel, onBack, showHeader = true }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { joinRoom, sendMessage, messages, isConnected, loadRecentMessages } = useChat();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    console.log('Connecting to channel:', {
      channelArn: ivsConfig.channelArn,
      chatRoomArn: ivsConfig.chatRoomArn,
      playbackUrl: ivsConfig.playbackUrl
    });
    connectToChannel();
  }, [channel.roomArn]);

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
    } catch (error) {
      console.error('Failed to connect to channel:', error);
      setError('Failed to connect to chat');
    }
  };

  const handleSend = async () => {
    if (!isConnected) {
      setError('Not connected to chat. Trying to reconnect...');
      await connectToChannel();
      return;
    }

    try {
      await sendMessage(message);
      setMessage('');
      setError(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {showHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.channelName}>{channel.displayName}</Text>
          <Text style={[styles.status, { color: isConnected ? 'green' : 'red' }]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      )}
      
      <ScrollView 
        ref={scrollViewRef}
        style={[styles.messages, !showHeader && styles.messagesNoHeader]}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {Array.from(uniqueMessages.values()).map((msg) => (
          <View key={`${msg.id}-${msg.content}`} style={styles.message}>
            <Text style={styles.sender}>
              {msg.attributes.displayName || 
                (msg.attributes.senderId ? 
                  `Guest${msg.attributes.senderId.slice(-5)}` : 
                  'Guest'
                )
              }:
            </Text>
            <Text style={styles.content}>{msg.content}</Text>
          </View>
        ))}
      </ScrollView>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
        />
        <Button 
          title="Send" 
          onPress={handleSend}
          disabled={!isConnected || !message.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  error: {
    color: 'red',
    marginBottom: 10,
  },
  status: {
    marginLeft: 'auto',
    fontWeight: 'bold',
  },
  messagesNoHeader: {
    paddingTop: 0,
  },
}); 