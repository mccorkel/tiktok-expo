import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../amplify/data/resource';
import UnauthenticatedLayout from '../layouts/UnauthenticatedLayout';
import { ProfileService } from '../services/ProfileService';

const client = generateClient<Schema>();
const profileService = new ProfileService();

// Regex for validating display name (alphanumeric, dash, underscore)
const DISPLAY_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const MIN_LENGTH = 3;

export default function DisplayNameScreen({ onComplete }: { onComplete: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateDisplayName = async (name: string): Promise<boolean> => {
    // Check length
    if (name.length < MIN_LENGTH) {
      setError(`Display name must be at least ${MIN_LENGTH} characters long`);
      return false;
    }

    // Check characters
    if (!DISPLAY_NAME_REGEX.test(name)) {
      setError('Display name can only contain letters, numbers, dashes, and underscores');
      return false;
    }

    // Check uniqueness
    try {
      const { data: profiles } = await client.models.Profile.list({
        filter: {
          displayName: { eq: name }
        }
      });
      
      if (profiles.length > 0) {
        setError('This display name is already taken');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error checking display name uniqueness:', err);
      setError('Error checking display name availability');
      return false;
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate display name
      const isValid = await validateDisplayName(displayName);
      if (!isValid) {
        setIsLoading(false);
        return;
      }

      // Create profile with IVS resources
      await profileService.createProfile(displayName);
      onComplete();
    } catch (err) {
      console.error('Error creating profile:', err);
      setError('Failed to create profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UnauthenticatedLayout>
      <View style={styles.container}>
        <Text style={styles.title}>Choose Your Display Name</Text>
        <Text style={styles.subtitle}>This will be your unique identifier in the app</Text>
        
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter display name"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        
        {error && (
          <Text style={styles.error}>{error}</Text>
        )}
        
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </UnauthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: '#FF3B30',
    marginBottom: 20,
    textAlign: 'center',
  },
}); 