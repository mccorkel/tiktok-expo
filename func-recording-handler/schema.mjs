export const schema = {
  models: {
    Profile: {
      type: {
        userId: 'string',
        displayName: 'string',
        bio: 'string',
        avatarUrl: 'string',
        channelArn: 'string',
        streamKeyArn: 'string',
        streamKeyValue: 'string',
        chatRoomArn: 'string',
        ingestEndpoint: 'string',
        playbackUrl: 'string',
        isLive: 'boolean',
        lastStreamedAt: 'string',
        receivedFollows: { type: 'hasMany', model: 'Follow', indexName: 'followeeId' },
        givenFollows: { type: 'hasMany', model: 'Follow', indexName: 'followerId' },
        streamSessions: { type: 'hasMany', model: 'StreamSession', indexName: 'profileId' },
        recordings: { type: 'hasMany', model: 'Recording', indexName: 'profileId' }
      }
    },
    StreamSession: {
      type: {
        profileId: 'string',
        profile: { type: 'belongsTo', model: 'Profile', indexName: 'profileId' },
        streamId: 'string',
        startTime: 'string',
        endTime: 'string',
        status: { type: 'enum', values: ['LIVE', 'ENDED', 'FAILED'] },
        recordings: { type: 'hasMany', model: 'Recording', indexName: 'streamSessionId' },
        viewerCount: 'integer',
        duration: 'integer'
      }
    },
    Recording: {
      type: {
        profileId: 'string',
        profile: { type: 'belongsTo', model: 'Profile', indexName: 'profileId' },
        streamSessionId: 'string',
        streamSession: { type: 'belongsTo', model: 'StreamSession', indexName: 'streamSessionId' },
        recordingStatus: { type: 'enum', values: ['STARTED', 'COMPLETED', 'FAILED'] },
        recordingStatusReason: 'string',
        s3BucketName: 'string',
        s3KeyPrefix: 'string',
        recordingDurationMs: 'integer',
        recordingSessionId: 'string',
        startTime: 'string',
        endTime: 'string'
      }
    }
  }
}; 