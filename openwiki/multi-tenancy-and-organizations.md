# Multi-Tenancy, Organizations & Invitations

This document details the multi-tenancy architecture, relational models, organizational role hierarchy, invitation lifecycle, audit hooks, and server-side pagination standards implemented across the monorepo.

---

## 1. Multi-Tenancy Data Model & Architecture

The application implements an organization-based multi-tenancy model backed by Better Auth's Organization plugin, PostgreSQL 17, and Prisma 7. Data isolation is maintained across database queries, application services, and native PostgreSQL Row-Level Security (RLS) policies.

### 1.1 Relational Schema Overview (`apps/api/prisma/schema.prisma`)

```prisma
model Organization {
  id          String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String
  slug        String?      @unique
  logo        String?
  metadata    String?
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  members     Member[]
  invitations Invitation[]
  items       Item[]

  @@map("organization")
}

model Member {
  id             String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String       @map("organization_id") @db.Uuid
  userId         String       @map("user_id") @db.Uuid
  role           String       @default("member")
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([userId])
  @@map("member")
}

model Invitation {
  id             String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String       @map("organization_id") @db.Uuid
  email          String
  role           String?      @default("member")
  status         String       @default("pending")
  expiresAt      DateTime     @map("expires_at")
  inviterId      String       @map("inviter_id") @db.Uuid
  createdAt      DateTime     @default(now()) @map("created_at")
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [inviterId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([email])
  @@map("invitation")
}
```

### 1.2 Entity Relationships & Cascade Guarantees

```
+--------------------+            1:N            +--------------------+
|    Organization    | <------------------------ |       Member       |
| (organization)     |                           | (member)           |
+--------------------+                           +--------------------+
     |          |                                          |
 1:N |          | 1:N                                      | N:1
     |          v                                          v
     |   +--------------------+                  +--------------------+
     |   |     Invitation     |                  |        User        |
     |   | (invitation)       |                  | (user)             |
     |   +--------------------+                  +--------------------+
     |                                                     ^
     v 1:N                                                 | 1:N
+--------------------+                                     |
|        Item        | ------------------------------------+
| (item)             |
+--------------------+
```

- **Cascade Purging:** When an `Organization` is deleted, all child `Member`, `Invitation`, and related records are automatically purged via PostgreSQL `ON DELETE CASCADE`.
- **Hybrid Domain Segregation:** Domain entities (such as `Item`) can operate in a hybrid personal or organizational mode:
  - **Personal Item:** `organizationId` is `null` and `userId` designates the owner.
  - **Organizational Item:** `organizationId` stores the tenant UUID, allowing members with active organization context to collaborate according to role rules.

---

## 2. Single Ownership Invariant

The platform enforces a strict architectural invariant: **a single user may create and own at most one organization across the entire platform**.

This invariant is verified and enforced across three distinct layers:

### 2.1 Better Auth Plugin Hook (`apps/api/src/lib/auth.ts`)

The Better Auth organization plugin uses `allowUserToCreateOrganization` to dynamically validate whether the current user is eligible to instantiate a new organization:

```typescript
organization({
  allowUserToCreateOrganization: async (user) => {
    const existingOwnerMembership = await prisma.member.findFirst({
      where: {
        userId: user.id,
        role: 'owner',
      },
    });
    if (existingOwnerMembership) {
      return false;
    }
    return true;
  },
  // ...
})
```

If the query resolves an active membership where `role: 'owner'`, the callback returns `false`, aborting creation inside Better Auth's internal pipeline.

### 2.2 API Controller Guard (`apps/api/src/controllers/organization.controller.ts`)

Direct REST calls to `POST /api/v1/organizations` verify ownership before executing the transaction:

```typescript
export async function createOrganization(
  request: FastifyRequest<{ Body: { name: string; slug?: string } }>,
  reply: FastifyReply,
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return reply.status(401).send({ message: 'Unauthorized' });
  }

  const existingOwner = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      role: MEMBER_ROLES.OWNER,
    },
  });

  if (existingOwner) {
    return reply.status(403).send({
      error: {
        code: AUTH_ERROR_CODES.OWNER_LIMIT_REACHED,
        message: 'You are already the owner of an organization.',
        statusCode: 403,
      },
    });
  }

  const org = await createOrganizationForUser(
    session.user.id,
    request.body.name,
    request.body.slug,
  );
  return reply.status(201).send(org);
}
```

