import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Platform,
  Text
} from 'react-native';
import { useChat } from '../providers/ChatProvider';

type ChatInputProps = {
  isFullscreen?: boolean;
};

export default function ChatInput({ isFullscreen }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const { isConnected, sendMessage } = useChat();

  const handleSend = async () => {
    if (!isConnected || !message.trim()) return;

    try {
      await sendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <View style={[
      styles.inputContainer,
      isFullscreen && styles.inputContainerFullscreen
    ]}>
      <TextInput
        style={[styles.input, isFullscreen && styles.inputFullscreen]}
        value={message}
        onChangeText={setMessage}
        placeholder="Type a message..."
        placeholderTextColor={isFullscreen ? "#999" : "#666"}
        editable={isConnected}
      />
      <TouchableOpacity 
        style={[
          styles.sendButton,
          (!isConnected || !message.trim()) && styles.sendButtonDisabled
        ]}
        onPress={handleSend}
        disabled={!isConnected || !message.trim()}
      >
        <Text style={[
          styles.sendButtonText,
          (!isConnected || !message.trim()) && styles.sendButtonTextDisabled
        ]}>
          Send
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  inputContainerFullscreen: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    height: 36,
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    paddingHorizontal: 15,
    marginRight: 10,
    color: '#000',
  },
  inputFullscreen: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 18,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sendButtonTextDisabled: {
    color: '#999',
  },
}); 