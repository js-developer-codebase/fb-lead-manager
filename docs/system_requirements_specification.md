# System Requirements Specification (SRS)
## Automated Facebook Lead Management & CRM Event Pipeline

---

## 1. Executive Summary
**Project Name:** Automated Facebook Lead Management & CRM Event Pipeline  
**Goal:** Capture real-time leads from Facebook Lead Ads via webhooks, store them securely in MongoDB, route them to an external CRM via background queues (BullMQ/Redis), and dispatch matching conversion events back to the Meta Conversions API to optimize ad targeting and performance.

---

## 2. High-Level System Architecture

```text
  ┌─────────────────────────────────────────────────────────┐
  │                      FRONTEND                           │
  │    Vite (React/Vue SPA) - Admin / Monitoring Dashboard  │
  └────────────────────────────┬────────────────────────────┘
                               │ HTTP / REST
  ┌────────────────────────────▼────────────────────────────┐
  │                      BACKEND                            │
  │              Express.js API Server                      │
  │  - Webhook Listener   - Auth / Settings                 │
  │  - Lead CRUD          - Facebook Token Manager          │
  └───────────┬────────────────┬─────────────────┬──────────┘
              │                │                 │
              │ Writes Lead    │ Adds Job        │ Cache/Queue
              ▼                ▼                 ▼
     ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
     │   MongoDB    │   │ BullMQ Queue │  │ Redis Server │
     │  (Database)  │   └──────┬───────┘  └──────────────┘
     └──────────────┘          │
                               │ Job Processing
                        ┌──────▼────────┐
                        │ BullMQ Worker │
                        └──────┬────────┘
             ┌─────────────────┴─────────────────┤
             │                                   │
             ▼                                   ▼
  ┌─────────────────────┐             ┌─────────────────────┐
  │   External CRM      │             │ Meta Conversions    │
  │   (API Push)        │             │ API (Feedback Loop) │
  └─────────────────────┘             └─────────────────────┘
```

---

## 3. Technology Stack Specification

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | **Vite + React / Vue** | Dashboard to view ingested leads, manual retries, API logs, and page connection settings. |
| **Backend API** | **Node.js + Express** | Handles incoming webhooks, validates requests, serves management API endpoints. |
| **Database** | **MongoDB (Mongoose)** | Stores lead records, page access tokens, mapping configurations, and queue event logs. |
| **Queue / Worker** | **Redis + BullMQ** | Handles async lead processing, Facebook Graph API fetching, CRM pushes, retries, and rate limiting. |
| **Deployment Target** | **Hostinger KVM VPS** | Required to run continuous Redis background instances and Node processes (Docker/PM2). |

---

## 4. Functional Requirements

### Module 1: Facebook Integration & Webhook Receiver
1. **Webhook Listener (`POST /api/webhooks/facebook`):**
   * Must acknowledge Facebook webhooks with a `200 OK` in **under 2 seconds** to prevent Facebook timeout retries.
   * Validates `X-Hub-Signature-256` header using the Facebook App Secret.
   * Extracts `leadgen_id`, `page_id`, and `form_id` from the payload.
2. **Access Token Management:**
   * Securely stores long-lived Facebook Page Access Tokens in MongoDB (encrypted at rest).
   * Provides an interface to test and renew Page Access Tokens.

### Module 2: Lead Processing & Queue Engine (BullMQ + Redis)
1. **Ingestion Queue:**
   * Express API pushes a `{ leadgen_id, page_id }` job into the BullMQ `lead-ingest` queue.
2. **Queue Worker:**
   * Calls Facebook Graph API (`GET /{leadgen_id}`) using the corresponding Page Access Token.
   * Maps custom form fields (e.g., `full_name`, `email`, `phone_number`) into standardized database schemas.
   * Checks MongoDB for duplicate `leadgen_id` to enforce idempotency.

### Module 3: CRM Integration Layer
1. **API Push:**
   * BullMQ worker sends the structured lead data to the target External CRM API.
2. **Retry Strategy:**
   * If the CRM API returns an error ($4xx / 5xx$) or times out, BullMQ automatically retries with **Exponential Backoff** (e.g., attempt 1: 5s, attempt 2: 30s, attempt 3: 5m).
   * Max attempts configurable (default: 5 retries).

### Module 4: Facebook Ad Optimization (Conversions API Feedback)
1. **Feedback Event Dispatcher:**
   * Once CRM push succeeds (or when lead stage changes in CRM), worker formats a payload for Meta Conversions API (`POST /v18.0/{pixel_id}/events`).
2. **Data Hashing & Privacy:**
   * Automatically hashes PII fields (Email, Phone Number) using **SHA-256** prior to sending events to Meta.
   * Passes `event_name` (`Lead` or `QualifiedLead`), `event_time`, and `lead_id` to maximize Event Match Quality (EMQ).

### Module 5: Admin Dashboard (Vite Frontend)
1. **Lead Monitoring:** Displays live table of incoming leads, sync status (`Pending`, `Synced`, `Failed`), and search/filter.
2. **Failed Job Manager:** Allows single-click manual job re-triggering for failed queues.
3. **Settings / Mapping:** Simple interface to map Facebook Lead Form field keys to CRM field keys.

---

## 5. Non-Functional Requirements

* **Performance:** System must handle up to 100 concurrent webhook bursts without dropping requests.
* **Reliability:** Data persistence ensured at every step (Raw payload saved to MongoDB before worker pickup).
* **Security:**
  * JWT authentication on Vite Dashboard routes.
  * Encrypted storage for API Keys and Access Tokens.
* **Environment Separation:** Configurable via `.env` for development and production environments.

---

## 6. MongoDB Schema Blueprint

### `Leads` Schema Example
```javascript
const LeadSchema = new mongoose.Schema({
  leadgenId: { type: String, unique: true, required: true },
  pageId: { type: String, required: true },
  formId: { type: String },
  leadData: { type: Object }, // Raw lead fields from Facebook
  status: { type: String, enum: ['PENDING', 'SYNCED_CRM', 'FAILED'], default: 'PENDING' },
  crmResponse: { type: Object },
  fbConversionSent: { type: Boolean, default: false },
  retryCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
```

---

## 7. Hosting & Deployment Setup (Hostinger VPS)

Since you are using **Redis + BullMQ**, standard shared hosting will not work. Deploy this stack on a **Hostinger KVM VPS** using standard process management:

1. **Database:** Use **MongoDB Atlas** (Free/Starter tier) or run MongoDB locally on the VPS.
2. **Cache / Queue Engine:** Run **Redis Server** locally on the VPS (`sudo apt install redis-server`) or via a Docker container.
3. **App Execution:** Use **PM2** to keep Express running and manage worker threads:
   * Process 1: `pm2 start server.js --name "express-api"` (Handles webhooks + Vite frontend static build).
   * Process 2: `pm2 start worker.js --name "bullmq-worker"` (Processes background queue jobs).