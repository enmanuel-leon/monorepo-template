import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import { LocalObjectStorageProvider } from '../../src/services/storage/local.provider.js';

describe('Local Object Storage Provider Unit Tests', () => {
  let provider: LocalObjectStorageProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    provider = new LocalObjectStorageProvider();
  });

  it('putObject creates directory and writes file buffer', async () => {
    const mkdirSpy = vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

    const bodyBuffer = Buffer.from('test-content');
    await provider.putObject({
      bucket: 'test-bucket',
      key: 'test.txt',
      body: bodyBuffer,
      contentType: 'text/plain',
    });

    expect(mkdirSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
  });

  it('getObject reads file from storage directory', async () => {
    const bodyBuffer = Buffer.from('file-data');
    const readFileSpy = vi.spyOn(fs, 'readFile').mockResolvedValue(bodyBuffer);

    const result = await provider.getObject({
      bucket: 'test-bucket',
      key: 'test.txt',
    });

    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(bodyBuffer);
  });

  it('getSignedDownloadUrl returns local download URL with key', async () => {
    const url = await provider.getSignedDownloadUrl({
      bucket: 'test-bucket',
      key: 'avatar.png',
      fileName: 'avatar.png',
      contentType: 'image/png',
      expiresInSeconds: 3600,
    });

    expect(url).toContain('/uploads/avatar.png');
  });
});
