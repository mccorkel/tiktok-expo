import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../data/resource';
import { Context, EventBridgeEvent } from 'aws-lambda';

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

const client = generateClient<Schema>();

async function findStreamSession(streamId: string): Promise<Schema['StreamSession']['type'] | null> {
  const { data: sessions } = await client.models.StreamSession.list({
    filter: {
      streamId: { eq: streamId },
      status: { eq: 'LIVE' }
    }
  });
  return sessions[0] || null;
}

async function findProfile(channelName: string): Promise<Schema['Profile']['type'] | null> {
  const { data: profiles } = await client.models.Profile.list({
    filter: {
      channelArn: { contains: channelName }
    }
  });
  return profiles[0] || null;
}

async function handleRecordingStart(detail: IVSRecordingDetail) {
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
    recordingDurationMs: 0, // Will be updated when recording ends
    recordingSessionId: detail.recording_session_id,
    startTime: new Date().toISOString(),
    endTime: '' // Will be set when recording ends
  });
}

async function handleRecordingEnd(detail: IVSRecordingDetail) {
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

async function handleRecordingFailure(detail: IVSRecordingDetail) {
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

export async function handler(event: EventBridgeEvent<string, IVSRecordingDetail>, context: Context) {
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
} 