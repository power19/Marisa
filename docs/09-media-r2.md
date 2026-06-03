# 09 — Media & R2 Storage

> Read this before writing any code that uploads, retrieves, or references files in R2.
> Three services touch R2 — all must follow the same conventions or files will be
> unreadable or misconfigured across services.

---

## Bucket structure

One R2 bucket. Files are organized by prefix (acts like folders):

```
listings/
  {listing_id}/
    photos/         # listing photos (public)
    floorplans/     # floor plan images (public)
    brochures/      # PDF brochures (public)

pm/
  receipts/
    {payment_id}/receipt.pdf        # tenant receipt (private)
  statements/
    {statement_id}/statement.pdf    # owner statement (private)
  id_documents/
    {tenant_id}/id_doc              # tenant ID document (PRIVATE — most sensitive)

maintenance/
  tickets/
    {ticket_id}/
      {photo_index}.jpg             # maintenance photos (private)
```

---

## Public vs private

| Prefix | Access | How served |
|---|---|---|
| `listings/*` | **Public** | Direct CDN URL via `R2_PUBLIC_URL` |
| `pm/receipts/*` | **Private** | Pre-signed URL, TTL ≤ 15 min |
| `pm/statements/*` | **Private** | Pre-signed URL, TTL ≤ 15 min |
| `pm/id_documents/*` | **Private — RESTRICTED** | Pre-signed URL, TTL ≤ 15 min, admin only |
| `maintenance/*` | **Private** | Pre-signed URL, TTL ≤ 15 min |

**Never generate a public URL for anything under `pm/` or `maintenance/`.**
**Never store a pre-signed URL in the database** — generate them on demand at request time.

---

## File naming conventions

- Use the entity UUID as the directory, not a sequential ID.
- Filenames: lowercase, hyphens only, no spaces. Keep original extension.
- For receipts and statements, always use a fixed filename (`receipt.pdf`, `statement.pdf`)
  inside the UUID directory — makes re-generation idempotent (overwrite the existing file).
- Listing media: preserve original filename but sanitize it (strip special chars, lowercase).

---

## Which service does what

| Action | Service | Notes |
|---|---|---|
| Listing photos / floorplans / brochures upload | **Directus** | Directus file management handles this natively via its storage adapter |
| Receipt PDF upload | **FastAPI (pm)** | `pm/app/services/r2_service.py` |
| Owner statement PDF upload | **FastAPI (pm)** | `pm/app/services/r2_service.py` |
| Tenant ID document upload | **FastAPI (pm)** | `pm/app/services/r2_service.py` — restricted |
| Maintenance photo upload | **FastAPI (pm)** | `pm/app/services/r2_service.py` |
| Saved-search alert email — no attachments | **Worker** | No R2 interaction |
| Statement email with PDF attachment | **Worker** | Fetches PDF from R2 via pre-signed URL, attaches to email |

**Directus is the only service that should upload listing media.** Next.js never uploads directly to R2.

---

## R2 client (FastAPI / worker)

Use `boto3` with the R2 endpoint configured:

```python
import boto3

s3 = boto3.client(
    "s3",
    endpoint_url=settings.R2_ENDPOINT,
    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
    region_name="auto",
)
```

All R2 operations are encapsulated in `pm/app/services/r2_service.py`. No other file in
`pm` or `worker` should import `boto3` directly — go through the service.

### Key functions to implement in `r2_service.py`
```python
async def upload_file(key: str, data: bytes, content_type: str) -> str:
    """Upload bytes to R2. Returns the R2 key."""

async def generate_presigned_url(key: str, ttl_seconds: int = 900) -> str:
    """Generate a pre-signed GET URL. Default TTL 15 min."""

async def delete_file(key: str) -> None:
    """Delete a file from R2."""
```

---

## Directus R2 configuration

Directus uses the S3-compatible storage adapter. Configure in `directus/config/config.js`:

```js
STORAGE_LOCATIONS=r2
STORAGE_R2_DRIVER=s3
STORAGE_R2_KEY=${R2_ACCESS_KEY_ID}
STORAGE_R2_SECRET=${R2_SECRET_ACCESS_KEY}
STORAGE_R2_BUCKET=${R2_BUCKET_NAME}
STORAGE_R2_ENDPOINT=${R2_ENDPOINT}
STORAGE_R2_ROOT=listings   # scope Directus uploads to the listings/ prefix
```

---

## Public CDN URL (listing media)

Listing media is served via Cloudflare R2's public bucket URL or a custom domain:

- Set `R2_PUBLIC_URL` in env (e.g. `https://media.yourdomain.com`).
- Construct URLs as: `{R2_PUBLIC_URL}/listings/{listing_id}/photos/{filename}`
- In Next.js, add the R2 public domain to `next.config.ts` under `images.remotePatterns`
  so `next/image` can optimize listing photos.

---

## Error handling

- If an R2 upload fails during receipt generation, the payment should still be recorded
  but the receipt marked as pending (not block the transaction).
- Log R2 errors with the key attempted — do not log file contents.
- Implement a simple retry (3 attempts, exponential backoff) in `r2_service.py`.

---

## Local development

For local dev, use a real R2 bucket with dev-prefixed keys, or use **MinIO** as a local
S3-compatible substitute:

```yaml
# Add to docker-compose.yml for local dev only
minio:
  image: minio/minio
  command: server /data --console-address ":9001"
  ports: ["9000:9000", "9001:9001"]
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
```

Never use the production R2 bucket for local development.
