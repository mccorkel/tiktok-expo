import React, { useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Platform
} from 'react-native';
import { useChat } from '../providers/ChatProvider';

type ChatMessagesProps = {
  isFullscreen?: boolean;
};

export default function ChatMessages({ isFullscreen }: ChatMessagesProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const { messages } = useChat();

  // Create a map of unique messages based on id and content
  const uniqueMessages = messages.reduce((acc, msg) => {
    const key = `${msg.id}-${msg.content}`;
    if (!acc.has(key)) {
      acc.set(key, msg);
    }
    return acc;
  }, new Map());

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.messages}
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
  );
}

const styles = StyleSheet.create({
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
  messageFullscreen: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sender: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
  },
  content: {
    fontSize: 16,
    color: '#000',
  },
  textWhite: {
    color: '#fff',
  },
}); 