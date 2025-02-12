import { AppSyncClient, AppSyncClientConfig } from '@aws-sdk/client-appsync';
import { type EventBridgeEvent, type Context } from 'aws-lambda';
import gql from 'graphql-tag';
import { print } from 'graphql';
import fetch from 'node-fetch';

type IVSRecordingDetail = {
  recording_status: 'Recording Start' | 'Recording End' | 'Recording Start Failure' | 'Recording End Failure';
  recording_status_reason: string;
  recording_s3_bucket_name: string;
  recording_s3_key_prefix: string;
  recording_duration_ms: number;
  channel_name: string;
  stream_id: string;
  recording_session_id: string;
  recording_session_stream_ids: string[];
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
    extensions?: Record<string, any>;
  }>;
};

type Profile = {
  id: string;
  channelArn: string;
};

type StreamSession = {
  id: string;
  streamId: string;
  status: string;
  profileId: string;
  startTime: string;
  viewerCount: number;
  duration: number;
};

type Recording = {
  id: string;
  recordingStatus: string;
};

type ListProfilesResponse = {
  listProfiles: {
    items: Profile[];
  };
};

type ListStreamSessionsResponse = {
  listStreamSessions: {
    items: StreamSession[];
  };
};

type ListRecordingsResponse = {
  listRecordings: {
    items: Recording[];
  };
};

type CreateStreamSessionResponse = {
  createStreamSession: StreamSession;
};

// Initialize AppSync client
console.log('Using environment variables:', {
  REGION: process.env.REGION,
  GRAPHQL_ENDPOINT: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT,
  API_KEY: process.env.GRAPHQL_API_KEY_MANUAL ? '[REDACTED]' : undefined
});

const client = new AppSyncClient({
  region: process.env.REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
} as AppSyncClientConfig);

// GraphQL queries and mutations
const LIST_PROFILES = print(gql`
  query ListProfiles($filter: ModelProfileFilterInput) {
    listProfiles(filter: $filter) {
      items {
        id
        channelArn
      }
    }
  }
`);

const LIST_STREAM_SESSIONS = print(gql`
  query ListStreamSessions($filter: ModelStreamSessionFilterInput) {
    listStreamSessions(filter: $filter) {
      items {
        id
        streamId
        status
      }
    }
  }
`);

const CREATE_RECORDING = print(gql`
  mutation CreateRecording($input: CreateRecordingInput!) {
    createRecording(input: $input) {
      id
      profileId
      streamSessionId
      recordingStatus
      recordingStatusReason
      s3BucketName
      s3KeyPrefix
      recordingDurationMs
      recordingSessionId
      startTime
      endTime
    }
  }
`);

const UPDATE_RECORDING = print(gql`
  mutation UpdateRecording($input: UpdateRecordingInput!) {
    updateRecording(input: $input) {
      id
      recordingStatus
      recordingStatusReason
      recordingDurationMs
      endTime
    }
  }
`);

// Add new mutation
const CREATE_STREAM_SESSION = print(gql`
  mutation CreateStreamSession($input: CreateStreamSessionInput!) {
    createStreamSession(input: $input) {
      id
      profileId
      streamId
      startTime
      status
      viewerCount
      duration
    }
  }
`);

// Helper function to execute GraphQL operations
async function executeGraphQL<T>(operation: string, variables: any): Promise<T> {
  if (!process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT) {
    throw new Error('AMPLIFY_DATA_GRAPHQL_ENDPOINT environment variable is not set');
  }

  if (!process.env.GRAPHQL_API_KEY_MANUAL) {
    throw new Error('GRAPHQL_API_KEY_MANUAL environment variable is not set');
  }

  console.log('Executing GraphQL operation:', {
    operation,
    variables,
    endpoint: process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT
  });

  const endpoint = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
  const apiKey = process.env.GRAPHQL_API_KEY_MANUAL;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        query: operation,
        variables
      })
    });

    console.log('GraphQL response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GraphQL error response:', errorText);
      throw new Error(`GraphQL request failed: ${response.statusText}. Response: ${errorText}`);
    }

    const result = await response.json() as GraphQLResponse<T>;
    console.log('GraphQL result:', JSON.stringify(result, null, 2));

    if (result.errors) {
      console.error('GraphQL errors:', JSON.stringify(result.errors, null, 2));
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    if (!result.data) {
      throw new Error('No data returned from GraphQL query');
    }

    return result.data;
  } catch (error) {
    console.error('Error in executeGraphQL:', error);
    throw error;
  }
}

