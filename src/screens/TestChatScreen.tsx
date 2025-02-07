import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ChannelList from '../components/ChannelList';
import ChatView from '../components/ChatView';

export default function TestChatScreen() {
  const [selectedChannel, setSelectedChannel] = useState(null);

  return (
    <View style={styles.container}>
      {!selectedChannel ? (
        <ChannelList onChannelSelect={setSelectedChannel} />
      ) : (
        <ChatView channel={selectedChannel} onBack={() => setSelectedChannel(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 