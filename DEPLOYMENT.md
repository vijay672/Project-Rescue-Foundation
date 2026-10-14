# Project Rescue Foundation — Production Deployment Architecture & Operations Manual

This document provides the end-to-end production deployment guide for the **Project Rescue Foundation** platform. It covers containerization, Celery asynchronous pipelines, ClamAV antivirus integration, Supabase private storage, and the credentials required for production launch.

---

## 1. Production Architecture Overview

```
                                  [ Internet / Clients ]
                                             │
                                             ▼
                             [ Nginx Reverse Proxy (Port 80/443) ]
                             ├── Static Assets (React 19 + Vite Cache)
                             └── /api/ ──► [ FastAPI Backend (Port 8000) ]
                                                   │
                ┌──────────────────────────────────┴──────────────────────────────────┐
                ▼                                                                     ▼
     [ PostgreSQL + PostGIS ]                                             [ Redis 7 Message Broker ]
    (Supabase or Self-Hosted)                                             (Auth, AOF Persistence)
                ▲                                                                     │
                │                                                    ┌────────────────┴────────────────┐
                │                                                    ▼                                 ▼
   [ Supabase Storage Vault ]                              [ Celery Worker Pool ]             [ Celery Beat ]
  ('foundation-media' private)                            (Concurrency: 4, ClamAV)       (15-min Compliance)
                                                                     │
                                                                     ▼
                                                          [ ClamAV Daemon (3310) ]
```

### Services Breakdown:
| Service | Runtime / Engine | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | Nginx 1.27 Alpine + React 19 Bundle | `80`, `443` | Edge reverse proxy, gzip compression, SPA routing, asset caching |
| **Backend** | Python 3.12 / FastAPI / Uvicorn | `8000` | REST API, PostGIS spatial queries, authentication & Celery task dispatch |
| **Worker** | Celery 5.4 / Python 3.12 | — | ClamAV antivirus scan, EXIF GPS sanitization, WebP image derivative generation |
| **Celery Beat** | Celery Beat 5.4 | — | Periodic cron tasks: 15-minute regional quota calculation & nightly audit rollups |
| **ClamAV** | ClamAV Enterprise Container | `3310` | Real-time byte signature inspection and malware quarantine engine |
| **Redis** | Redis 7 Alpine | `6379` | Celery message broker and distributed task result store |
| **Storage** | Supabase Storage (`foundation-media`) | `443` (HTTPS) | Private evidentiary blob storage guarded by PostgreSQL Row Level Security |

---

## 2. Credentials & Auth Requirements: What Is Needed From You

To run in production, here is the transparent breakdown of required credentials vs zero-cost components:

### Strictly Required From You:
1. **Supabase Project Credentials (Free Tier Supported)**:
   - **`VITE_SUPABASE_URL`**: e.g., `https://xyzcompany.supabase.co` (from *Project Settings -> API*)
   - **`VITE_SUPABASE_ANON_KEY`**: Client public anon key (browser safe)
   - **`SUPABASE_SERVICE_ROLE_KEY`**: Privileged backend key (from *Project Settings -> API*, never shared with clients)
   - **`DATABASE_URL`**: Direct connection URI for SQLAlchemy (from *Project Settings -> Database -> Connection string*)
   - *Cost*: $0 (Supabase Free tier provides 500MB DB + 1GB Storage + 50MB per-file upload ceiling).

2. **Domain & SSL / TLS Certificate**:
   - Point your DNS A record to your production server IP.
   - Use Let's Encrypt / Certbot or an AWS ACM certificate for HTTPS termination.

### 100% Free & Self-Hosted (ZERO Auth Credits or Paid Accounts Required):
- **Redis Message Broker**: Packaged into the Docker Compose container (`redis:7-alpine`) with internal auth. Zero external cost.
- **Celery Worker & Scheduler**: Fully packaged into `backend/Dockerfile` with Python 3.12. Zero external cost.
- **ClamAV Antivirus Daemon**: Runs as an isolated Docker container with automated `freshclam` daily signature definitions. Zero licensing cost.
- **PostGIS Geospatial Engine**: Included free within Supabase PostgreSQL or the local `postgis/postgis:16-3.4` container.
- **Geocoding (Reverse Geocoding)**: Uses OpenStreetMap / Nominatim API with standard User-Agent header. Zero Google Maps API billing required.
- **RBAC & Authentication**: Built-in cryptographic session management and Supabase Auth. No external paid identity provider required.

### Optional (Only if Deploying to Managed AWS Cloud via Terraform):
- **AWS Cloud Account**: Only needed if deploying via ECS Fargate / RDS / SQS rather than the single-VM Docker Compose script.

---

## 3. Production Deployment Options

### Option A: Turnkey Linux VM Deployment (Recommended)
Applicable to: AWS EC2, DigitalOcean Droplet, GCP Compute Engine, Hetzner, or Ubuntu/Debian server.

1. **Clone the repository and enter the directory**:
   ```bash
   git clone <repo-url> /opt/project-rescue
   cd /opt/project-rescue
   ```

2. **Configure production environment**:
   ```bash
   cp .env.production.example .env.production
   nano .env.production
   ```
   *(Fill in your `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL`)*.

3. **Execute the automated deployment script**:
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

The script will automatically:
- Verify Docker and Docker Compose runtimes
- Build optimized multi-stage container images
- Start `redis`, `clamav`, `backend`, `worker`, `celery_beat`, and `frontend`
- Run health checks against `/api/v1/health` and verify all services reach `healthy` status.

---

### Option B: AWS Cloud Deployment via Terraform
If deploying to AWS managed infrastructure:

1. **Configure AWS CLI credentials**:
   ```bash
   aws configure
   ```

2. **Deploy infrastructure**:
   ```bash
   cd terraform
   terraform init
   terraform plan -out=tfplan
   terraform apply tfplan
   ```
This provisions:
- AWS KMS Customer Managed Key
- Encrypted S3 Evidence bucket with public access block
- Amazon SQS FIFO/standard processing queues with DLQ
- AWS RDS PostgreSQL 16.3 with PostGIS
- AWS ECS Fargate cluster with CloudWatch logging and IAM task execution roles.

---

## 4. Supabase Storage Migration (`foundation-media`)

If you have not executed the storage bucket migration in your Supabase project, run the migration script:

```bash
# Option 1: Via Supabase CLI
supabase db push

# Option 2: Run directly in Supabase Dashboard -> SQL Editor
# Paste the contents of:
# supabase/migrations/20261014000004_supabase_storage_foundation_media.sql
```

This sets up:
1. Private `foundation-media` bucket (`public = false`) with 50MB per-file ceiling.
2. Allowed MIME types: JPEG, PNG, WebP, PDF, MP4.
3. Storage RLS policies restricting read access to original authors and operations managers with regional jurisdiction.

---

## 5. Health Checks & Production Verification

Verify your running stack with these probe commands:

- **Frontend Liveness**:
  ```bash
  curl -I http://YOUR_SERVER_IP/health
  # HTTP/1.1 200 OK
  ```

- **Backend Readiness**:
  ```bash
  curl http://YOUR_SERVER_IP/api/v1/health
  # {"status":"healthy","service":"project-rescue-api","database":"connected","celery":"active","clamav":"configured"}
  ```

- **Celery Worker & ClamAV Telemetry**:
  ```bash
  curl http://YOUR_SERVER_IP/api/v1/worker/health
  # Returns active workers, broker connectivity, queues, antivirus engine status, and task counters.
  ```

- **Container Logs**:
  ```bash
  docker compose -f docker-compose.prod.yml logs -f worker
  ```
