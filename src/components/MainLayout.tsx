import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

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

type MainLayoutProps = {
  children: React.ReactNode;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, keyof RootStackParamList>;
};

const TAB_COLORS = {
  home: '#007AFF',     // Blue for home
  browse: '#34C759',   // Green for browse
  following: '#FF3B30', // Red for following
  profile: '#AF52DE',  // Purple for profile
  golive: '#FF9500',   // Orange for go live
  testchat: '#5856D6', // Indigo for test chat
  channeltest: '#FF2D55' // Pink for channel test
};

const TABS = ['Home', 'Browse', 'Following', 'Profile', 'GoLive', 'TestChat', 'ChannelTest'] as const;
type TabName = typeof TABS[number];

const TAB_LABELS: Record<TabName, string> = {
  Home: 'Home',
  Browse: 'Browse',
  Following: 'Following',
  Profile: 'Profile',
  GoLive: 'GoLive',
  TestChat: 'TestChat',
  ChannelTest: 'Ch. Test'
};

type IconName = keyof typeof Ionicons['glyphMap'];

function getIconName(route: TabName, focused: boolean): IconName {
  switch (route) {
    case 'Home':
      return focused ? 'home' : 'home-outline';
    case 'Browse':
      return focused ? 'compass' : 'compass-outline';
    case 'Following':
      return focused ? 'heart' : 'heart-outline';
    case 'Profile':
      return focused ? 'person' : 'person-outline';
    case 'GoLive':
      return focused ? 'radio' : 'radio-outline';
    case 'TestChat':
      return focused ? 'chatbubbles' : 'chatbubbles-outline';
    case 'ChannelTest':
      return focused ? 'tv' : 'tv-outline';
    default:
      return 'help-outline';
  }
}

function TabBar({ state, navigation }: { 
  state: { index: number; routes: Array<{ name: string }> };
  navigation: NativeStackNavigationProp<RootStackParamList>;
}) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((route) => (
        <TouchableOpacity
          key={route}
          style={styles.tabItem}
          onPress={() => {
            navigation.navigate(route);
          }}
        >
          <Ionicons
            name={getIconName(route, state.routes[state.index].name === route)}
            size={24}
            color={state.routes[state.index].name === route 
              ? TAB_COLORS[route.toLowerCase() as keyof typeof TAB_COLORS] 
              : '#999999'
            }
          />
          <Text style={[
            styles.tabLabel,
            { 
              color: state.routes[state.index].name === route 
                ? TAB_COLORS[route.toLowerCase() as keyof typeof TAB_COLORS] 
                : '#999999' 
            }
          ]}>
            {TAB_LABELS[route]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function MainLayout({ children, navigation, route }: MainLayoutProps) {
  const state = navigation.getState();
  
  // Don't show tab bar on StreamDetails screen
  if (route.name === 'StreamDetails') {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      <TabBar state={state} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: 60,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  }
}); 