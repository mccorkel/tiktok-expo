import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { signOut, getCurrentUser } from 'aws-amplify/auth';
import { useChat } from '../providers/ChatProvider';

export default function ProfileScreen() {
  const { getUserChatRoom, listChannels } = useChat();
  const [channelReady, setChannelReady] = useState(false);

  useEffect(() => {
    checkChannel();
  }, []);

  const checkChannel = async () => {
    try {
      const user = await getCurrentUser();
      const channels = await listChannels();
      setChannelReady(channels.length > 0);
    } catch (error) {
      console.error('Error checking channel:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        Chat Channel Status: {channelReady ? '✅ Ready' : '⏳ Setting up...'}
      </Text>
      <TouchableOpacity 
        style={styles.signOutButton} 
        onPress={handleSignOut}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  email: {
    fontSize: 16,
    marginBottom: 8,
  },
  username: {
    fontSize: 16,
    marginBottom: 32,
    color: '#666',
  },
  signOutButton: {
    backgroundColor: '#DC3546',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    color: '#666',
    fontSize: 16,
    marginBottom: 32,
  },
}); 