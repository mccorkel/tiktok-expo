import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';

type RootStackParamList = {
  Home: undefined;
  Browse: undefined;
  Following: undefined;
  Profile: undefined;
};

type NavigationProps = NavigationProp<RootStackParamList>;

const BottomNavBar = () => {
  const navigation = useNavigation<NavigationProps>();
  console.log('Rendering BottomNavBar with navigation:', navigation); // Enhanced debug

  const navItems = [
    { name: 'Home', route: 'Home' },
    { name: 'Browse', route: 'Browse' },
    { name: 'Following', route: 'Following' },
    { name: 'Profile', route: 'Profile' },
  ] as const;

  return (
    <View style={[styles.container, Platform.OS === 'ios' && styles.iosExtra]}>
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.name}
          style={styles.navItem}
          onPress={() => {
            console.log('Navigating to:', item.route);
            navigation.navigate(item.route);
          }}
        >
          <Text style={styles.navText}>{item.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  iosExtra: {
    paddingBottom: 35, // Extra padding for iPhone with home indicator
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});

export default BottomNavBar; 