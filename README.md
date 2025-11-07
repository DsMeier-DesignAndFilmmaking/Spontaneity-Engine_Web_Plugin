# Spontaneity Platform

A modular travel event discovery platform with AI-powered event generation, built with Next.js, Firebase, Mapbox, and OpenAI.

## 🏗️ Repository Structure

This project follows a monorepo structure. See [REPO_STRUCTURE.md](./REPO_STRUCTURE.md) for detailed directory layout.

```
sponteneity/
├── engine/               # Core backend logic
├── api/                  # REST / GraphQL API
├── widget/               # Embeddable JS widget
├── ios-sdk/              # iOS SDK for B2B clients
├── android-sdk/          # Android SDK
├── insights/             # Analytics & reporting
├── edge/                 # Offline / caching layer
├── cli/                  # Developer tooling
└── demo/                 # Sample app / showcase (current Next.js app)
```

## 🚀 Getting Started

First, install dependencies:

```bash
npm install
```

Set up your environment variables in `.env.local`:

```env
# OpenAI
OPENAI_KEY=your_openai_key

# Mapbox
NEXT_PUBLIC_MAPBOX_KEY=your_mapbox_key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MSG_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📚 Documentation

- [Repository Structure](./REPO_STRUCTURE.md) - Detailed directory layout
- [Plugin API Documentation](./PLUGIN_API.md) - API endpoints and usage
- [Refactoring Summary](./REFACTOR_SUMMARY.md) - Architecture overview
- [Firebase Setup](./FIREBASE_SETUP.md) - Firebase configuration guide

## 🏗️ Architecture

The platform is built with a modular, plugin/API-ready architecture:

- **Services Layer** (`app/services/`) - Core business logic
- **API Routes** (`app/api/plugin/`) - HTTP endpoints
- **UI Components** - Consume API routes only

See [PLUGIN_API.md](./PLUGIN_API.md) for API documentation.

## 📦 Current Status

**✅ Implemented:**
- Core services (events, AI generation)
- Plugin API routes
- Next.js demo application
- Firebase integration
- Mapbox integration

**🚧 Planned:**
- Embeddable JS widget
- iOS/Android SDKs
- Analytics dashboard
- Offline/caching layer
- CLI tooling

## 🔧 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Maps**: Mapbox GL JS
- **AI**: OpenAI GPT-4o-mini
- **Styling**: Tailwind CSS

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines here]
