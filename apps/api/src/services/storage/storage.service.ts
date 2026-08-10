import { env } from '../../config/env.js';
import type { ObjectStorageProvider, GetSignedDownloadUrlInput } from './object-storage.types.js';
import { S3ObjectStorageProvider } from './s3.provider.js';
import { GcsObjectStorageProvider } from './gcs.provider.js';
import { LocalObjectStorageProvider } from './local.provider.js';

let providerInstance: ObjectStorageProvider | null = null;

export function getStorageBucket(): string {
  return env.STORAGE_BUCKET || 'local-bucket';
}

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

export async function getArtifactSignedDownloadUrl(
  input: GetSignedDownloadUrlInput,
): Promise<string> {
  const provider = getObjectStorageProvider();
  return provider.getSignedDownloadUrl(input);
}

export async function uploadArtifact(
  key: string,
  body: Buffer,
  contentType: string = 'application/gzip',
): Promise<void> {
  const provider = getObjectStorageProvider();
  const bucket = getStorageBucket();
  await provider.putObject({ bucket, key, body, contentType });
}

export async function downloadArtifact(key: string): Promise<Buffer> {
  const provider = getObjectStorageProvider();
  const bucket = getStorageBucket();
  return provider.getObject({ bucket, key });
}
