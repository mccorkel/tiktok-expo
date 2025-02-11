# IVS Recording Events Reference

## Overview
Amazon IVS (Interactive Video Service) sends EventBridge events when recording state changes occur. These events can be used to track stream status and manage VOD (Video on Demand) content.

## Recording State Change Events

### Event Types
There are four types of recording status events:
1. `Recording Start` - Stream has started recording
2. `Recording End` - Stream recording has ended normally
3. `Recording Start Failure` - Failed to start recording
4. `Recording End Failure` - Failed to end recording properly

### Event Structure
```json
{
    "version": "0",
    "id": "event-id",
    "detail-type": "IVS Recording State Change",
    "source": "aws.ivs",
    "account": "aws-account-id",
    "time": "timestamp",
    "region": "aws-region",
    "resources": [
        "channel-arn"
    ],
    "detail": {
        "recording_status": "Recording Start|Recording End|Recording Start Failure|Recording End Failure",
        "recording_status_reason": "",
        "recording_s3_bucket_name": "bucket-name",
        "recording_s3_key_prefix": "path/to/recording",
        "recording_duration_ms": 0,
        "channel_name": "channel-name",
        "stream_id": "stream-id",
        "recording_session_id": "session-id",
        "recording_session_stream_ids": [
            "stream-id"
        ]
    }
}
```

## Stream Status Management

### Status Mapping
- Set stream status to "Live" when:
  - Receiving `Recording Start` event
- Set stream status to "Offline" when receiving any of:
  - `Recording End`
  - `Recording Start Failure`
  - `Recording End Failure`

### VOD Access
The recording location in S3 can be constructed using:
- `recording_s3_bucket_name`
- `recording_s3_key_prefix`

Full S3 path format:
```
s3://{recording_s3_bucket_name}/{recording_s3_key_prefix}
```

## Implementation Notes

### EventBridge Rule Pattern
```json
{
    "source": ["aws.ivs"],
    "detail-type": ["IVS Recording State Change"],
    "detail": {
        "recording_status": ["Recording Start", "Recording End", "Recording Start Failure", "Recording End Failure"]
    }
}
```

### Lambda Handler Example
```javascript
exports.handler = async (event) => {
    const status = event.detail.recording_status;
    const channelName = event.detail.channel_name;
    
    // Stream status management
    const isLive = status === "Recording Start";
    const streamStatus = isLive ? "Live" : "Offline";
    
    // For VOD access (on Recording End)
    if (status === "Recording End") {
        const s3Bucket = event.detail.recording_s3_bucket_name;
        const s3KeyPrefix = event.detail.recording_s3_key_prefix;
        const recordingDuration = event.detail.recording_duration_ms;
        
        // Store VOD information for later access
        // s3://{s3Bucket}/{s3KeyPrefix}
    }
    
    // Update stream status in your database
    await updateStreamStatus(channelName, streamStatus);
};
```

## Key Points
1. Recording events provide both stream status and VOD information
2. S3 path for recordings is provided in the `Recording End` event
3. Recording duration is available in milliseconds
4. Each recording session has a unique `recording_session_id`
5. Multiple stream IDs can be associated with one recording session 