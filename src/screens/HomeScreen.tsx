import React, { useState } from 'react';
import { View, FlatList, StyleSheet, ViewToken, Dimensions } from 'react-native';
import VideoCard from '../components/video/VideoCard';
import { sampleVideos } from '../../public/assets/sample_videos/metadata';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { MainLayout } from '../components/MainLayout';

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
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const [visibleVideoId, setVisibleVideoId] = useState<string>('');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();

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
    <MainLayout navigation={navigation} route={route}>
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
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default HomeScreen; 