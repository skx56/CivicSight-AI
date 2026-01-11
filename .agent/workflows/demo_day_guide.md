---
description: Guide for presenting CivicSight AI at Demo Day
---

# CivicSight AI - Demo Day Guide

## ✅ System Status
- **Web Dashboard**: `http://localhost:3000` (Running)
- **Mobile App**: Local Expo Server (Port 8081) - Scan QR code to launch.
- **Backend Connection**: **Simulated (Demo Mode)**.
  - The system is currently configured to gracefully handle missing Supabase credentials.
  - **Data**: Mock data will auto-populate if the database is unreachable.
  - **AI Analysis**: Mock AI results will be returned if the Edge Function is unreachable.

## 🚀 Demo Flow

### 1. Web Dashboard (The "Control Center")
**Narrative**: "CivicSight AI gives city officials a real-time, bird's-eye view of infrastructure health."
- **Action**: Open `http://localhost:3000`.
- **Highlight**:
  - **Visuals**: Modern, glassmorphic UI.
  - **Map**: Interactive map showing current issue hotspots (e.g., San Francisco).
  - **Stats**: "Fiscal Savings" calculator. Show how adjusting "Manual Insp. Cost" updates the savings in real-time.
  - **PDF Report**: Click "Report ⬇ PDF" to generate an instant audit report.

### 2. Mobile App (The "Field Reporter")
**Narrative**: "Citizens and field workers can instantly report issues, even offline."
- **Action**: Open the app on your phone (via Expo Go).
- **Highlight**:
  - **AI Analysis**: Snap a picture. The app will "analyze" it (using our robust fallback if cloud AI is busy) and instantly identify the issue (e.g., Pothole), severity, and materials needed.
  - **Offline Mode**: Turn off your phone's WiFi/Data. Take a picture. Show the "Saved to Shadow Database" alert.
  - **Sync**: Reconnect and tap "Sync" (if visible) or explain how it syncs automatically.

### 3. Closing
**Narrative**: "CivicSight AI bridges the gap between physical infrastructure and digital management, saving cities millions in inspection costs."

## 🛠 Troubleshooting
- **Map not showing?**: Refresh the page. The initialization logic has been reinforced.
- **Data missing?**: The app will automatically generate 5 demo reports if it can't reach the server.
- **Mobile error?**: The app is set to "Mock Mode" for AI analysis to ensure a smooth demo even without backend connectivity.
