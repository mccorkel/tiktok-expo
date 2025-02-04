import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native';
import BottomNavBar from '../components/navigation/BottomNavBar';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  console.log('Rendering AuthenticatedLayout');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.debug}>Debug: AuthenticatedLayout</Text>
          {children}
        </View>
        <BottomNavBar />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Debug color
  },
  content: {
    flex: 1,
    paddingBottom: 80, // Space for nav bar
  },
  debug: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'red',
    color: 'white',
    padding: 5,
    zIndex: 1000,
  },
});

export default AuthenticatedLayout; 