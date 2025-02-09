import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
type FollowingScreenRouteProp = RouteProp<RootStackParamList, 'Following'>;

const FollowingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FollowingScreenRouteProp>();

  return (
    <MainLayout navigation={navigation} route={route}>
      <View style={styles.container}>
        <Text>Following Screen</Text>
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FollowingScreen; 