import { generateClient } from '@aws-amplify/api';
import { Amplify } from '@aws-amplify/core';
import { schema } from './schema.mjs';

// Ensure environment variables are defined
const GRAPHQL_API_ENDPOINT = process.env.GRAPHQL_API_ENDPOINT;
const GRAPHQL_API_REGION = process.env.GRAPHQL_API_REGION;

if (!GRAPHQL_API_ENDPOINT || !GRAPHQL_API_REGION) {
  throw new Error('Required environment variables GRAPHQL_API_ENDPOINT and GRAPHQL_API_REGION must be set');
}

// Configure Amplify with the outputs
const config = {
  API: {
    GraphQL: {
      endpoint: GRAPHQL_API_ENDPOINT,
      region: GRAPHQL_API_REGION,
      defaultAuthMode: 'iam'
    }
  }
};

// Configure Amplify before generating client
Amplify.configure(config);
const client = generateClient({ schema });

async function findStreamSession(streamId) {
  const { data: sessions } = await client.models.StreamSession.list({
    filter: {
      streamId: { eq: streamId },
      status: { eq: 'LIVE' }
    }
  });
  return sessions[0] || null;
}

async function findProfile(channelArn) {
  const { data: profiles } = await client.models.Profile.list({
    filter: {
      channelArn: { contains: channelArn }
    }
  });
  return profiles[0] || null;
}

async function handleRecordingStart(detail) {
  const profile = await findProfile(detail.channel_name);
  if (!profile) {
    console.error(`Profile not found for channel: ${detail.channel_name}`);
    return;
  }

  const streamSession = await findStreamSession(detail.stream_id);
  if (!streamSession) {
    console.error(`Active stream session not found for stream: ${detail.stream_id}`);
    return;
  }

  // Create new recording record
  await client.models.Recording.create({
    profileId: profile.id,
    streamSessionId: streamSession.id,
    recordingStatus: 'STARTED',
    recordingStatusReason: detail.recording_status_reason,
    s3BucketName: detail.recording_s3_bucket_name,
    s3KeyPrefix: detail.recording_s3_key_prefix,
    recordingDurationMs: 0,
    recordingSessionId: detail.recording_session_id,
    startTime: new Date().toISOString(),
    endTime: null
  });
}

async function handleRecordingEnd(detail) {
  const { data: recordings } = await client.models.Recording.list({
    filter: {
      recordingSessionId: { eq: detail.recording_session_id },
      recordingStatus: { eq: 'STARTED' }
    }
  });

  const recording = recordings[0];
  if (!recording) {
    console.error(`Recording not found for session: ${detail.recording_session_id}`);
    return;
  }

  // Update recording with completion details
  await client.models.Recording.update({
    id: recording.id,
    recordingStatus: 'COMPLETED',
    recordingStatusReason: detail.recording_status_reason,
    recordingDurationMs: detail.recording_duration_ms,
    endTime: new Date().toISOString()
  });
}

async function handleRecordingFailure(detail) {
  const { data: recordings } = await client.models.Recording.list({
    filter: {
      recordingSessionId: { eq: detail.recording_session_id }
    }
  });

  const recording = recordings[0];
  if (recording) {
    // Update existing recording with failure
    await client.models.Recording.update({
      id: recording.id,
      recordingStatus: 'FAILED',
      recordingStatusReason: detail.recording_status_reason,
      endTime: new Date().toISOString()
    });
  } else {
    // Create new failed recording record
    const profile = await findProfile(detail.channel_name);
    const streamSession = await findStreamSession(detail.stream_id);
    
    if (!profile || !streamSession) {
      console.error('Profile or stream session not found for failed recording');
      return;
    }

    await client.models.Recording.create({
      profileId: profile.id,
      streamSessionId: streamSession.id,
      recordingStatus: 'FAILED',
      recordingStatusReason: detail.recording_status_reason,
      s3BucketName: detail.recording_s3_bucket_name,
      s3KeyPrefix: detail.recording_s3_key_prefix,
      recordingDurationMs: 0,
      recordingSessionId: detail.recording_session_id,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString()
    });
  }
}

export const handler = async (event) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    const { detail } = event;

    switch (detail.recording_status) {
      case 'Recording Start':
        await handleRecordingStart(detail);
        break;
      case 'Recording End':
        await handleRecordingEnd(detail);
        break;
      case 'Recording Start Failure':
      case 'Recording End Failure':
        await handleRecordingFailure(detail);
        break;
      default:
        console.error('Unknown recording status:', detail.recording_status);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully processed recording status event',
        recordingStatus: detail.recording_status
      })
    };
  } catch (error) {
    console.error('Error processing recording status event:', error);
    throw error;
  }
}; 