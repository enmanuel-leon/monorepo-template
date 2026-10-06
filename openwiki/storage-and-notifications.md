# Object Storage & In-App Notifications

This document outlines the architecture, implementation patterns, configuration, and frontend integration for both the Object Storage service and the In-App Notification system.

---

## 1. Object Storage Architecture

The application abstracts cloud object storage behind a unified provider interface, allowing seamless switching between local filesystem storage during development and production-grade cloud storage engines without modifying domain logic.

### 1.1 Provider Interface & Operations

All storage providers implement the `ObjectStorageProvider` interface defined in `apps/api/src/services/storage/object-storage.types.ts`:

```typescript
export interface GetObjectInput {
  bucket: string;
  key: string;
}

export interface GetSignedDownloadUrlInput {
  bucket: string;
  key: string;
  expiresInSeconds: number;
  fileName: string;
  contentType: string;
}

export interface PutObjectInput {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
}

export interface ObjectStorageProvider {
  getObject(input: GetObjectInput): Promise<Buffer>;
  getSignedDownloadUrl(input: GetSignedDownloadUrlInput): Promise<string>;
  putObject(input: PutObjectInput): Promise<void>;
  clearBucket?(input: { bucket: string }): Promise<void>;
}
```

The core service exposes high-level asynchronous operations via `apps/api/src/services/storage/storage.service.ts`:

- `uploadArtifact(key: string, body: Buffer, contentType?: string): Promise<void>`: Stores an artifact in the configured bucket (default content type: `application/gzip`).
- `downloadArtifact(key: string): Promise<Buffer>`: Retrieves raw object bytes directly from storage.
- `getArtifactSignedDownloadUrl(input: GetSignedDownloadUrlInput): Promise<string>`: Generates a time-limited presigned URL allowing secure direct browser downloads with custom `Content-Disposition` attachment headers.

### 1.2 Factory Pattern & Provider Resolution

Provider resolution is managed dynamically via `getObjectStorageProvider()`. A singleton instance is lazily instantiated based on the `STORAGE_PROVIDER` environment variable:

```typescript
let providerInstance: ObjectStorageProvider | null = null;

export function getObjectStorageProvider(): ObjectStorageProvider {
  if (providerInstance) {
    return providerInstance;
  }

  if (env.STORAGE_PROVIDER === 's3') {
    providerInstance = new S3ObjectStorageProvider();
    return providerInstance;
  }

  if (env.STORAGE_PROVIDER === 'gcs') {
    providerInstance = new GcsObjectStorageProvider();
    return providerInstance;
  }

  providerInstance = new LocalObjectStorageProvider();
  return providerInstance;
}
```

### 1.3 Supported Providers

#### `LocalObjectStorageProvider` (Development Fallback)
- **Path:** `apps/api/src/services/storage/local.provider.ts`
- **Mechanism:** Persists files directly to the local filesystem under `<cwd>/uploads/<bucket>/<key>`.
- **Signed URL Behavior:** Generates a direct HTTP URL pointing to the local Fastify static file server (`http://localhost:<PORT>/uploads/<key>`).
- **Use Case:** Local offline development, unit testing, and environments where cloud dependencies are unavailable.

#### `S3ObjectStorageProvider` (AWS S3 & MinIO Compatible)
- **Path:** `apps/api/src/services/storage/s3.provider.ts`
- **Mechanism:** Built using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- **Features:**
  - Configured with `forcePathStyle: true` to support MinIO and self-hosted S3-compatible endpoints out of the box.
  - Generates presigned URLs using `GetObjectCommand` with configured expiration windows (`expiresInSeconds`).
  - Supports bucket clearing via `ListObjectsV2Command` and `DeleteObjectsCommand`.
- **Use Case:** Production deployments on AWS S3, local containerized infrastructure with MinIO (`docker/docker-compose.yml`), and S3-compatible services (Cloudflare R2, Wasabi, DigitalOcean Spaces).

