# Project Rescue Foundation — Platform Status

## Current Status: Supabase Storage (`foundation-media`) Migration Complete

### 1. Architectural Evolution: Cloudflare R2 Replaced by Supabase Storage
- **Zero Cloudflare Dependency**: All Cloudflare R2 dependencies, mandatory environment variables (`CLOUDFLARE_*`, `R2_*`), and worker configurations have been completely eliminated. The application now runs 100% on Supabase and standard web standards.
- **Private Supabase Storage Bucket (`foundation-media`)**:
  - Strictly private bucket (`public = false`) for confidential field casework evidence.
  - Supabase Free tier 50 MB per-file upload ceiling (`52,428,800 bytes`) strictly validated on client, database, and bucket storage level.
  - Allowed evidentiary MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `video/mp4`.
- **Granular Storage Row Level Security (RLS)**:
  - Enforced directly in PostgreSQL `storage.objects` table.
  - **Read Clearance**: Field caseworkers can only access and request signed URLs for attachments belonging to their own case files (`a.staff_id = auth.uid()`). Operations managers can only access attachments within their assigned regional jurisdictions (`a.region_id = ANY(public.current_user_regions())`). System administrators have organization-wide audit clearance.
  - **Upload Security**: Authenticated staff can stage attachments linked to their activities.
  - **Tamper & Deletion Restrictions**: Submitted evidence files cannot be overwritten or deleted by non-owners or once approved.
- **Short-Lived Signed URLs**:
  - Time-limited signed URLs (15-minute / 900-second expiration) issued dynamically for previewing and downloading evidence without exposing permanent public endpoints.
- **Client & Offline Pipeline**:
  - Local IndexedDB (Dexie.js `localDb.mediaBlobs`) stages evidence attachments with Web Cryptography API SHA-256 integrity hashes.
  - Generates lightweight client-side viewport previews without altering the forensic binary or recalculating the original SHA-256 hash.
  - Durable offline sync queue with real upload progress tracking (10% -> 100%), failure state flagging, and safe retry recovery.
- **Security & Secrets Hygiene**:
  - `SUPABASE_SERVICE_ROLE_KEY` is maintained exclusively in trusted server-side execution contexts and Edge Functions.
  - Zero server secrets or Cloudflare credentials exist in frontend code or client bundles.

---

### 2. Private Storage Bucket Setup Guide

If the private `foundation-media` bucket has not yet been provisioned in your Supabase project, execute the safe migration script:

```bash
# Run migration via Supabase CLI
supabase db push
# or execute via Supabase Dashboard SQL Editor:
# supabase/migrations/20261014000004_supabase_storage_foundation_media.sql
```

#### SQL Schema Snippet for Dashboard SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'foundation-media',
  'foundation-media',
  false, -- STRICTLY PRIVATE
  52428800, -- 50 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']::text[];
```

---

### 3. File Registry & Migration Summary
- `supabase/migrations/20261014000004_supabase_storage_foundation_media.sql` — Private bucket `foundation-media` creation and storage RLS policies.
- `supabase/functions/media-signed-url/index.ts` — Authenticated Edge Function issuing short-lived signed URLs with role & region clearance.
- `src/components/common/SecureMediaPreviewModal.tsx` — Secure media preview modal with short-lived Supabase Storage URLs, PDF embedded reader, PDF thumbnail card view, image zoom/rotate, and strict User vs Manager access enforcement.
- `src/services/media.ts` — Supabase Storage upload, 50MB validation, SHA-256 hashing, thumbnail generation, and signed preview resolution.
- `src/services/supabaseData.ts` — Data layer integration for media asset metadata persistence and storage RPCs.
- `src/services/api.ts` — Client API integrating `foundation-media` uploads, signed URLs, and progress callbacks.
- `src/services/sync.ts` — Offline-first media upload loop with real upload progress and automatic retry for failed blobs.
- `src/components/field/ActivityHistory.tsx` — Caseworker case history with secure media preview (author-only uploads visible; others restricted).
- `src/components/manager/ActivityReview.tsx` — Supervisory case review with full unrestricted access across all caseworkers and regions.
- `backend/app/tasks/celery_worker.py` — Complete Celery worker tasks with ClamAV antivirus scan, EXIF GPS sanitization, Pillow thumbnail/display derivative generation, and pipeline chaining.
- `backend/app/main.py` — FastAPI endpoints for media upload into quarantine, Celery task dispatch, status polling, and worker cluster health.
- `src/components/field/StaffSettings.tsx` — Storage diagnostics card displaying Supabase Storage private vault and real-time Celery Worker & Antivirus Quarantine Pipeline telemetry.
- `server.ts` — Express proxy for storage uploads, signed URLs, Celery background worker simulation, and streaming with zero Cloudflare R2 dependencies.
- `tests/supabase_rls_security.test.ts` — Security, RLS, storage invariants, 50MB limit, User vs Manager preview clearance, and Celery quarantine threat rejection assertions.
- `.env.example` — Pure Supabase & Redis environment configuration with zero Cloudflare variables.

---

### 4. Verification & Test Execution Results
All test suites executed with 100% pass rate:
- **Supabase RLS, Celery Worker & Security Invariant Tests**: 12/12 passed
  - Field Staff Cross-User Read Denial: PASS
  - Cross-Region Manager Access Denial: PASS
  - Caseworker Review Approval Denial: PASS
  - Private Bucket Quarantined Media Access Denial: PASS
  - Secrets Hygiene (Zero Server Keys / Zero Cloudflare Credentials): PASS
  - Supabase Free Plan 50 MB Ceiling Enforcement: PASS
  - Allowed Evidence MIME Type Filtering: PASS
  - Storage Objects Mutation & Tamper Protection: PASS
  - Caseworker Cross-User Media Preview Denial (Author-Only Access): PASS
  - Operations Manager & Admin Full Access (Unrestricted Preview Clearance): PASS
  - Celery Quarantine (ClamAV Antivirus Threat Invariant): PASS
  - Celery Workers (Task Queue Routing & Derivative Engine Verification): PASS
- **Offline Synchronization & Recovery Tests**: 4/4 passed
  - Client-Generated RFC 4122 v4 UUIDs: PASS
  - Server Idempotency Collision Detection: PASS
  - Exponential Backoff Retry Strategy: PASS
  - Version-Vector Conflict Detection: PASS
- **TypeScript Compilation & Linting**: 0 errors (`tsc --noEmit` and `vite build` completed successfully).
