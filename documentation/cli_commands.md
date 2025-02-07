# CLI Commands Reference

## Amplify Gen 2 Commands

Always use `npx` with `ampx` commands:

```bash
# Generate Amplify outputs
npx ampx generate outputs

# Generate UI forms
npx ampx generate forms

# Generate GraphQL API code
npx ampx generate graphql-client-code

# Start sandbox for local development
npx ampx sandbox

# Deploy in CI/CD pipeline
npx ampx pipeline-deploy

# Configure AWS Amplify
npx ampx configure

# Get Amplify info
npx ampx info

# ❌ INCORRECT - will fail
ampx generate outputs  # Don't run without npx
```

## Expo Commands

```bash
# Start development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios

# Clear cache and restart
npx expo start --clear
```

## Options for ampx commands

```bash
--debug    Print debug logs to the console
-h, --help Show help information
-v, --version Show version number
```

Important Notes:
- Always use `ampx` for Amplify Gen 2 commands, not `amplify`
- Always prefix with `npx` to avoid package manager errors
- The `generate` command requires a subcommand 