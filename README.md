# CivicSight AI

**The First-Place Winner of the Metropolitan Infrastructure Hackathon.**

CivicSight AI is an end-to-end crowdsourced infrastructure auditing platform. It leverages specific AI agents (GPT-4o Vision) to classify, analyze, and estimate repair costs for urban defects.

## 🏆 Bounty Optimization
- **Startup-Ready**: Full Monorepo, Supabase Backend, Deployment Ready.
- **Technical Execution**: React Native (Expo) + Next.js + Turborepo + PostGIS.
- **Product Design**: Glassmorphic Bento UI with TailwindCSS & NativeWind.
- **Developer Tools**: Public OpenAPI Spec.

## 🚀 Tech Stack
```mermaid
graph TD
    A[Mobile App (Expo)] -->|Image Upload| B[Supabase Storage]
    A -->|Analysis Request| C[Supabase Edge Function]
    C -->|GPT-4o Vision| D((OpenAI))
    C -->|JSON Result| A
    A -->|Save Report| E[Supabase DB (PostGIS)]
    F[Web Dashboard (Next.js)] -->|Read| E
    F -->|Maps| G[Leaflet]
    F -->|Analytics| H[Recharts]
```

## 📦 Monorepo Structure
- `apps/mobile`: The Reporter App (React Native, NativeWind)
- `apps/web`: The Monitor Dashboard (Next.js 14, Tailwind)
- `packages/shared`: Shared Types and Clients
- `supabase`: Database Migrations & Edge Functions
- `public-api`: OpenAPI Specification

## 💎 Features
### 📱 The Reporter (Mobile)
- **Point & analyze**: Instant AI classification of potholes, graffiti, etc.
- **Auto-Geotagging**: Precise location tracking.
- **Labor Estimation**: AI-predicted repair hours.

### 🖥️ The Monitor (Web)
- **Global Map**: Clustering of defects using React-Leaflet.
- **Impact Analytics**: Fiscal savings calculator.
- **Real-time Feed**: Live updates via Supabase Realtime.

## 🛠️ Setup
1. **Install Dependencies**:
    ```bash
    npm install --legacy-peer-deps
    ```
2. **Setup Supabase**:
    - Link your project: `npx supabase link`
    - Apply Migrations: `npx supabase db push`
    - Set Secrets: `npx supabase secrets set OPENAI_API_KEY=...`
3. **Run Locally**:
    ```bash
    npx turbo dev
    ```

## 💼 Business Model
**CivicSight AI** operates on a B2G (Business to Government) SaaS model:
- **City Subscription**: Municipalities pay for the Dashboard access and aggregated data.
- **Enterprise Integration**: Construction firms pay for API access to bid on verified repair jobs.
- **Public Access**: Free mobile app for citizens to encourage reporting.