#### `GcsObjectStorageProvider` (Google Cloud Storage)
- **Path:** `apps/api/src/services/storage/gcs.provider.ts`
- **Mechanism:** Utilizes `@google-cloud/storage`.
- **Features:** Generates v4 signed read URLs with explicit `promptSaveAs` attachment parameters and content-type overrides.
- **Use Case:** Production deployments operating within Google Cloud Platform (GCP).

### 1.4 Environment Configuration

Storage behavior is governed by environment variables validated in `apps/api/src/config/env.ts`:

| Variable | Type | Default | Description |
|---|---|---|---|
| `STORAGE_PROVIDER` | `local` \| `s3` \| `gcs` | `local` | Active storage provider implementation. |
| `STORAGE_BUCKET` | `string` | `local-bucket` | Target bucket or root folder name. |
| `S3_ENDPOINT` | `string` | _Optional_ | Custom S3 endpoint (e.g., `http://localhost:9000` for MinIO). Omit for AWS. |
| `S3_REGION` | `string` | `us-east-1` | S3 region identifier. |
| `S3_ACCESS_KEY_ID` | `string` | _Optional_ | S3 / MinIO access key. |
| `S3_SECRET_ACCESS_KEY` | `string` | _Optional_ | S3 / MinIO secret key. |

#### MinIO Local Development Example (`apps/api/.env`)
```bash
STORAGE_PROVIDER=s3
STORAGE_BUCKET=monorepo-artifacts
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
```

---

## 2. In-App Notification System

The notification subsystem provides real-time user alerting, membership updates, and invitation state tracking across backend services and the frontend client.

### 2.1 Database Schema (`notification` Table)

Notifications are stored in PostgreSQL using Prisma 7 (`apps/api/prisma/schema.prisma`):

```prisma
model Notification {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  type      String   @db.VarChar(50)
  title     String   @db.VarChar(200)
  message   String   @db.Text
  read      Boolean  @default(false)
  metadata  Json?
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, read])
  @@index([userId, createdAt])
  @@map("notification")
}
```

#### Key Invariants & Design Decisions
- **Cascade Deletion:** Linked to the `User` model with `onDelete: Cascade` to avoid orphaned records upon account deletion.
- **Compound Indexes:** 
  - `[userId, read]`: Optimizes unread counter queries and filter predicates.
  - `[userId, createdAt]`: Optimizes chronologically sorted paginated feeds.
- **Structured Metadata:** The `metadata` column stores arbitrary JSON payloads (e.g., `organizationId`, `targetUrl`, `inviterName`) without requiring schema migrations for new notification types.

### 2.2 Domain Constants

Notification types are centrally managed in `apps/api/src/constants/notification.constants.ts` to prevent magic strings:

```typescript
export const NOTIFICATION_TYPES = {
  ORGANIZATION_MEMBER_REMOVED: 'ORGANIZATION_MEMBER_REMOVED',
  ORGANIZATION_INVITATION_RECEIVED: 'ORGANIZATION_INVITATION_RECEIVED',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
```

### 2.3 REST API Endpoints

All notification routes are registered under the `/api/v1` prefix in `apps/api/src/routes/v1/notification.route.ts` and require an authenticated user session:

#### 1. List Notifications
- **Route:** `GET /api/v1/notifications`
- **Query Parameters:**
  - `page`: Integer (default: `1`, minimum: `1`).
  - `pageSize`: Integer (default: `10`, minimum: `1`, maximum: `50`).
  - `unreadOnly`: Boolean (optional filter).
- **Response Structure (HTTP 200):**
```json
{
  "data": [
    {
      "id": "e6a0d0a8-b99b-4328-8687-f27301ecf157",
      "userId": "9218d6e3-53d9-4841-a129-9e8c740fa392",
      "type": "ORGANIZATION_INVITATION_RECEIVED",
      "title": "New Organization Invitation",
      "message": "You were invited to join Example Corp as an Admin.",
      "read": false,
      "metadata": { "organizationId": "6f2d..." },
      "createdAt": "2026-10-06T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  },
  "unreadCount": 1
}
```

