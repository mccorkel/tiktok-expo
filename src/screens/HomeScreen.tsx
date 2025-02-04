import React, { useState } from 'react';
import { View, FlatList, StyleSheet, ViewToken, Dimensions } from 'react-native';
import VideoCard from '../components/video/VideoCard';
import { sampleVideos } from '../../public/assets/sample_videos/metadata';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';

const HomeScreen: React.FC = () => {
  const [visibleVideoId, setVisibleVideoId] = useState<string>('');

  const onViewableItemsChanged = React.useCallback(({ viewableItems }: {
    viewableItems: ViewToken[];
  }) => {
    if (viewableItems.length > 0) {
      setVisibleVideoId(viewableItems[0].item.id);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 80
  };

  return (
    <AuthenticatedLayout>
      <View style={styles.container}>
        <FlatList
          data={sampleVideos}
          renderItem={({ item }) => (
            <VideoCard 
              video={item} 
              isVisible={item.id === visibleVideoId}
            />
          )}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          snapToAlignment="center"
          decelerationRate={0.9}
          snapToInterval={Dimensions.get('window').height}
          pagingEnabled
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      </View>
    </AuthenticatedLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default HomeScreen; 