import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import type { Schema } from '../../amplify/data/resource';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useStreamStatus } from '../providers/StreamStatusProvider';
import { IVSService } from '../services/IVSService';
import { generateClient } from 'aws-amplify/api';
import { MainLayout } from '../components/MainLayout';

const AWS_REGION = 'us-east-1'; // Same region as our IVS setup
const { width } = Dimensions.get('window');
const THUMBNAIL_WIDTH = width / 2 - 30; // 2 columns with padding
const THUMBNAIL_HEIGHT = THUMBNAIL_WIDTH * (9/16); // 16:9 aspect ratio
const THUMBNAIL_RETRY_INTERVAL = 5000; // 5 seconds between retries

const ivsService = new IVSService();
const client = generateClient<Schema>();

type Profile = Schema['Profile']['type'];
interface StreamWithThumbnail extends Profile {
  thumbnailError?: boolean;
  thumbnailKey?: number; // Used to force image refresh
}

type RootStackParamList = {
  Home: undefined;
  Browse: undefined;
  Following: undefined;
  Profile: undefined;
  GoLive: undefined;
  TestChat: undefined;
  ChannelTest: undefined;
  StreamDetails: { streamId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type BrowseScreenRouteProp = RouteProp<RootStackParamList, 'Browse'>;

type ProfileUpdate = {
  id: string;
  lastStreamedAt: string | null;
};

export default function BrowseScreen() {
  const { liveChannels, isLoading, error } = useStreamStatus();
  const [thumbnailStates, setThumbnailStates] = useState<Record<string, { error: boolean, key: number }>>({});
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BrowseScreenRouteProp>();

  const handleStreamPress = (stream: StreamWithThumbnail) => {
    navigation.navigate('StreamDetails', { streamId: stream.id });
  };

  const renderStreamItem = ({ item }: { item: StreamWithThumbnail }) => {
    return (
      <TouchableOpacity 
        style={styles.streamItem} 
        onPress={() => handleStreamPress(item)}
      >
        <View style={styles.thumbnailContainer}>
          <View style={[styles.thumbnail, styles.thumbnailError]}>
            <Text style={styles.thumbnailErrorText}>Live Stream</Text>
          </View>
          <View style={styles.liveIndicator}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <Text style={styles.streamTitle} numberOfLines={1}>
          {item.displayName}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <MainLayout navigation={navigation} route={route}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout navigation={navigation} route={route}>
        <View style={styles.centerContainer}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout navigation={navigation} route={route}>
      <View style={styles.container}>
        {liveChannels.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.noStreamsText}>No live streams available</Text>
          </View>
        ) : (
          <FlatList
            data={liveChannels}
            renderItem={renderStreamItem}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 15,
  },
  row: {
    justifyContent: 'space-between',
  },
  streamItem: {
    width: THUMBNAIL_WIDTH,
    marginBottom: 20,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  streamTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  error: {
    color: '#FF3B30',
    textAlign: 'center',
  },
  noStreamsText: {
    color: '#666',
    fontSize: 16,
  },
  thumbnailError: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailErrorText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    padding: 10,
  },
}); 