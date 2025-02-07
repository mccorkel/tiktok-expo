import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useChat } from '../providers/ChatProvider';
import { getCurrentUser } from 'aws-amplify/auth';

type Channel = {
  id: string;
  displayName: string;
  roomArn: string;
};

export default function ChannelList({ onChannelSelect }: { onChannelSelect: (channel: Channel) => void }) {
  const { listChannels } = useChat();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const channelList = await listChannels();
      setChannels(channelList);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (channels.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No channels available</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadChannels}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Channels</Text>
      </View>
      <FlatList
        data={channels}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.channelItem} 
            onPress={() => onChannelSelect(item)}
          >
            <Text style={styles.channelName}>{item.displayName}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={loadChannels}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  channelItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  channelName: {
    fontSize: 16,
    color: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  refreshText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
}); 