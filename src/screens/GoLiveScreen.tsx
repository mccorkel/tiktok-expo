import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { 
  ApiVideoLiveStreamView, 
  ApiVideoLiveStreamProps 
} from '@api.video/react-native-livestream';
import Icon from 'react-native-vector-icons/Ionicons';
import { STREAM_KEY, RTMP_URL } from '@env';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

interface ApiVideoLiveStreamMethods {
  startStreaming: (streamKey: string, url?: string) => Promise<boolean>;
  stopStreaming: () => void;
  setZoomRatio: (zoomRatio: number) => void;
}

export default function GoLiveScreen() {
  const ref = useRef<ApiVideoLiveStreamMethods>(null);
  const [streaming, setStreaming] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [camera, setCamera] = useState<'front' | 'back'>('back');

  useEffect(() => {
    async function configureAudio() {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
    }
    configureAudio();
  }, []);

  useEffect(() => {
    if (streaming) {
      const interval = setInterval(() => {
        console.log('Stream active:', {
          timestamp: new Date().toISOString(),
          isMuted: audioMuted,
          camera
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [streaming]);

  const handleStreaming = async () => {
    if (streaming) {
      try {
        await ref.current?.stopStreaming();
        console.log('Stream stopped successfully');
        setStreaming(false);
      } catch (e) {
        console.error('Failed to stop streaming:', e);
      }
    } else {
      try {
        console.log('Attempting to start stream with:', { STREAM_KEY, RTMP_URL });
        const success = await ref.current?.startStreaming(STREAM_KEY, RTMP_URL);
        if (success) {
          console.log('Stream started successfully');
          setStreaming(true);
        } else {
          console.error('Failed to start stream - returned false');
        }
      } catch (e) {
        console.error('Failed to start streaming:', e);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ApiVideoLiveStreamView
      // @ts-ignore
        ref={ref}
        style={styles.preview}
        camera={camera}
        enablePinchedZoom={true}
        video={{
          fps: 30,
          resolution: '720p',
          bitrate: 2 * 1024 * 1024,
          gopDuration: 1,
        }}
        audio={{
          bitrate: 128000,
          sampleRate: 44100,
          isStereo: true,
        }}
        isMuted={audioMuted}
        onConnectionSuccess={() => {
          console.log('Connection established successfully');
          setStreaming(true);
        }}
        onConnectionFailed={(e) => {
          console.error('Connection failed with error:', e);
          setStreaming(false);
        }}
        onDisconnect={() => {
          console.log('Stream disconnected - cleaning up');
          setStreaming(false);
        }}
        onVideoSizeChanged={(width: number, height: number) => {
          console.log('Video size:', { width, height });
        }}
        onBroadcastMetric={(metric: { 
          videoBitrate: number;
          currentFPS: number;
          width: number;
          height: number;
        }) => {
          console.log('Stream metrics:', {
            bitrate: metric.videoBitrate,
            fps: metric.currentFPS,
            width: metric.width,
            height: metric.height
          });
        }}
        onError={(error: unknown) => {
          console.error('Stream error:', error);
        }}
      />
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setAudioMuted(!audioMuted)}
        >
          <Icon
            name={audioMuted ? 'mic-off-outline' : 'mic-outline'}
            size={30}
            color={audioMuted ? '#DC3546' : '#FFFFFF'}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.streamButton} onPress={handleStreaming}>
          <Icon 
            name={streaming ? 'stop-circle-outline' : 'radio-button-on'} 
            size={50} 
            color={streaming ? '#FF0001' : '#FFFFFF'} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setCamera(camera === 'back' ? 'front' : 'back')}
        >
          <Icon name="camera-reverse-outline" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  preview: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  streamButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 