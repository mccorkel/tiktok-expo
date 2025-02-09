import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';
import { IVSService } from '../services/IVSService';

const client = generateClient<Schema>();
const ivsService = new IVSService();

type Profile = Schema['Profile']['type'];

interface StreamStatusContextType {
  liveChannels: Profile[];
  isLoading: boolean;
  error: string | null;
}

const StreamStatusContext = createContext<StreamStatusContextType>({
  liveChannels: [],
  isLoading: false,
  error: null
});

export function StreamStatusProvider({ children }: { children: React.ReactNode }) {
  const [liveChannels, setLiveChannels] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Fetch all profiles once when the component mounts
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data } = await client.models.Profile.list();
        setProfiles(data.filter(profile => profile.channelArn));
      } catch (err) {
        console.error('Error fetching profiles:', err);
      }
    };
    fetchProfiles();
  }, []);

  // Memoize the check channel status function
  const checkChannelStatus = useCallback(async (profile: Profile) => {
    try {
      const isLive = await ivsService.checkChannelLiveStatus(profile.channelArn!);
      return { profile, isLive };
    } catch (err) {
      console.error(`Error checking channel ${profile.channelArn}:`, err);
      return { profile, isLive: false };
    }
  }, []);

  const checkChannelStatuses = useCallback(async () => {
    try {
      setError(null);
      
      if (profiles.length === 0) {
        console.log('No valid channels found to check');
        return;
      }

      // Check all channels in parallel
      const results = await Promise.all(
        profiles.map(checkChannelStatus)
      );

      // Update live channels state by comparing with current state
      setLiveChannels(prevLiveChannels => {
        const newLiveChannels = results
          .filter(result => result.isLive)
          .map(result => result.profile);

        // Only update state if there's an actual change
        if (JSON.stringify(prevLiveChannels) !== JSON.stringify(newLiveChannels)) {
          return newLiveChannels;
        }
        return prevLiveChannels;
      });
    } catch (err) {
      console.error('Error checking channel statuses:', err);
      setError('Failed to check channel statuses');
    }
  }, [profiles, checkChannelStatus]);

  // Set up polling
  useEffect(() => {
    // Initial check
    checkChannelStatuses();

    // Set up polling every 10 seconds
    const interval = setInterval(checkChannelStatuses, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [checkChannelStatuses]);

  // Memoize the context value
  const contextValue = useMemo(() => ({
    liveChannels,
    isLoading,
    error
  }), [liveChannels, isLoading, error]);

  return (
    <StreamStatusContext.Provider value={contextValue}>
      {children}
    </StreamStatusContext.Provider>
  );
}

export const useStreamStatus = () => useContext(StreamStatusContext); 