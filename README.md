# Project Rescue Foundation — Field Activity & Case Tracking Platform

A production-grade, offline-first, mobile-ergonomic Progressive Web App (PWA) and backend platform engineered for distributed caseworkers, operations managers, and administrators.

---

## Key Features

1. **Offline-First Resilience**: Full IndexedDB local storage engine via Dexie.js. Auto-saves drafts, queues submissions, caches historical cases, and preserves media blobs across browser sessions and reloads.
2. **Durable Synchronization**: Client UUID generation, idempotency deduplication (`idemp-*`), exponential backoff retry with jitter, and offline simulation toggle.
3. **Verified GNSS Positioning**: Real-time GPS coordinate capture, accuracy tolerance enforcement (&le; 50m), PostGIS formatting (`SRID=4326;POINT(...)`), and geofence verification.
4. **Supabase Storage Private Vault (`foundation-media`)**: Strict private bucket with 50 MB per-file limits, Web Cryptography API SHA-256 integrity verification, and 15-minute short-lived signed preview tokens.
5. **Role-Scoped Interfaces**:
   - **Field Staff**: One-handed mobile reporting, daily compliance tracking, history search, feedback inbox with read & acknowledgement receipts, and IndexedDB storage diagnostics.
   - **Operations Manager**: Executive metrics dashboard with Apache ECharts intake velocity curves, master-detail case review with approve/revision actions, PostGIS geographic theater visualizer, and team reporting compliance matrix.
   - **System Administrator**: User governance, regional clearance assignments, account suspension toggles, and tamper-evident cryptographic security audit log.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React PWA Client                     │
│  - Dexie.js (IndexedDB offline drafts & media blobs)   │
│  - Geolocation API (GNSS lock & accuracy tolerance)    │
│  - Web Crypto SHA-256 client integrity hashing         │
│  - Supabase JS Client & Short-Lived Signed URLs        │
└───────────────────────────┬────────────────────────────┘
                            │ Real Supabase SDK & REST v1
┌───────────────────────────▼────────────────────────────┐
│              Supabase Cloud Backend                    │
│  - Supabase Auth (Session restore, Password reset)     │
│  - PostgreSQL 16 + PostGIS Spatial Engine              │
│  - Strict Database & Object Row Level Security (RLS)   │
│  - Edge Functions (TypeScript / Deno)                  │
└───────────────────────────┬────────────────────────────┘
                            │
       ┌────────────────────┴───────────────────┐
       ▼                                        ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│   PostgreSQL + PostGIS    │         │  Supabase Storage Vault   │
│   - public.profiles       │         │  - Bucket: foundation-media│
│   - public.activities     │         │  - Strictly Private RLS   │
│   - public.media_assets   │         │  - 50 MB Free Plan Limit  │
│   - public.audit_records  │         │  - 15-Min Signed URLs     │
└───────────────────────────┘         └───────────────────────────┘
```

---

## Local Development Quickstart

### 1. Live Web Application
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the application.

### 2. Database Migrations
Migrations are managed in `supabase/migrations/`:
- `20261014000000_enable_postgis.sql` — PostGIS and cryptographic extensions
- `20261014000001_core_schema.sql` — Core database tables and relationships
- `20261014000002_row_level_security.sql` — PostgreSQL RLS policies
- `20261014000003_functions_views_indexes.sql` — Performance indexes, GiST spatial index, and analytics RPCs
- `20261014000004_supabase_storage_foundation_media.sql` — Private `foundation-media` bucket and storage object RLS policies

---

## Documentation Records
- `PROJECT_STATUS.md` — Current milestone status, file registry, and verification summary.
- `IMPLEMENTATION_PLAN.md` — Phased architectural sequence.
- `DECISIONS.md` — Architectural Decision Records (ADRs).
- `KNOWN_LIMITATIONS.md` — Browser sandbox constraints and mitigation strategies.
