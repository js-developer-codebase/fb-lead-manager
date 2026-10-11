# Automated Facebook Lead Management & CRM Event Pipeline

> Real-time Facebook Lead Ads ingestion with sub-2-second acknowledgment, BullMQ & Redis background queuing, Multi-Ad Form Mapping (Project Name & Location), external CRM synchronization, and Meta Conversions API (CAPI) feedback loops.

---

## Architecture Overview

```text
  ┌────────────────────────────────────────────────────────┐
  │         Admin Dashboard (Vite + React SPA)             │
  │   - Multi-Ad Form Mapper (Form ID -> Project & Place)  │
  │   - Live CRM Payload Preview & Bulk Lead Re-dispatcher │
  │   - Leads Explorer & Telemetry Analytics               │
  └───────────────────────────┬────────────────────────────┘
                              │ REST API
  ┌───────────────────────────▼────────────────────────────┐
  │                 Express.js API Server                  │
  │   - Webhook Listener (GET/POST /api/webhooks/facebook) │
  │   - HMAC-SHA256 Signature Verification                 │
  │   - Fast 200 OK (< 500ms) Webhook Ingestion            │
  └─────────────┬───────────────────────────┬──────────────┘
                │ Enqueue Job               │ Upsert Record
                ▼                           ▼
       ┌─────────────────┐         ┌──────────────────┐
       │  BullMQ Queue   │         │ MongoDB Database │
       │ (Redis 7 Store) │         │ (Leads, Mappings)│
       └────────┬────────┘         └──────────────────┘
                │ Dequeue (5 retries with backoff)
                ▼
       ┌─────────────────┐
       │  Lead Worker    │
       └────────┬────────┘
     ┌──────────┴──────────┐
     │                     │
     ▼                     ▼
┌───────────────────┐  ┌────────────────────────────┐
│   External CRM    │  │   Meta Conversions API     │
│ (Custom REST API) │  │  (SHA-256 Hashed Feedback) │
└───────────────────┘  └────────────────────────────┘
```

---

## Core Feature: Multi-Ad Form Mapping Workflow

When running multiple Facebook Ads across different projects, properties, or locations:
1. Navigate to the **Ad Form Mapping** tab in the dashboard.
2. Select any Facebook Lead Ad Form (`form_id`) from the dropdown list.
3. Enter the **Project Name** (e.g. `Godrej Palm Retreat`) and **Location [Place]** (e.g. `Bangalore - Sarjapur Road`).
4. View the **Live CRM Payload Preview** updating in real time.
5. Click **"Save Mapping & Push Leads to CRM"**.
6. The system automatically:
   - Sets the mapping for all incoming leads on that form.
   - Retroactively enqueues all existing/unmapped leads from that form into the BullMQ worker for instant CRM dispatch.

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+ (v24 tested)
- MongoDB running locally or a MongoDB Atlas URI
- Redis running locally (`redis-server`) or in Docker

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm test            # Run automated unit tests
npm run dev         # Starts API on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev         # Starts Vite dev server on http://localhost:3000
```
Open **http://localhost:3000** in your browser to view the dashboard!

---

## Facebook Webhook Integration Setup

In your **Meta App Dashboard** (developers.facebook.com):
1. Add the **Webhooks** product and select **Page**.
2. Subscribe to the `leadgen` field.
3. Configure the Callback URL:
   - **Callback URL:** `https://your-domain.com/api/webhooks/facebook`
   - **Verify Token:** The string configured in `FB_VERIFY_TOKEN` (default: `mock_fb_verify_token_123` or your production token).
4. Meta will verify the handshake using `GET /api/webhooks/facebook` and begin delivering signed `POST` requests.

---

## Production Deployment (Hostinger VPS)

### Option A: Docker Compose (Recommended)
```bash
docker compose up -d --build
```
This launches 4 containers:
- `lead-pipeline-mongo` (MongoDB 7.0 database)
- `lead-pipeline-redis` (Redis 7.x queue store)
- `lead-pipeline-api` (Express webhook & management API)
- `lead-pipeline-worker` (BullMQ worker pool)

### Option B: PM2 Process Manager
1. Install PM2: `npm install -g pm2`
2. Build both services:
   ```bash
   cd backend && npm run build
   cd ../frontend && npm run build
   ```
3. Start PM2 cluster:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

---

## Automated Tests

Run the test suite in `backend/`:
```bash
cd backend
npm test
```
Verifies:
- AES-256-GCM token encryption at rest and decryption round-trip.
- Meta Conversions API (CAPI) SHA-256 email and phone normalization.
- Facebook `X-Hub-Signature-256` HMAC cryptographic validation.
- Form Mapper CRM payload assembly with injected Project Name and Location.
