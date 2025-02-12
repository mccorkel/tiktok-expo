import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

type Profile = Schema['Profile']['type'];
type StreamSession = Schema['StreamSession']['type'];
type Recording = Schema['Recording']['type'];

interface LiveChannel extends Profile {
  thumbnailUrl?: string;
}

interface StreamStatusContextType {
  liveChannels: LiveChannel[];
  isLoading: boolean;
  error: string | null;
}

const StreamStatusContext = createContext<StreamStatusContextType>({
  liveChannels: [],
  isLoading: false,
  error: null
});

// Helper function to construct thumbnail URL from recording data
function constructThumbnailUrl(recording: Recording): string {
  return `https://${recording.s3BucketName}.s3.us-east-1.amazonaws.com/${recording.s3KeyPrefix}/media/latest_thumbnail/thumb.jpg`;
}

export function StreamStatusProvider({ children }: { children: React.ReactNode }) {
  const [liveChannels, setLiveChannels] = useState<LiveChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial live streams and set up subscription
  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Query for active stream sessions and their associated profiles
        const { data: sessions } = await client.models.StreamSession.list({
          filter: {
            status: { eq: 'LIVE' }
          }
        });

        if (sessions.length > 0) {
          // Get unique profile IDs
          const profileIds = [...new Set(sessions.map(session => session.profileId))];
          
          // Fetch profiles for live sessions
          const { data: profiles } = await client.models.Profile.list({
            filter: {
              or: profileIds
                .filter((id): id is string => id !== null)
                .map(id => ({ id: { eq: id } }))
            }
          });

          // Fetch active recordings for these sessions
          const { data: recordings } = await client.models.Recording.list({
            filter: {
              and: [
                {
                  or: sessions
                    .filter(s => s.id !== null)
                    .map(s => ({ streamSessionId: { eq: s.id } }))
                },
                { recordingStatus: { eq: 'STARTED' } }
              ]
            }
          });

          // Map recordings to profiles
          const liveChannelsWithThumbnails = profiles.map(profile => {
            const session = sessions.find(s => s.profileId === profile.id);
            const recording = session ? recordings.find(r => r.streamSessionId === session.id) : undefined;
            
            return {
              ...profile,
              thumbnailUrl: recording ? constructThumbnailUrl(recording) : undefined
            };
          });

          console.log('Found live streams:', {
            sessions: sessions.length,
            profiles: profiles.length,
            recordings: recordings.length
          });

          setLiveChannels(liveChannelsWithThumbnails);
        } else {
          setLiveChannels([]);
        }
      } catch (err) {
        console.error('Error fetching live streams:', err);
        setError('Failed to fetch live streams');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchLiveStreams();

    // Subscribe to StreamSession changes
    const subscription = client.models.StreamSession.observeQuery({
      filter: {
        status: { eq: 'LIVE' }
      }
    }).subscribe({
      next: async ({ items: sessions }) => {
        try {
          if (sessions.length > 0) {
            const profileIds = [...new Set(sessions.map(session => session.profileId))];
            const { data: profiles } = await client.models.Profile.list({
              filter: {
                or: profileIds
                  .filter((id): id is string => id !== null)
                  .map(id => ({ id: { eq: id } }))
              }
            });

            // Fetch active recordings for these sessions
            const { data: recordings } = await client.models.Recording.list({
              filter: {
                and: [
                  {
                    or: sessions
                      .filter(s => s.id !== null)
                      .map(s => ({ streamSessionId: { eq: s.id } }))
                  },
                  { recordingStatus: { eq: 'STARTED' } }
                ]
              }
            });

            // Map recordings to profiles
            const liveChannelsWithThumbnails = profiles.map(profile => {
              const session = sessions.find(s => s.profileId === profile.id);
              const recording = session ? recordings.find(r => r.streamSessionId === session.id) : undefined;
              
              return {
                ...profile,
                thumbnailUrl: recording ? constructThumbnailUrl(recording) : undefined
              };
            });

            console.log('Stream session subscription update:', {
              sessions: sessions.length,
              profiles: profiles.length,
              recordings: recordings.length
            });

            setLiveChannels(liveChannelsWithThumbnails);
          } else {
            setLiveChannels([]);
          }
        } catch (err) {
          console.error('Error processing stream session update:', err);
          setError('Failed to process stream update');
        }
      },
      error: (err) => {
        console.error('Stream session subscription error:', err);
        setError('Stream subscription error');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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