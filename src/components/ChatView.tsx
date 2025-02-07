import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useChat } from '../providers/ChatProvider';
import { getCurrentUser } from 'aws-amplify/auth';
import { Ionicons } from '@expo/vector-icons';

export default function ChatView({ 
  channel, 
  onBack 
}: { 
  channel: { displayName: string; roomArn: string; }; 
  onBack: () => void;
}) {
  const { messages, joinRoom, sendMessage } = useChat();
  const [messageText, setMessageText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    connectToChannel();
  }, [channel]);

  const connectToChannel = async () => {
    try {
      const user = await getCurrentUser();
      await joinRoom(channel.roomArn, {
        id: user.userId,
        username: user.signInDetails?.loginId || 'Anonymous'
      });
    } catch (error) {
      console.error('Failed to connect to channel:', error);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim()) return;
    
    try {
      await sendMessage(messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
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
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messages}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.map(msg => (
          <View key={msg.id} style={styles.message}>
            <Text style={styles.sender}>{msg.senderId}</Text>
            <Text style={styles.content}>{msg.content}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={handleSend}
          disabled={!messageText.trim()}
        >
          <Ionicons 
            name="send" 
            size={24} 
            color={messageText.trim() ? '#007AFF' : '#999'} 
          />
        </TouchableOpacity>
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
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
  },
}); 