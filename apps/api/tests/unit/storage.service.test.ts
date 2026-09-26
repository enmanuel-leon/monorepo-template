import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStorageBucket,
  getObjectStorageProvider,
  uploadArtifact,
  downloadArtifact,
  getArtifactSignedDownloadUrl,
} from '../../src/services/storage/storage.service.js';
import { S3ObjectStorageProvider } from '../../src/services/storage/s3.provider.js';
import { seedAdminEmailSchema, seedAdminPasswordSchema } from '../../src/schemas/seed.schema.js';
import { getRedisClient } from '../../src/lib/redis.js';

describe('Storage & Infrastructure Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getStorageBucket returns default or configured bucket', () => {
    const bucket = getStorageBucket();
    expect(typeof bucket).toBe('string');
    expect(bucket.length).toBeGreaterThan(0);
  });

  it('getObjectStorageProvider returns a provider instance implementing ObjectStorageProvider', () => {
    const provider = getObjectStorageProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.getObject).toBe('function');
    expect(typeof provider.putObject).toBe('function');
    expect(typeof provider.getSignedDownloadUrl).toBe('function');
  });

  it('uploadArtifact delegates to provider putObject', async () => {
    const provider = getObjectStorageProvider();
    const putObjectSpy = vi.spyOn(provider, 'putObject').mockResolvedValue(undefined);

    const testBuf = Buffer.from('test-artifact');
    await uploadArtifact('artifact.gz', testBuf, 'application/gzip');

    expect(putObjectSpy).toHaveBeenCalledTimes(1);
  });

  it('downloadArtifact delegates to provider getObject', async () => {
    const provider = getObjectStorageProvider();
    const testBuf = Buffer.from('downloaded-data');
    vi.spyOn(provider, 'getObject').mockResolvedValue(testBuf);

    const result = await downloadArtifact('artifact.gz');
    expect(result).toEqual(testBuf);
  });

  it('getArtifactSignedDownloadUrl delegates to provider getSignedDownloadUrl', async () => {
    const provider = getObjectStorageProvider();
    vi.spyOn(provider, 'getSignedDownloadUrl').mockResolvedValue(
      'https://example.com/download/file',
    );

    const result = await getArtifactSignedDownloadUrl({
      bucket: 'test-bucket',
      key: 'file.txt',
      expiresInSeconds: 60,
      fileName: 'file.txt',
      contentType: 'text/plain',
    });

    expect(result).toBe('https://example.com/download/file');
  });

  it('seedAdminEmailSchema validates correct email and rejects invalid format', () => {
    expect(seedAdminEmailSchema.safeParse('admin@example.com').success).toBe(true);
    expect(seedAdminEmailSchema.safeParse('invalid-email').success).toBe(false);
  });

  it('seedAdminPasswordSchema validates password length limits', () => {
    expect(seedAdminPasswordSchema.safeParse('Password123!').success).toBe(true);
    expect(seedAdminPasswordSchema.safeParse('123').success).toBe(false);
  });

  it('getRedisClient returns redis client instance or null safely without throwing', () => {
    const client = getRedisClient();
    if (client) {
      expect(typeof client.get).toBe('function');
    } else {
      expect(client).toBeNull();
    }
  });
});
