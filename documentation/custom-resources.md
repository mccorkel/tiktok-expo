# Custom Resources in Amplify Gen 2

## Overview
Amplify Gen 2 allows you to use AWS CDK directly within your Amplify application to add custom resources and configurations beyond what Amplify provides out of the box.

## Key Concepts
- Uses AWS CDK for defining custom cloud resources
- Deploys infrastructure alongside Amplify backend
- Combines Amplify simplicity with CDK flexibility
- Uses constructs as building blocks

## Implementation Methods

### 1. Using Existing CDK Constructs
Add CDK constructs directly in your `amplify/backend.ts`:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';

const backend = defineBackend({
  auth,
  data
});

// Create a new stack for custom resources
const customResourceStack = backend.createStack('MyCustomResources');

// Add resources to the stack
new sqs.Queue(customResourceStack, 'CustomQueue');
new sns.Topic(customResourceStack, 'CustomTopic');
```

### 2. Creating Custom CDK Constructs
Create reusable components by defining custom constructs:

```typescript
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';

export class CustomNotifications extends Construct {
  public readonly topic: sns.Topic;

  constructor(scope: Construct, id: string, props: CustomNotificationsProps) {
    super(scope, id);
    
    // Create resources
    this.topic = new sns.Topic(this, 'NotificationTopic');
    
    // Add Lambda functions, permissions, etc.
  }
}
```

### 3. Using Custom Resources in Backend
Add custom constructs to your backend:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { CustomNotifications } from './custom/CustomNotifications/resource';

const backend = defineBackend({
  auth,
  data
});

// Create custom resources in a new stack
const customNotifications = new CustomNotifications(
  backend.createStack('CustomNotifications'),
  'CustomNotifications',
  { /* props */ }
);

// Export outputs if needed
backend.addOutput({
  custom: {
    topicArn: customNotifications.topic.topicArn
  }
});
```

## Best Practices

1. **Stack Organization**
   - Use `backend.createStack()` for custom resources
   - Group related resources in the same stack
   - Create multiple stacks for different concerns

2. **Resource Naming**
   - Use descriptive IDs for resources
   - Follow consistent naming conventions
   - Add descriptions to resources

3. **Permission Management**
   - Grant minimal required permissions
   - Use specific resource ARNs when possible
   - Document required IAM permissions

4. **Output Management**
   - Export important resource information
   - Use `backend.addOutput()` for values needed in the application
   - Document the purpose of each output

## Finding Resources
- Check [Construct Hub](https://constructs.dev/) for community constructs
- Use AWS CDK examples repository
- Reference AWS service-specific constructs

## Common Issues

1. **Type Errors**
   ```typescript
   // Incorrect
   const backend = defineBackend({
     name: 'my-backend' // Error: string not assignable
   });

   // Correct
   const backend = defineBackend({
     auth,
     data,
     customResources: (stack) => {
       // Add custom resources here
     }
   });
   ```

2. **Resource Access**
   ```typescript
   // Correct way to access function ARN
   const functionArn = stack.resolve(myFunction.functionArn);
   ```

## Additional Resources
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [Construct Hub](https://constructs.dev/)
- [AWS CDK Examples](https://github.com/aws-samples/aws-cdk-examples)

_Last updated: March 2024_ 