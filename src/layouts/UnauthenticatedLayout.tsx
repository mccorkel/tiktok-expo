import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native';

interface UnauthenticatedLayoutProps {
  children: React.ReactNode;
}

const UnauthenticatedLayout = ({ children }: UnauthenticatedLayoutProps) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
});

export default UnauthenticatedLayout; 