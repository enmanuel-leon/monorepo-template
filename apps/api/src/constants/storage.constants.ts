export const STORAGE_PROVIDERS = {
  LOCAL: 'local',
  S3: 's3',
  GCS: 'gcs',
} as const;

export type StorageProvider = (typeof STORAGE_PROVIDERS)[keyof typeof STORAGE_PROVIDERS];
