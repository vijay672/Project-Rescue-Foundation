# Project Rescue Foundation — Architectural Decisions Record (ADR)

## ADR-01: Offline-First Persistence via IndexedDB (Dexie.js)
- **Context**: Caseworkers operate in remote border corridors with intermittent cellular coverage.
- **Decision**: Use Dexie.js over raw IndexedDB for robust transactions, compound index queries, and type-safe schema versioning.
- **Consequences**: Drafts and media blobs persist across browser reloads. Unsynced data is never lost when the app shell is closed.

## ADR-02: Client-Generated UUIDs & Idempotency Keys
- **Context**: Unstable cellular connectivity leads to dropped network connections during HTTP requests, resulting in potential retries.
- **Decision**: All entities generate UUIDv4 client-side and attach `idempotencyKey: idemp-{uuid}`.
- **Consequences**: Server recognizes retransmitted payloads and returns the existing resource without generating duplicates.

## ADR-03: PostGIS Spatial Standard (SRID 4326)
- **Context**: Location data represents sensitive evidence in anti-trafficking operations.
- **Decision**: Store all geospatial coordinates as WGS 84 `Geometry(Point, 4326)` with explicit hardware accuracy metadata and capture timestamps.
- **Consequences**: Seamless spatial clustering, boundary geofencing, and accurate distance queries.

## ADR-04: S3 Quarantine with Asynchronous Malware Scanning
- **Context**: Attachments may include external PDFs, photos, or documents.
- **Decision**: Newly uploaded media lands in private quarantine storage. Celery background workers run ClamAV scans and generate derivatives before marking assets clean.
- **Consequences**: Prevents malicious payloads from being distributed to review managers or other clients.

## ADR-05: Zero-Pill Editorial Design Discipline
- **Context**: Humanitarian operational platforms require calm, high-contrast, uncluttered interfaces.
- **Decision**: Adhere strictly to the Universal Frontend Design Constitution: unboxed metadata separated by typographic dots (`·`), single-elevation cards, high contrast, tabular figures (`font-mono tabular-nums`), and thumb-zone ergonomics.

## ADR-06: Migration from Cloudflare R2 to Private Supabase Storage (`foundation-media`)
- **Context**: External Cloudflare R2 billing setup was unavailable, and introducing extra paid cloud services (GCS, AWS, Firebase) violates operational constraints. The platform already maintains an active Supabase project with PostgreSQL, PostGIS, and Authentication.
- **Decision**: Consolidate all object storage into a dedicated private Supabase Storage bucket named `foundation-media`. Enforce strict PostgreSQL Row Level Security (RLS) on `storage.objects` for caseworker ownership and region-scoped manager clearance. Enforce Supabase Free tier 50 MB per-file limits and issue short-lived (15-minute) signed URLs for authorized previews.
- **Consequences**: Zero third-party cloud credentials or billing dependencies required. Complete consolidation into Supabase ecosystem with uniform authentication, permission models, and audit logs.

