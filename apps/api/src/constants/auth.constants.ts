export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const MEMBER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type MemberRole = (typeof MEMBER_ROLES)[keyof typeof MEMBER_ROLES];

export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  CANCELLED: 'cancelled',
  CANCELED: 'canceled',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

export const INVITATION_STATUS_FILTERS = {
  ALL: 'all',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELED: 'canceled',
} as const;

export type InvitationStatusFilter =
  (typeof INVITATION_STATUS_FILTERS)[keyof typeof INVITATION_STATUS_FILTERS];

export const AUTH_ERROR_CODES = {
  FORBIDDEN_ORGANIZATION_ACCESS: 'FORBIDDEN_ORGANIZATION_ACCESS',
  FORBIDDEN_ADMIN_ACCESS: 'FORBIDDEN_ADMIN_ACCESS',
  OWNER_LIMIT_REACHED: 'OWNER_LIMIT_REACHED',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
} as const;
