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
        setIsLoading(true);
        const { data } = await client.models.Profile.list();
        
        // Only keep profiles that have a channelArn
        const validProfiles = data.filter(profile => profile.channelArn);
        console.log('All profiles:', data.length);
        console.log('Valid profiles with channels:', validProfiles.length);
        console.log('Profile details:', validProfiles.map(p => ({ 
          displayName: p.displayName, 
          channelArn: p.channelArn,
          userId: p.userId
        })));
        setProfiles(validProfiles);
      } catch (err) {
        console.error('Error fetching profiles:', err);
        setError('Failed to fetch profiles');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfiles();

    // Set up subscription for new profiles
    const sub = client.models.Profile.observeQuery().subscribe({
      next: ({ items }) => {
        const validProfiles = items.filter(profile => profile.channelArn);
        console.log('Profile subscription update:');
        console.log('- Total profiles:', items.length);
        console.log('- Profiles with channels:', validProfiles.length);
        console.log('- Profile details:', validProfiles.map(p => ({ 
          displayName: p.displayName, 
          channelArn: p.channelArn,
          userId: p.userId
        })));
        setProfiles(validProfiles);
      },
      error: (err) => console.error('Profile subscription error:', err)
    });

    return () => {
      sub.unsubscribe();
    };
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
        console.log('No profiles found to check. Waiting for profiles to be loaded...');
        return;
      }

      console.log('Starting channel status check:');
      console.log('- Total profiles to check:', profiles.length);
      console.log('- Profile list:', profiles.map(p => ({ 
        displayName: p.displayName, 
        channelArn: p.channelArn 
      })));
      
      // Check all channels in parallel
      const results = await Promise.all(
        profiles.map(async profile => {
          try {
            console.log(`Checking channel for ${profile.displayName}...`);
            const isLive = await ivsService.checkChannelLiveStatus(profile.channelArn!);
            console.log(`Channel status for ${profile.displayName}: ${isLive ? 'LIVE' : 'offline'}`);
            return { profile, isLive };
          } catch (err) {
            console.error(`Error checking channel ${profile.channelArn} for ${profile.displayName}:`, err);
            return { profile, isLive: false };
          }
        })
      );

      // Update live channels state
      const newLiveChannels = results
        .filter(result => result.isLive)
        .map(result => result.profile);

      console.log('Channel status check complete:');
      console.log('- Total channels checked:', results.length);
      console.log('- Live channels found:', newLiveChannels.length);
      console.log('- Live channel details:', newLiveChannels.map(p => ({ 
        displayName: p.displayName, 
        channelArn: p.channelArn 
      })));
      
      setLiveChannels(prevLiveChannels => {
        // Only update state if there's an actual change
        if (JSON.stringify(prevLiveChannels) !== JSON.stringify(newLiveChannels)) {
          console.log('Updating live channels state');
          return newLiveChannels;
        }
        return prevLiveChannels;
      });
    } catch (err) {
      console.error('Error checking channel statuses:', err);
      setError('Failed to check channel statuses');
    }
  }, [profiles]);

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