# IVS Real-Time Streaming Implementation

## Key Concepts

### Stage
- A virtual space where participants can exchange video in real-time
- Each user will have their own stage (channel) created upon first login
- Stages can be tagged for organization and access control

### Participant Token
- Authenticates a participant when they join a stage
- 1:1 mapping between participant tokens and participants
- Contains participant ID and capabilities

### Components Needed
1. Stage Management
2. Participant Management
3. RTMP Endpoint Configuration
4. Client-Side Stream Setup

## Implementation Plan

### 1. Stage Creation Flow
1. Check for user's stage on login
2. If no stage exists:
   - Create new stage with user's profile info
   - Tag stage with user ID for management
   - Store stage ARN in user's profile
3. If stage exists:
   - Validate stage is active
   - Update stage if necessary

### 2. Required SDK Setup
```typescript
import { 
  IVSRealTimeClient, 
  CreateStageCommand,
  GetStageCommand,
  CreateParticipantTokenCommand 
} from "@aws-sdk/client-ivs-realtime";

const client = new IVSRealTimeClient({ region: "us-east-1" });
```

### 3. Stage Creation Parameters
```typescript
const createStageParams = {
  name: string,            // Required: Unique name for the stage
  tags?: {                 // Optional: Key-value pairs for organization
    [key: string]: string
  },
  participantTokenConfigurations: [  // Required: At least one configuration
    {
      userId: string,               // Unique identifier for the participant
      capabilities: [               // Permissions for the participant
        "PUBLISH_VIDEO",           // Can publish video
        "PUBLISH_AUDIO",          // Can publish audio
        "SUBSCRIBE_VIDEO",       // Can view others' video
        "SUBSCRIBE_AUDIO"       // Can hear others' audio
      ]
    }
  ]
};
```

### 4. Stage Response Structure
```typescript
interface StageResponse {
  arn: string;              // Stage ARN
  name: string;             // Stage name
  participantTokenConfigurations: {
    userId: string;
    capabilities: string[];
  }[];
  tags?: {
    [key: string]: string;
  };
  truncatedParticipantTokenConfigurations?: boolean;
}
```

## Security Considerations

### Access Control
1. Stage ownership verification
2. Participant token management
3. Capability restrictions based on user role

### Best Practices
1. Use unique stage names (e.g., `user-${userId}-stage`)
2. Implement proper error handling for stage operations
3. Clean up unused stages
4. Monitor stage usage and participants

## Required IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ivs:CreateStage",
        "ivs:GetStage",
        "ivs:UpdateStage",
        "ivs:DeleteStage",
        "ivs:CreateParticipantToken",
        "ivs:TagResource",
        "ivs:UntagResource",
        "ivs:ListTagsForResource"
      ],
      "Resource": "*"
    }
  ]
}
```

## Implementation Steps

1. **Profile Model Update**
   - Add stageArn field to store user's stage reference
   - Add streaming status indicators

2. **Stage Management Service**
   - Create stage management functions
   - Handle stage lifecycle
   - Manage participant tokens

3. **Client Integration**
   - Implement stage connection logic
   - Handle streaming state
   - Manage participant interactions

4. **Error Handling**
   - Stage creation failures
   - Connection issues
   - Token expiration
   - Participant disconnections

## Code Structure

```typescript
// Types
interface UserStage {
  arn: string;
  name: string;
  status: 'active' | 'inactive';
  participantTokens: {
    [userId: string]: string;
  };
}

// Stage Management
async function ensureUserStage(userId: string): Promise<UserStage> {
  // Check existing stage
  // Create if doesn't exist
  // Return stage info
}

async function createUserStage(userId: string): Promise<UserStage> {
  // Create stage with proper configuration
  // Tag stage with user info
  // Return stage info
}

async function getParticipantToken(
  stageArn: string, 
  userId: string
): Promise<string> {
  // Generate participant token for stage access
}
```

## Testing Checklist

- [ ] Stage creation on first login
- [ ] Stage retrieval for existing users
- [ ] Participant token generation
- [ ] Stream publishing
- [ ] Stream viewing
- [ ] Error handling
- [ ] Cleanup processes

## References

- [IVS Real-Time Client Documentation](https://www.npmjs.com/package/@aws-sdk/client-ivs-realtime)
- [CreateStageCommand API](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ivs-realtime/command/CreateStageCommand/)
- [Stage Input Parameters](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-ivs-realtime/Interface/CreateStageCommandInput/)
- [Stage Output Structure](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-ivs-realtime/Interface/CreateStageCommandOutput/) 