export const handler = async (
  event: EventBridgeEvent<'IVS Recording State Change', IVSRecordingDetail>,
  context: Context
) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  console.log('Lambda context:', JSON.stringify(context, null, 2));
  
  try {
    const { detail } = event;
    console.log('Processing recording status:', detail.recording_status);

    switch (detail.recording_status) {
      case 'Recording Start': {
        console.log('Handling Recording Start event');
        // Extract channel ARN from resources array
        const channelArn = event.resources[0];
        console.log('Searching for profile with channel ARN:', channelArn);
        
        // Find profile by channel ARN
        const profilesData = await executeGraphQL<ListProfilesResponse>(LIST_PROFILES, {
          filter: {
            channelArn: { eq: channelArn }
          }
        });

        console.log('Found profiles:', JSON.stringify(profilesData, null, 2));
        const profile = profilesData.listProfiles.items[0];

        // Find active stream session
        const sessionsData = await executeGraphQL<ListStreamSessionsResponse>(LIST_STREAM_SESSIONS, {
          filter: {
            streamId: { eq: detail.stream_id },
            status: { eq: 'LIVE' }
          }
        });

        console.log('Found stream sessions:', JSON.stringify(sessionsData, null, 2));
        const streamSession = sessionsData.listStreamSessions.items[0];

        if (!profile) {
          console.error('Profile not found:', { profile });
          return {
            statusCode: 404,
            body: JSON.stringify({
              message: 'Profile not found',
              recordingStatus: detail.recording_status
            })
          };
        }

        // If no stream session found, create one
        let activeStreamSession = streamSession;
        if (!activeStreamSession) {
          console.log('No active stream session found, creating one...');
          const createSessionResult = await executeGraphQL<CreateStreamSessionResponse>(CREATE_STREAM_SESSION, {
            input: {
              profileId: profile.id,
              streamId: detail.stream_id,
              startTime: new Date().toISOString(),
              status: 'LIVE',
              viewerCount: 0,
              duration: 0
            }
          });
          console.log('Stream session created:', JSON.stringify(createSessionResult, null, 2));
          activeStreamSession = createSessionResult.createStreamSession;
        }

        // Create recording record
        console.log('Creating recording record...');
        const createRecordingResult = await executeGraphQL(CREATE_RECORDING, {
          input: {
            profileId: profile.id,
            streamSessionId: activeStreamSession.id,
            recordingStatus: 'STARTED',
            recordingStatusReason: detail.recording_status_reason,
            s3BucketName: detail.recording_s3_bucket_name,
            s3KeyPrefix: detail.recording_s3_key_prefix,
            recordingDurationMs: 0,
            recordingSessionId: detail.recording_session_id,
            startTime: new Date().toISOString(),
            endTime: null
          }
        });
        console.log('Recording record created:', JSON.stringify(createRecordingResult, null, 2));

        break;
      }
      
      case 'Recording End': {
        console.log('Handling Recording End event');
        // Find recording by session ID
        const recordingsData = await executeGraphQL<ListRecordingsResponse>(`
          query ListRecordings($filter: ModelRecordingFilterInput) {
            listRecordings(filter: $filter) {
              items {
                id
                recordingStatus
              }
            }
          }
        `, {
          filter: {
            recordingSessionId: { eq: detail.recording_session_id },
            recordingStatus: { eq: 'STARTED' }
          }
        });

        console.log('Found recordings:', JSON.stringify(recordingsData, null, 2));
        const recording = recordingsData.listRecordings.items[0];
        if (recording) {
          console.log('Updating recording:', recording.id);
          const updateResult = await executeGraphQL(UPDATE_RECORDING, {
            input: {
              id: recording.id,
              recordingStatus: 'COMPLETED',
              recordingStatusReason: detail.recording_status_reason,
              recordingDurationMs: detail.recording_duration_ms,
              endTime: new Date().toISOString()
            }
          });
          console.log('Recording updated:', JSON.stringify(updateResult, null, 2));
        }
        break;
      }
      
      case 'Recording Start Failure':
      case 'Recording End Failure': {
        console.log('Handling Recording Failure event');
        // Find recording by session ID
        const recordingsData = await executeGraphQL<ListRecordingsResponse>(`
          query ListRecordings($filter: ModelRecordingFilterInput) {
            listRecordings(filter: $filter) {
              items {
                id
                recordingStatus
              }
            }
          }
        `, {
          filter: {
            recordingSessionId: { eq: detail.recording_session_id }
          }
        });

        console.log('Found recordings for failure case:', JSON.stringify(recordingsData, null, 2));
        const recording = recordingsData.listRecordings.items[0];
        if (recording) {
          console.log('Updating failed recording:', recording.id);
          const updateResult = await executeGraphQL(UPDATE_RECORDING, {
            input: {
              id: recording.id,
              recordingStatus: 'FAILED',
              recordingStatusReason: detail.recording_status_reason,
              endTime: new Date().toISOString()
            }
          });
          console.log('Failed recording updated:', JSON.stringify(updateResult, null, 2));
        }
        break;
      }
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully processed recording status event',
        recordingStatus: detail.recording_status
      })
    };
    console.log('Returning response:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error('Error processing recording status event:', error);
    // Log the full error object for debugging
    const err = error as Error & {
      response?: unknown;
      request?: unknown;
    };
    
    interface ErrorDetails {
      name: string;
      message: string;
      stack?: string;
      response?: unknown;
      request?: unknown;
    }
    
    const errorDetails: ErrorDetails = {
      name: err.name,
      message: err.message,
      stack: err.stack
    };
    if (err.response) errorDetails.response = err.response;
    if (err.request) errorDetails.request = err.request;
    
    console.error('Full error details:', errorDetails);
    throw error;
  }
}; 