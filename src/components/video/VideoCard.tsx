import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Audio } from 'expo-av';
import { VideoMetadata } from '../../../public/assets/sample_videos/metadata';

interface VideoCardProps {
  video: VideoMetadata;
  isVisible?: boolean;
}

const { width, height } = Dimensions.get('window');
const VIDEO_WIDTH = width - 20; // Full width minus padding

const videoSources = {
  'sample1.mp4': require('../../../public/assets/sample_videos/sample1.mp4'),
  'sample2.mp4': require('../../../public/assets/sample_videos/sample2.mp4'),
  'sample3.mp4': require('../../../public/assets/sample_videos/sample3.mp4'),
} as const;

const VideoCard: React.FC<VideoCardProps> = ({ video, isVisible = false }) => {
  const player = useVideoPlayer(videoSources[video.filename as keyof typeof videoSources]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });
      } catch (error) {
        console.warn('Error configuring audio:', error);
      }
    };
    configureAudio();
  }, []);

  useEffect(() => {
    if (isVisible) {
      player.seekBy(-player.currentTime);
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player]);

  useEffect(() => {
    const subscription = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });
    return () => subscription.remove();
  }, [player]);

  useEffect(() => {
    if (isPlaying && player.currentTime >= 5) {
      player.seekBy(-player.currentTime);
    }
  }, [isPlaying, player]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>{video.title}</Text>
        <Text style={styles.duration}>{video.duration}s</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: -50,
  },
  video: {
    width: VIDEO_WIDTH,
    aspectRatio: 16/9,
    borderRadius: 8,
    marginTop: -50,
  },
  overlay: {
    position: 'absolute',
    bottom: 160,
    left: 10,
    right: 10,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  duration: {
    color: '#fff',
    fontSize: 14,
  },
});

export default VideoCard; 