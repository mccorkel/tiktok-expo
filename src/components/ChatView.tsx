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
};

export default function ChatView({ channel, onBack }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { joinRoom, sendMessage, messages, isConnected } = useChat();
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
      await joinRoom(channel.roomArn, {
        id: user.userId,
        username: user.signInDetails?.loginId || 'Anonymous'
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.channelName}>{channel.displayName}</Text>
        <Text style={[styles.status, { color: isConnected ? 'green' : 'red' }]}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messages}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={styles.message}>
            <Text style={styles.sender}>{msg.attributes.senderId}:</Text>
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
  }
}); 