# Repository & Directory Structure

This document describes the monorepo structure for the Spontaneity platform.

## Repository Structure

```
sponteneity/
├── engine/               # Core backend logic
│   ├── services/         # Business logic services
│   │   ├── events.ts     # Event CRUD operations
│   │   ├── ai.ts         # AI event generation
│   │   └── auth.ts       # Authentication services
│   ├── lib/              # Shared utilities
│   │   ├── firebase.ts   # Firebase configuration
│   │   ├── helpers.ts    # Helper functions
│   │   └── types.ts      # TypeScript types
│   └── config/           # Configuration files
│
├── api/                  # REST / GraphQL API
│   ├── plugin/           # Plugin API routes
│   │   ├── fetch-events/ # GET events endpoint
│   │   ├── submit-event/ # POST events endpoint
│   │   ├── update-event/ # PATCH events endpoint
│   │   ├── delete-event/ # DELETE events endpoint
│   │   └── generate-event/ # AI event generation
│   ├── graphql/          # GraphQL schema & resolvers (future)
│   └── middleware/       # API middleware (auth, rate limiting)
│
├── widget/               # Embeddable JS widget
│   ├── src/              # Widget source code
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   └── utils/        # Utility functions
│   ├── dist/             # Built widget files
│   └── package.json      # Widget package config
│
├── ios-sdk/              # iOS SDK for B2B clients
│   ├── Sources/          # Swift source files
│   ├── Tests/            # Unit tests
│   ├── Examples/         # Sample implementations
│   └── Package.swift     # Swift Package Manager config
│
├── android-sdk/          # Android SDK
│   ├── src/              # Kotlin/Java source
│   ├── test/              # Unit tests
│   ├── examples/          # Sample implementations
│   └── build.gradle       # Gradle configuration
│
├── insights/             # Analytics & reporting
│   ├── dashboard/        # Analytics dashboard
│   ├── reports/           # Report generators
│   ├── queries/          # Data queries
│   └── exports/           # Data export handlers
│
├── edge/                 # Offline / caching layer
│   ├── cache/            # Caching strategies
│   ├── sync/             # Data synchronization
│   ├── offline/           # Offline mode handlers
│   └── workers/           # Edge workers
│
├── cli/                  # Developer tooling
│   ├── commands/         # CLI commands
│   ├── templates/         # Code templates
│   ├── generators/       # Code generators
│   └── bin/               # Executable scripts
│
└── demo/                 # Sample app / showcase
    ├── app/               # Next.js app directory
    │   ├── components/    # React components
    │   ├── pages/         # Page components
    │   └── api/           # API routes (demo)
    ├── public/            # Static assets
    └── package.json       # Demo dependencies
```

## Directory Descriptions

### `engine/`
Core backend business logic and services. This is where all the core functionality lives that can be shared across different platforms and APIs.

**Key Responsibilities:**
- Business logic implementation
- Data validation
- Service layer abstractions
- Shared utilities and helpers
- Type definitions

### `api/`
REST and GraphQL API endpoints. This layer exposes the engine services as HTTP endpoints.

**Key Responsibilities:**
- HTTP request/response handling
- API route definitions
- Request validation
- Authentication/authorization middleware
- Rate limiting
- Error handling

### `widget/`
Embeddable JavaScript widget that clients can integrate into their websites.

**Key Responsibilities:**
- Standalone React component bundle
- API integration
- Styling and theming
- Distribution via CDN or npm

### `ios-sdk/`
Native iOS SDK for B2B clients building native iOS applications.

**Key Responsibilities:**
- Swift package for iOS integration
- Native API bindings
- iOS-specific UI components (optional)
- Documentation and examples

### `android-sdk/`
Native Android SDK for B2B clients building native Android applications.

**Key Responsibilities:**
- Kotlin/Java library for Android integration
- Native API bindings
- Android-specific UI components (optional)
- Documentation and examples

### `insights/`
Analytics, reporting, and data visualization tools.

**Key Responsibilities:**
- Event analytics
- User behavior tracking
- Custom report generation
- Data aggregation and export

### `edge/`
Edge computing layer for offline support, caching, and performance optimization.

**Key Responsibilities:**
- Client-side caching strategies
- Offline mode support
- Data synchronization
- Edge worker implementations
- Service worker management

### `cli/`
Command-line tools for developers to interact with the platform.

**Key Responsibilities:**
- Code generation
- Project scaffolding
- API key management
- Testing utilities
- Deployment tools

### `demo/`
Reference implementation and showcase application.

**Key Responsibilities:**
- Full-featured example app
- Integration examples
- Best practices demonstration
- Testing playground

## Current Implementation Status

**✅ Implemented:**
- `engine/services/` - Core services (events, AI)
- `api/plugin/` - Plugin API routes
- `demo/` - Next.js demo application

**🚧 Planned:**
- `widget/` - Embeddable JS widget
- `ios-sdk/` - iOS SDK
- `android-sdk/` - Android SDK
- `insights/` - Analytics dashboard
- `edge/` - Offline/caching layer
- `cli/` - Developer tooling

## Migration Path

The current Next.js application (`travel-ai-platform`) maps to:

- **Engine services** → `engine/services/`
- **API routes** → `api/plugin/`
- **Frontend components** → `demo/app/components/`
- **Shared utilities** → `engine/lib/`

Future migration will involve:
1. Extracting services to `engine/`
2. Moving API routes to `api/`
3. Creating standalone widget from components
4. Building platform-specific SDKs
5. Adding analytics and edge layers

