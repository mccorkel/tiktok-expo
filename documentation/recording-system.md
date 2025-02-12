# Recording System Documentation

## Overview
The recording system integrates Amazon IVS recording events with our application's database through EventBridge and Lambda functions. This system enables automatic tracking and management of stream recordings.

## Architecture

### Components
1. **Amazon IVS**
   - Generates recording status events
   - Manages recording storage in S3
   - Provides recording metadata

2. **EventBridge Rule**
   - Name: `IVSRecordingStatusRule`
   - Filters IVS recording events
   - Routes events to Lambda handler

3. **Lambda Handler**
   - Name: `RecordingStatusHandler`
   - Processes recording events
   - Updates database records
   - Handles error cases

4. **Database Models**
   - `StreamSession`: Tracks active streams
   - `Recording`: Stores recording metadata
   - `Profile`: Links recordings to users

## Event Flow

1. **Recording Start**
   - IVS starts recording stream
   - EventBridge receives `Recording Start` event
   - Lambda creates new Recording record
   - Sets initial recording metadata

2. **Recording End**
   - IVS completes recording
   - EventBridge receives `Recording End` event
   - Lambda updates Recording record
   - Adds duration and S3 location

3. **Recording Failure**
   - IVS encounters recording issue
   - EventBridge receives failure event
   - Lambda marks recording as failed
   - Stores error information

## Database Schema

### Recording Model
```typescript
Recording {
  profileId: string
  streamSessionId: string
  recordingStatus: STARTED | COMPLETED | FAILED
  recordingStatusReason: string
  s3BucketName: string
  s3KeyPrefix: string
  recordingDurationMs: number
  recordingSessionId: string
  startTime: string
  endTime: string
}
```

### StreamSession Model
```typescript
StreamSession {
  profileId: string
  streamId: string
  status: LIVE | ENDED | FAILED
  recordings: Recording[]
  startTime: string
  endTime: string
  viewerCount: number
  duration: number
}
```

## Error Handling

1. **Missing Profile**
   - Logs error with channel name
   - Skips recording creation
   - Maintains data integrity

2. **Missing Stream Session**
   - Logs error with stream ID
   - Skips recording creation
   - Prevents orphaned records

3. **Recording Update Failures**
   - Logs detailed error information
   - Maintains last known good state
   - Allows manual intervention

## Monitoring

### CloudWatch Metrics
- Lambda invocation counts
- Error rates
- Processing duration
- Event processing success rate

### CloudWatch Logs
- Event processing details
- Error messages
- Recording status changes
- Database operation results

## Testing

### Event Simulation
```bash
aws events put-events --entries file://test-events/recording-start.json
aws events put-events --entries file://test-events/recording-end.json
aws events put-events --entries file://test-events/recording-failure.json
```

### Database Queries
```typescript
// Check recording status
const { data: recordings } = await client.models.Recording.list({
  filter: {
    recordingSessionId: { eq: sessionId }
  }
});

// Get stream recordings
const { data: streamRecordings } = await client.models.Recording.list({
  filter: {
    streamSessionId: { eq: streamId }
  }
});
```

## Future Enhancements
1. Recording analytics and metrics
2. Automatic thumbnail generation
3. VOD playlist management
4. Recording retention policies
5. Automated error recovery

_Last updated: March 2024_ 