# CivicSight AI

<p align="center">
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge" />
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-61DAFB?style=for-the-badge" />
  <img alt="Expo" src="https://img.shields.io/badge/Expo-000020?style=for-the-badge" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge" />
  <img alt="Zod" src="https://img.shields.io/badge/Zod-374151?style=for-the-badge" />
</p>

<p align="center">
  <strong>A civic issue reporting platform with mobile capture, web dashboards, offline-aware workflows, and shared data contracts.</strong>
</p>

CivicSight AI connects field reporting with civic oversight. The system combines a mobile app for capturing issues, a web dashboard for visualization and reporting, shared schemas for consistency, and Supabase functions for backend processing.

## Core Capabilities

- Provides mobile issue capture with camera, location, file, and offline queue support.
- Renders a web dashboard with maps, charts, exports, and issue review.
- Shares typed schemas across web, mobile, and backend layers.
- Uses Supabase functions for image analysis and data workflows.

## Technical Architecture

The repository is a TypeScript monorepo with mobile, web, shared package, and Supabase function workspaces. Turbo coordinates development while shared Zod schemas keep client and backend contracts aligned.

## Architecture Diagram

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 55, "rankSpacing": 70, "curve": "basis"}, "themeVariables": {"fontSize": "16px", "fontFamily": "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"}}}%%
flowchart TD
  Mobile["Expo Mobile Reporter"] --> Shared["Shared Zod Schemas"]
  Web["Next.js Civic Dashboard"] --> Shared
  Shared --> Supabase["Supabase Data Layer"]
  Mobile --> Capture["Camera, Location, and<br/>Offline Queue"]
  Capture --> Supabase
  Supabase --> Functions["Supabase Functions"]
  Functions --> Analysis["Image Analysis Workflow"]
  Supabase --> Web
  Web --> Reports["Maps, Charts, and<br/>PDF Reports"]

  classDef inputs fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D,stroke-width:2.5px;
  classDef process fill:#ECFCCB,stroke:#65A30D,color:#365314,stroke-width:2.5px;
  classDef data fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A,stroke-width:2.5px;
  classDef agent fill:#FAE8FF,stroke:#C026D3,color:#701A75,stroke-width:2.5px;
  classDef output fill:#DCFCE7,stroke:#16A34A,color:#14532D,stroke-width:2.5px;
  class Mobile,Web inputs;
  class Shared,Capture,Functions process;
  class Supabase data;
  class Analysis,Reports output;
  linkStyle default stroke:#52525B,stroke-width:2.5px;
```

## Technology Stack

- Expo and React Native for the mobile application.
- Next.js and React for the web dashboard.
- Supabase for backend data and functions.
- Zod for shared validation schemas.
- Leaflet, Recharts, jsPDF, and offline queue utilities for reporting workflows.

## Repository Structure

- `apps/mobile` - Expo mobile application.
- `apps/web` - Next.js dashboard.
- `packages/shared` - Shared schemas and Supabase client.
- `supabase/functions/analyze-image` - Server-side image analysis workflow.
- `turbo.json` - Monorepo orchestration configuration.
- `package.json` - Workspace-level scripts.

## Getting Started

```bash
npm install
```

```bash
npm run dev
```

## Professional Context

This project demonstrates cross-platform product engineering, civic-tech workflow design, and typed monorepo architecture.
