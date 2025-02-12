import React, { createContext, useContext, useEffect, useState } from 'react';
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
  error: Error | null;
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
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get live sessions
        const sessionsResponse = await client.models.StreamSession.list({
          filter: { status: { eq: 'LIVE' } }
        });
        const sessions = sessionsResponse.data;

        if (sessions && sessions.length > 0) {
          // Get unique profile IDs
          const profileIds = [...new Set(sessions.map((session: StreamSession) => session.profileId))];
          
          // Get profiles
          const profilesResponse = await client.models.Profile.list({
            filter: {
              or: profileIds
                .filter((id): id is string => id !== null)
                .map(id => ({ id: { eq: id } }))
            }
          });
          const profiles = profilesResponse.data;

          // Get recordings
          const recordingsResponse = await client.models.Recording.list({
            filter: {
              and: [
                {
                  or: sessions
                    .filter((s: StreamSession) => s.id !== null)
                    .map((s: StreamSession) => ({ streamSessionId: { eq: s.id } }))
                },
                { recordingStatus: { eq: 'STARTED' } }
              ]
            }
          });
          const recordings = recordingsResponse.data;

          // Map recordings to profiles
          const channelsWithThumbnails = profiles.map((profile: Profile) => {
            const session = sessions.find((s: StreamSession) => s.profileId === profile.id);
            const recording = session ? recordings.find((r: Recording) => r.streamSessionId === session.id) : undefined;
            
            return {
              ...profile,
              thumbnailUrl: recording ? constructThumbnailUrl(recording) : undefined
            };
          });

          setLiveChannels(channelsWithThumbnails);
        } else {
          setLiveChannels([]);
        }
      } catch (err) {
        console.error('Error fetching live streams:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch live streams'));
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchLiveStreams();

    // Poll every 5 seconds
    const interval = setInterval(fetchLiveStreams, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <StreamStatusContext.Provider value={{ liveChannels, isLoading, error }}>
      {children}
    </StreamStatusContext.Provider>
  );
}

export const useStreamStatus = () => useContext(StreamStatusContext); 