#### 2. Mark Single Notification as Read
- **Route:** `PATCH /api/v1/notifications/:id/read`
- **Path Parameters:** `id` (UUID).
- **Response Structure (HTTP 200):**
```json
{
  "success": true,
  "notification": {
    "id": "e6a0d0a8-b99b-4328-8687-f27301ecf157",
    "read": true
  }
}
```

#### 3. Mark All Notifications as Read
- **Route:** `PATCH /api/v1/notifications/read-all`
- **Response Structure (HTTP 200):**
```json
{
  "success": true,
  "count": 5
}
```

#### 4. Get Unread Count
- **Route:** `GET /api/v1/notifications/unread-count`
- **Response Structure (HTTP 200):**
```json
{
  "unreadCount": 3
}
```

---

## 3. Frontend Integration (`NotificationBell` Component)

The notification bell component (`apps/web/src/components/ui/notification-bell.tsx`) delivers an integrated inbox combining pending organization invitations with system notifications.

### 3.1 Unified Tab Filtering

The dropdown presents three distinct tabs:
- **`all`:** Chronologically aggregates both pending organization invitations and system alerts.
- **`invitations`:** Displays organization membership invitations with direct "Review" actions opening the invitation dialog.
- **`alerts`:** Displays system alerts, role updates, and informational events.

Items are sorted descending by timestamp before rendering:

```typescript
displayItems.sort((a, b) => b.timestamp - a.timestamp);
```

### 3.2 Aggregated Unread Count Badge

The badge displayed over the bell icon reflects the sum of active unread items:

```typescript
const totalUnread = safeInvitations.length + systemUnread;
const hasUnread = totalUnread > 0;
```

When `hasUnread` evaluates to `true`, a badge with the exact count is displayed using safe boolean `&&` rendering.

### 3.3 Instant Read Triggers

Users can dismiss or acknowledge notifications with immediate UI synchronization:
- **Individual Read:** Clicking the check icon on a single notification dispatches `PATCH /api/v1/notifications/:id/read` and triggers a query refetch.
- **Mark All Read:** Clicking "Mark all as read" in the dropdown header dispatches `PATCH /api/v1/notifications/read-all` and invalidates query state.

### 3.4 Strict Adherence to the Table Polling Ban

Automated background polling loops (`refetchInterval`, recursive `setTimeout`, or `setInterval`) are strictly prohibited by monorepo engineering standards. The `NotificationBell` adheres to this policy through:

1. **Explicit Manual Refresh:** A dedicated reload button triggers an on-demand refetch of both invitation and system notification queries:
   ```typescript
   async function handleRefresh() {
     await Promise.all([refetchInvitations(), notificationsQuery.refetch()]);
   }
   ```
2. **Visual Loading Feedback:** The reload icon (`RotateCw`) activates an animated CSS spin (`animate-spin`) while refetching is in progress:
   ```typescript
   let refreshSpinClass = 'h-3.5 w-3.5 text-slate-500';
   if (isRefreshing) {
     refreshSpinClass = 'h-3.5 w-3.5 text-[#7B6CF6] animate-spin';
   }
   ```
3. **Passive Cache Freshness:** TanStack Query is configured with `staleTime: 30 * 1000` alongside window focus (`refetchOnWindowFocus: true`) and network reconnect listeners (`refetchOnReconnect: true`), ensuring cache stability without continuous background server requests.

---

## 4. Verification & Testing

Backend services and controllers are fully covered by automated test suites:

```bash
# Run unit tests for notification service logic
pnpm --filter api test apps/api/tests/unit/notification.service.test.ts

# Run integration tests for notification API routes
pnpm --filter api test apps/api/tests/integration/notification.test.ts

# Run the complete monorepo verification suite
pnpm check
```
