import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AuthenticatedLayout from '../layouts/AuthenticatedLayout';

const BrowseScreen: React.FC = () => {
  return (
    <AuthenticatedLayout>
      <View style={styles.container}>
        <Text>Browse Screen</Text>
      </View>
    </AuthenticatedLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BrowseScreen; 