When an existing ownership record is detected, the API returns HTTP 403 with `AUTH_ERROR_CODES.OWNER_LIMIT_REACHED`.

### 2.3 Client-Side Pre-Emptive Check (`apps/web/src/pages/select-organization/use-select-organization-page.ts`)

The frontend checks the user's membership array before rendering the organization creation form or dispatching network requests:

```typescript
const memberships = profileQuery.data?.user?.members || [];
let isOwnerOfAnyOrg = false;
for (const m of memberships) {
  if (m.role === 'owner') {
    isOwnerOfAnyOrg = true;
    break;
  }
}

async function handleCreateOrganization(e: SyntheticEvent<HTMLFormElement>) {
  e.preventDefault();
  if (!newOrgName.trim()) {
    return;
  }

  if (isOwnerOfAnyOrg) {
    toast.error(t('selectOrg.ownerLimitReached'));
    return;
  }
  // Proceed with creation...
}
```

---

## 3. Membership Roles & Authorization

### 3.1 Role Constants (`apps/api/src/constants/auth.constants.ts`)

Role definitions are centralized as read-only constants:

```typescript
export const MEMBER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type MemberRole = (typeof MEMBER_ROLES)[keyof typeof MEMBER_ROLES];
```

### 3.2 Authorization Matrix

| Action | Owner | Admin | Member | Non-Member / Visitor |
|---|---|---|---|---|
| **View Organization Profile & Items** | Permitted | Permitted | Permitted | Denied |
| **Create & Update Organization Items** | Permitted | Permitted | Permitted | Denied |
| **Invite New Members** | Permitted | Permitted | Denied | Denied |
| **View Pending & Historical Invitations** | Permitted | Permitted | Denied | Denied |
| **Cancel Outgoing Invitations** | Permitted | Permitted | Denied | Denied |
| **Update Member Roles (to Admin/Member)** | Permitted | Denied | Denied | Denied |
| **Remove `member` or `admin`** | Permitted | Permitted (non-owners only) | Denied | Denied |
| **Remove `owner`** | Denied | Denied | Denied | Denied |
| **Transfer Ownership** | Permitted | Denied | Denied | Denied |
| **Update Organization Name & Slug** | Permitted | Permitted | Denied | Denied |
| **Delete / Purge Organization** | Permitted | Denied | Denied | Denied |
| **Leave Organization** | Permitted (if not sole owner) | Permitted | Permitted | N/A |

### 3.3 Authorization Enforcement Pattern

Administrative routes verify membership and role levels before executing mutations. If the caller lacks sufficient authority, the service throws a domain error mapping to `AUTH_ERROR_CODES.FORBIDDEN_ADMIN_ACCESS`:

```typescript
const member = await prisma.member.findFirst({
  where: {
    organizationId: params.organizationId,
    userId: params.userId,
    role: { in: [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN] },
  },
});

if (!member) {
  throw new Error(AUTH_ERROR_CODES.FORBIDDEN_ADMIN_ACCESS);
}
```

---

## 4. Invitation & Onboarding Lifecycle

### 4.1 Lifecycle Flow Diagram

```
[ Admin / Owner ]                         [ Backend API ]                           [ Invitee ]
        |                                        |                                       |
        |--- 1. inviteMember(email, role) ------>|                                       |
        |                                        |--- 2. Create pending record --------->|
        |                                        |--- 3. Dispatch transactional email -->|
        |                                        |                                       |
        |                                        |        4. Opens web application <-----|
        |                                        |<------ 5. listUserInvitations() ------|
        |                                        |                                       |
        |                                        |        6. Displays Invitation Modal --+
        |                                        |                                       |
        |                                        |<------ 7. acceptInvitation() ---------|
        |                                        |--- 8. Convert to Member (role) ------>|
        |                                        |--- 9. Invalidate cached sessions ---->|
        |                                        |                                       |
        |                                        |<------ 10. setActive(organizationId) -|
        v                                        v                                       v
```

### 4.2 Step-by-Step Flow Stages

#### Stage 1: Issuing Invitations (`apps/web/src/pages/settings/use-settings-page.ts`)

Administrators submit invitations with an email address and targeted role:

```typescript
const result = await authClient.organization.inviteMember({
  email: inviteEmail.trim(),
  role: inviteRole,
  organizationId: activeOrg.data.id,
});
```

