import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import IVSPlayer from 'amazon-ivs-react-native-player';
import { VideoMetadata } from '../../../public/assets/sample_videos/metadata';

interface WebVideoCardProps {
  video: VideoMetadata;
  isVisible?: boolean;
}

const { width, height } = Dimensions.get('window');
const VIDEO_WIDTH = width - 20;

const WebVideoCard: React.FC<WebVideoCardProps> = ({ video, isVisible = false }) => {
  // Use require for local video
  const localVideo = require('../../../public/assets/sample_videos/sample1.mp4');

  return (
    <View style={styles.container}>
      <IVSPlayer
        streamUrl={localVideo}
        style={styles.video}
        autoplay={isVisible}
        muted={false}
        resizeMode="aspectFit"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: VIDEO_WIDTH,
    aspectRatio: 16/9,
    borderRadius: 8,
  },
});

export default WebVideoCard; 