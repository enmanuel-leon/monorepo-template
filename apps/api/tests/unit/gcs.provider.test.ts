import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GcsObjectStorageProvider } from '../../src/services/storage/gcs.provider.js';

const mockFile = {
  download: vi.fn(),
  getSignedUrl: vi.fn(),
  save: vi.fn(),
};

const mockBucket = {
  file: vi.fn().mockReturnValue(mockFile),
};

const mockStorageInstance = {
  bucket: vi.fn().mockReturnValue(mockBucket),
};

vi.mock('@google-cloud/storage', () => {
  return {
    Storage: vi.fn().mockImplementation(function () {
      return mockStorageInstance;
    }),
  };
});

describe('GCS Object Storage Provider Unit Tests', () => {
  let provider: GcsObjectStorageProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GcsObjectStorageProvider();
  });

  it('getObject downloads file contents from target bucket and key', async () => {
    const expectedBuffer = Buffer.from('gcs-file-contents');
    mockFile.download.mockResolvedValue([expectedBuffer]);

    const result = await provider.getObject({
      bucket: 'test-bucket',
      key: 'documents/report.pdf',
    });

    expect(mockStorageInstance.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mockBucket.file).toHaveBeenCalledWith('documents/report.pdf');
    expect(mockFile.download).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedBuffer);
  });

  it('getSignedDownloadUrl generates signed url with v4 and custom options', async () => {
    const fixedTimestamp = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);
    const expectedUrl =
      'https://storage.googleapis.com/test-bucket/documents/report.pdf?signed=true';
    mockFile.getSignedUrl.mockResolvedValue([expectedUrl]);

    const result = await provider.getSignedDownloadUrl({
      bucket: 'test-bucket',
      key: 'documents/report.pdf',
      expiresInSeconds: 3600,
      fileName: 'report.pdf',
      contentType: 'application/pdf',
    });

    expect(mockStorageInstance.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mockBucket.file).toHaveBeenCalledWith('documents/report.pdf');
    expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
      version: 'v4',
      action: 'read',
      expires: fixedTimestamp + 3600 * 1000,
      promptSaveAs: 'report.pdf',
      responseType: 'application/pdf',
    });
    expect(result).toBe(expectedUrl);
  });

  it('putObject saves file buffer with content type options', async () => {
    mockFile.save.mockResolvedValue(undefined);
    const bodyBuffer = Buffer.from('uploaded-content');

    await provider.putObject({
      bucket: 'test-bucket',
      key: 'uploads/data.json',
      body: bodyBuffer,
      contentType: 'application/json',
    });

    expect(mockStorageInstance.bucket).toHaveBeenCalledWith('test-bucket');
    expect(mockBucket.file).toHaveBeenCalledWith('uploads/data.json');
    expect(mockFile.save).toHaveBeenCalledWith(bodyBuffer, {
      contentType: 'application/json',
    });
  });
});
