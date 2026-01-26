# Developer Guide - Group Guard

Welcome to the **Group Guard** development guide. This document provides instructions for setting up your environment, running the application, and understanding the core architecture.

## Prerequisites

- **Node.js**: v16 or higher
- **npm**: v8 or higher
- **VRChat Account**: Required for logging in and testing API integration.

## Setup

1.  **Install Dependencies**

    ```bash
    npm install
    ```

2.  **Environment Variables**
    No complex environment setup is required for local development. The app uses `electron-store` for local configuration.

## Running the Application

### Development Mode

To run the Electron app with hot-reloading (Vite + Electron):

```bash
npm run dev
```

This starts the Vite dev server for the renderer and launches the Electron main process.

### Production Build

To create a production-ready build:

```bash
npm run build
```

The output will be in the `dist` or `release` folder (depending on builder config).

## Testing

We use **Vitest** for unit and integration testing.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Architecture Overview

Group Guard is an Electron application built with React.

### Core Structure

- **`electron/`**: Main process code.
  - **`main.ts`**: Application entry point.
  - **`services/`**: Core business logic (see below).
  - **`preload.ts`**: Context bridge for secure communication between Main and Renderer.
- **`src/`**: Renderer process code (React UI).
  - **`components/`**: Reusable UI components.
  - **`features/`**: Feature-specific views (Live, Dashboard, AutoMod).
  - **`hooks/`**: Custom React hooks.

### Key Services (`electron/services/`)

The application logic is centralized in singleton services running in the Main process:

- **`AuthService`**: Handles VRChat authentication, session management, and 2FA.
- **`AutoModService`**: The core moderation engine.
  - Caches rules and regexes for performance.
  - Evaluates users against defined rules.
  - Handles auto-kicks/bans.
- **`VRChatApiService`**: Typed wrapper around the VRChat SDK.
- **`PipelineService`**: Manages the VRChat WebSocket pipeline connections.
- **`LogWatcherService`**: Monitors VRChat log files for realtime events.

## Contributing

1.  Create a feature branch.
2.  Ensure code passes strict linting (no `any` types allowed in core services).
3.  Add unit tests for new logic in `services/`.
4.  Run `npm test` before pushing.
