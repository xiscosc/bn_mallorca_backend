# BN Mallorca Backend - Claude Context

## Project Overview
Backend and infrastructure for the BN Mallorca Radio App. This is a serverless AWS CDK application built with TypeScript that provides APIs and background processing for a radio streaming application.

## Technology Stack
- **Infrastructure**: AWS CDK (TypeScript)
- **Runtime**: Node.js with TypeScript
- **AWS Services**: Lambda, DynamoDB, S3, SNS, SQS, Secrets Manager
- **External APIs**: Spotify API, Icecast metadata streaming
- **Testing**: Jest
- **Code Quality**: Biome (linter/formatter)

## Project Structure
```
bn_mallorca_backend/
├── bin/                    # CDK app entry point
├── lib/                    # CDK infrastructure code
│   ├── bn-mallorca-stack.ts
│   ├── bn-mallorca.ts
│   └── constructs/        # CDK constructs
├── src/
│   ├── function/          # Lambda function handlers
│   │   ├── album-art/    # Album art caching
│   │   ├── device/       # Device subscription management
│   │   ├── schedule/     # Radio schedule endpoints
│   │   └── track/        # Track metadata polling
│   ├── net/              # External service clients (S3, SNS, Spotify, etc.)
│   ├── repository/       # Data access layer (DynamoDB)
│   ├── types/            # TypeScript type definitions
│   └── config/           # Configuration
├── docs/                  # Architecture diagrams
└── open-api.v1.json      # API specification
```

## Key Features & Architecture

### Track Polling System
Continuously polls Icecast metadata streams to track currently playing songs. See `docs/pollingsongs.png` for architecture diagram.

### Album Art Caching
Fetches and caches album artwork using Spotify API and stores in S3. See `docs/albumartcache.png` for architecture.

### Device Subscriptions
Manages push notification subscriptions for mobile devices via SNS. See `docs/subscriptions.png` for architecture.

### Recent Changes
- Added Icecast metadata streaming support using `icecast-metadata-js`
- Improved track metadata parsing with artist name deduplication
- Enhanced character encoding handling in Icecast metadata
- Added 'promo' to track names in metadata updates

## Development Commands
```bash
# Build
npm run build

# Watch mode
npm run watch

# Run tests
npm test

# Linting
npm run biome        # Check code
npm run biome:fix    # Auto-fix issues

# CDK operations
npm run cdk deploy
npm run cdk synth

# Generate OpenAPI types
npm run generate:openapi
```

## Lambda Functions (11 total)
Located in `src/function/`:
- **Album Art**: Album artwork download and caching
- **Device**: Device registration, unsubscription, and push notification management
- **Schedule**: Radio schedule retrieval
- **Track**: Track metadata polling, queue management, and metadata updates

## Data Layer
Repositories in `src/repository/`:
- `device.repository.ts` - Device subscription data
- `schedule.repository.ts` - Radio schedule data
- `album-art.repository.ts` - Album art cache
- `track-list.repository.ts` - Track history
- `dynamo-repository.ts` - Base DynamoDB operations

## External Integrations
Files in `src/net/`:
- `spotify.ts` - Spotify Web API integration
- `metadata.ts` - Icecast metadata streaming
- `centova.downloader.ts` - Centova Cast integration
- `album-art.downloader.ts` - Album artwork downloading
- `s3.ts`, `sns.ts`, `lambda.ts`, `secrets-manager.ts` - AWS service clients

## Configuration
- `tsconfig.json` - TypeScript configuration with strict mode
- `cdk.json` - CDK app configuration
- `biome.json` - Linting and formatting rules
- `jest.config.json` - Test configuration
- `src/config/env.ts` - Environment variable handling

## API Documentation
The OpenAPI specification is available in `open-api.v1.json` with generated TypeScript types.

## Testing
Uses Jest with TypeScript support. Mock utilities available via `jest-mock-extended` and `jest-when`.

## Important Notes
- This is a worktree at: `/Users/xiscosastre/.claude-worktrees/bn_mallorca_backend/upbeat-boyd`
- Current branch: `upbeat-boyd`
- Main branch: `main`
- CI/CD: GitHub Actions workflow for AWS deployment (see `.github/`)

## Common Tasks

### Adding a New Lambda Function
1. Create handler in `src/function/<category>/<name>.lambda.ts`
2. Add construct in `lib/constructs/`
3. Wire up in `lib/bn-mallorca-stack.ts`
4. Update OpenAPI spec if it's an API endpoint

### Modifying Track Metadata Logic
Key files:
- `src/net/metadata.ts` - Icecast streaming and parsing
- `src/function/track/` - Track processing lambdas
- `src/types/icecast-metadata-js.d.ts` - Type definitions

### Working with DynamoDB
- Use repository pattern in `src/repository/`
- Extend `dynamo-repository.ts` for common operations
- Keep data access logic separate from Lambda handlers

## Dependencies of Note
- `@spotify/web-api-ts-sdk` - Spotify API client
- `icecast-metadata-js` - Icecast metadata stream parsing
- `lambda-log` - Structured logging
- `luxon` - Date/time handling
- `lodash` - Utility functions
- AWS SDK v3 clients for all AWS services