Better Auth generates a secure token, assigns a 48-hour expiration date, and records the pending entry in the `invitation` table.

#### Stage 2: Transactional Email Notification (`apps/api/src/lib/auth.ts`)

The `sendInvitationEmail` hook generates and dispatches an HTML email via Nodemailer:

```typescript
sendInvitationEmail: async (data) => {
  logger.info(
    { email: data.email, orgName: data.organization.name, role: data.role },
    'Sending organization invitation email...',
  );
  const uniqueRef = Date.now().toString();
  const subject = `Invitation to join ${data.organization.name}`;
  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #0f1117; border: 1px solid #1e2330; border-radius: 16px; padding: 32px; color: #f8fafc; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
    <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 16px;">You have been invited to collaborate</h2>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
      You have received an invitation to join the organization <strong>${data.organization.name}</strong> as <strong>${data.role}</strong>.
    </p>
    <div style="margin: 24px 0;">
      <a href="${primaryOrigin}/select-organization" style="background-color: #7B6CF6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
        Review and Accept Invitation
      </a>
    </div>
    <hr style="border: none; border-top: 1px solid #1e2330; margin: 24px 0 16px;" />
    <p style="color: #64748b; font-size: 11px; margin: 0;">${APP_NAME} · All rights reserved.</p>
  </div>`;

  await sendEmail(data.email, subject, html);
}
```

#### Stage 3: In-App Discovery & Review Modal (`apps/web/src/components/ui/invitation-modal.tsx`)

When the invitee signs in or visits `/select-organization`, pending invitations are retrieved via `authClient.organization.listUserInvitations()`. Selecting an invitation opens the review dialog:

- **Acceptance:** Calls `authClient.organization.acceptInvitation({ invitationId })`.
  - Prompts the user to immediately switch active workspaces to the newly joined organization.
  - Switches context via `authClient.organization.setActive({ organizationId })`.
  - Clears cookie caches and invalidates active TanStack queries:
    ```typescript
    await authClient.getSession({ query: { disableCookieCache: true } });
    await queryClient.invalidateQueries();
    ```
- **Rejection:** Calls `authClient.organization.rejectInvitation({ invitationId })`.
  - Updates the invitation status to `rejected`.
  - Refetches user invitation lists and closes the modal.

---

## 5. Member Removal & Lifecycle Audit Hooks

When a member is removed from an organization, the system executes an automated audit and alerting hook configured in Better Auth (`organizationHooks.afterRemoveMember` in `apps/api/src/lib/auth.ts`).

### 5.1 Dual-Dispatch Notification Architecture

Upon member removal, the backend executes two decoupled notifications:

```typescript
organizationHooks: {
  afterRemoveMember: async ({ member: _member, user, organization }) => {
    logger.info(
      { userId: user.id, orgName: organization.name },
      'Member removed, creating in-app notification and sending email...',
    );

    let subject = `You have been removed from ${organization.name}`;
    let notifTitle = `Removed from ${organization.name}`;
    let notifMessage = `You have been removed from ${organization.name}.`;
    let ctaText = 'Go to Home Dashboard';
    let footerCopyright = `${APP_NAME} · All rights reserved.`;

    if (user.locale === 'es') {
      subject = `Has sido desvinculado de ${organization.name}`;
      notifTitle = `Desvinculado de ${organization.name}`;
      notifMessage = `Has sido dado de baja de la organización ${organization.name}.`;
      ctaText = 'Ir al Panel Principal';
      footerCopyright = `${APP_NAME} · Todos los derechos reservados.`;
    }

    // 1. In-App Notification Record
    try {
      await createNotification({
        userId: user.id,
        type: NOTIFICATION_TYPES.ORGANIZATION_MEMBER_REMOVED,
        title: notifTitle,
        message: notifMessage,
        metadata: {
          organizationId: organization.id,
          organizationName: organization.name,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to create in-app notification for removed member');
    }

    // 2. Transactional Alert Email
    try {
      const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #0f1117; border: 1px solid #1e2330; border-radius: 16px; padding: 32px; color: #f8fafc; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 16px;">${notifTitle}</h2>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">${notifMessage}</p>
        <div style="margin: 24px 0;">
          <a href="${primaryOrigin}/" style="background-color: #7B6CF6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
            ${ctaText}
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #1e2330; margin: 24px 0 16px;" />
        <p style="color: #64748b; font-size: 11px; margin: 0;">${footerCopyright}</p>
      </div>`;

      await sendEmail(user.email, subject, html);
    } catch (err) {
      logger.error({ err }, 'Failed to send email to removed member');
    }
  },
}
```

### 5.2 Bilingual Delivery Invariant

Transactional emails and notifications respect the recipient's preference stored in `user.locale`. If `user.locale === 'es'`, Spanish copy is rendered; otherwise, communications default to technical English.

---

## 6. Server-Side Pagination Standard

To preserve database performance and network bandwidth, client-side in-memory slicing of invitation collections is strictly prohibited. The system enforces server-side pagination across API services and client tables.

### 6.1 Backend Service Implementation (`apps/api/src/services/organization.service.ts`)

The service function `listOrganizationInvitations` accepts structured pagination parameters and executes count and data retrieval concurrently:

```typescript
export interface ListOrganizationInvitationsParams {
  organizationId: string;
  userId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListOrganizationInvitationsResult {
  data: Array<{
    id: string;
    organizationId: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: Date;
    inviterId: string;
    createdAt: Date;
    user?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export async function listOrganizationInvitations(
  params: Readonly<ListOrganizationInvitationsParams>,
): Promise<ListOrganizationInvitationsResult> {
  const member = await prisma.member.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      role: { in: [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN] },
    },
  });

  if (!member) {
    throw new Error(AUTH_ERROR_CODES.FORBIDDEN_ADMIN_ACCESS);
  }

  let page = 1;
  if (params.page !== undefined && params.page > 0) {
    page = params.page;
  }

  let pageSize = 10;
  if (params.pageSize !== undefined && params.pageSize > 0) {
    pageSize = Math.min(params.pageSize, 50);
  }

  let sortOrder: 'asc' | 'desc' = 'desc';
  if (params.sortOrder === 'asc' || params.sortOrder === 'desc') {
    sortOrder = params.sortOrder;
  }

  interface InvitationWhere {
    organizationId: string;
    status?: string;
  }

  const where: InvitationWhere = {
    organizationId: params.organizationId,
  };

  if (params.status && params.status !== INVITATION_STATUS_FILTERS.ALL) {
    where.status = params.status;
  }

  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.invitation.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        createdAt: sortOrder,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.invitation.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
    },
  };
}
```

### 6.2 Standard Response Envelope

All paginated endpoints adhere to the standard envelope format:

```json
{
  "data": [
    {
      "id": "7bfa5db2-f7b2-4d1a-8c8b-2879a83681bf",
      "organizationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "colleague@example.com",
      "role": "member",
      "status": "pending",
      "expiresAt": "2026-10-08T12:00:00.000Z",
      "inviterId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "createdAt": "2026-10-06T12:00:00.000Z",
      "user": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Alex Inviter",
        "email": "alex@example.com"
      }
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  }
}
```

### 6.3 Frontend Integration & Performance Rules (`apps/web/src/pages/settings/use-settings-page.ts`)

1. **NO Table Polling:** Automated interval polling (`refetchInterval`) is strictly banned.
2. **Explicit Refresh:** Users refresh data via explicit manual action buttons.
3. **Smooth Transitions:** TanStack Query utilizes `placeholderData: keepPreviousData` and `staleTime: 30000` to prevent layout jumps during page navigation:

```typescript
const invitationsHistoryQuery = useQuery<PaginatedInvitationsResponse>({
  queryKey: [
    'org-invitations-history',
    activeOrg.data?.id,
    invitationPage,
    invitationStatusFilter,
    invitationSortOrder,
  ],
  queryFn: async () => {
    if (!activeOrg.data?.id) {
      return {
        data: [],
        pagination: { total: 0, page: 1, pageSize: 10, totalPages: 1 },
      };
    }
    const params = new URLSearchParams();
    params.set('page', String(invitationPage));
    params.set('pageSize', '10');
    params.set('sortOrder', invitationSortOrder);
    if (invitationStatusFilter !== 'all') {
      params.set('status', invitationStatusFilter);
    }
    return apiFetch<PaginatedInvitationsResponse>(
      `/api/v1/organizations/${activeOrg.data.id}/invitations?${params.toString()}`,
    );
  },
  enabled: Boolean(activeOrg.data?.id && selectedTab === 'organizations' && canManageMembers),
  staleTime: 30 * 1000,
  placeholderData: keepPreviousData,
});
```
