import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  Platform,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import Slider from '@react-native-community/slider';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';
import { useRoute, useIsFocused, useNavigation } from '@react-navigation/native';
import IVSPlayer, { IVSPlayerRef, Quality } from 'amazon-ivs-react-native-player';
import { IVSService } from '../services/IVSService';
import ChatView from '../components/ChatView';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

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

const client = generateClient<Schema>();
const ivsService = new IVSService();
const { width, height } = Dimensions.get('window');
const PLAYER_HEIGHT = width * (9/16); // 16:9 aspect ratio

export default function StreamDetailsScreen() {
  const [stream, setStream] = useState<Schema['Profile']['type'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<Quality | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const playerRef = useRef<IVSPlayerRef>(null);
  const route = useRoute();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const streamId = (route.params as any)?.streamId;

  useEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
  }, [navigation]);

  useEffect(() => {
    if (streamId) {
      loadStreamDetails();
    }
  }, [streamId]);

  useEffect(() => {
    if (!isFocused && playerRef.current) {
      playerRef.current.pause();
      setIsPaused(true);
    }
  }, [isFocused]);

  const loadStreamDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: profile } = await client.models.Profile.get({ id: streamId });
      
      if (!profile) {
        setError('Stream not found');
        return;
      }

      let isActuallyLive = false;
      if (profile.channelArn) {
        isActuallyLive = await ivsService.checkChannelLiveStatus(profile.channelArn);
      }
      
      const updatedProfile = {
        ...profile,
        isLive: isActuallyLive
      };

      setStream(updatedProfile);

      if (isActuallyLive && playerRef.current) {
        playerRef.current.play();
        setIsPaused(false);
      }
    } catch (err) {
      console.error('Error loading stream details:', err);
      setError('Failed to load stream details');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPaused) {
        playerRef.current.play();
      } else {
        playerRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number) => {
    if (playerRef.current) {
      setVolume(value);
    }
  };

  const handleQualityChange = (quality: Quality) => {
    if (playerRef.current) {
      setSelectedQuality(quality);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleDisclosurePress = async () => {
    if (playerRef.current) {
      try {
        await playerRef.current.togglePip();
        navigation.navigate('Browse');
      } catch (err) {
        console.error('Failed to enter PIP mode:', err);
        // Fallback to just navigation if PIP fails
        navigation.navigate('Browse');
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !stream) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error || 'Stream not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.playerContainer}>
          {stream.isLive && stream.playbackUrl ? (
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={showControlsTemporarily}
              style={styles.playerWrapper}
            >
              <IVSPlayer
                ref={playerRef}
                streamUrl={stream.playbackUrl}
                style={styles.player}
                autoplay={true}
                muted={isMuted}
                volume={volume}
                quality={selectedQuality}
                onDurationChange={(duration: number | null) => {
                  if (duration !== null) {
                    setDuration(duration);
                  }
                }}
                onProgress={setCurrentTime}
                onQualityChange={setSelectedQuality}
                onPlayerStateChange={(state: string) => {
                  setIsBuffering(state === 'Buffering');
                }}
                onError={(err) => {
                  console.error('Player error:', err);
                  setError('Failed to play stream');
                }}
              />
              {showControls && (
                <View style={styles.controls}>
                  <View style={styles.topControls}>
                    <TouchableOpacity 
                      onPress={handleDisclosurePress}
                      style={styles.disclosureButton}
                    >
                      <Ionicons 
                        name="chevron-down" 
                        size={28} 
                        color="white" 
                      />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.centerControls}>
                    {isBuffering ? (
                      <ActivityIndicator size="large" color="white" />
                    ) : (
                      <TouchableOpacity 
                        onPress={togglePlayPause}
                        style={styles.playPauseButton}
                      >
                        <Ionicons 
                          name={isPaused ? 'play' : 'pause'} 
                          size={40} 
                          color="white" 
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.bottomControls}>
                    <TouchableOpacity onPress={toggleMute} style={styles.muteButton}>
                      <Ionicons 
                        name={isMuted ? 'volume-mute' : 'volume-high'} 
                        size={24} 
                        color="white" 
                      />
                    </TouchableOpacity>

                    {qualities.length > 0 && (
                      <TouchableOpacity 
                        style={styles.qualityButton}
                        onPress={() => {
                          // Show quality selection menu
                          // You can implement a modal or dropdown here
                        }}
                      >
                        <Text style={styles.qualityText}>
                          {selectedQuality?.name || 'Auto'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.offlineContainer}>
              <Text style={styles.offlineText}>Stream is currently offline</Text>
            </View>
          )}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.streamTitle}>{stream.displayName}</Text>
          {stream.bio && (
            <Text style={styles.bio}>{stream.bio}</Text>
          )}
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {stream.followers} followers • {stream.following} following
            </Text>
          </View>
        </View>

        {stream.chatRoomArn && stream.displayName && (
          <View style={styles.chatContainer}>
            <ChatView 
              channel={{
                roomArn: stream.chatRoomArn,
                displayName: stream.displayName
              }}
              onBack={() => navigation.goBack()}
              showHeader={false}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 16,
  },
  playerContainer: {
    width: width,
    height: PLAYER_HEIGHT,
    backgroundColor: '#000',
  },
  playerWrapper: {
    flex: 1,
  },
  player: {
    flex: 1,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'flex-start',
  },
  centerControls: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    justifyContent: 'space-between',
  },
  muteButton: {
    marginHorizontal: 15,
  },
  qualityButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 4,
  },
  qualityText: {
    color: 'white',
    fontSize: 12,
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  offlineText: {
    color: '#fff',
    fontSize: 16,
  },
  detailsContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  streamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  chatContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  disclosureButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    padding: 5,
    marginLeft: 10,
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    padding: 15,
  },
}); 