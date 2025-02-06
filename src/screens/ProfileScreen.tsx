import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { getCurrentUser, fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [userInfo, setUserInfo] = useState({ email: 'Loading...', username: '' });

  useEffect(() => {
    async function loadUserInfo() {
      try {
        const currentUser = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        setUserInfo({
          email: attributes.email || 'No email found',
          username: currentUser.username
        });
      } catch (error) {
        console.error('Error loading user info:', error);
        setUserInfo({ email: 'Error loading user', username: '' });
      }
    }
    loadUserInfo();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      console.log('Successfully signed out');
      // Navigation will be handled by the auth listener
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.email}>{userInfo.email}</Text>
      <Text style={styles.username}>{userInfo.username}</Text>
      <TouchableOpacity 
        style={styles.signOutButton} 
        onPress={handleSignOut}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  email: {
    fontSize: 16,
    marginBottom: 8,
  },
  username: {
    fontSize: 16,
    marginBottom: 32,
    color: '#666',
  },
  signOutButton: {
    backgroundColor: '#DC3546',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 