import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuthenticator } from '@aws-amplify/ui-react-native';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';

const HomeScreen = () => {
  const { user } = useAuthenticator();
  console.log('Rendering HomeScreen, user:', user);

  return (
    <AuthenticatedLayout>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Home Screen</Text>
          <Text style={styles.debug}>User: {user?.username}</Text>
          <View style={styles.box}>
            <Text style={styles.boxText}>Debug Box</Text>
          </View>
        </View>
      </View>
    </AuthenticatedLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5e5e5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  debug: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  box: {
    width: 200,
    height: 200,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  boxText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeScreen; 