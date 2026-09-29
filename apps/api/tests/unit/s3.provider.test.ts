import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { S3ObjectStorageProvider } from '../../src/services/storage/s3.provider.js';

const mockSend = vi.fn();
const mockS3ClientInstance = {
  send: mockSend,
};

const mockGetSignedUrl = vi.fn();

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn().mockImplementation(function () {
      return mockS3ClientInstance;
    }),
    GetObjectCommand: vi.fn().mockImplementation(function (input) {
      return { input, commandName: 'GetObjectCommand' };
    }),
    PutObjectCommand: vi.fn().mockImplementation(function (input) {
      return { input, commandName: 'PutObjectCommand' };
    }),
    ListObjectsV2Command: vi.fn().mockImplementation(function (input) {
      return { input, commandName: 'ListObjectsV2Command' };
    }),
    DeleteObjectsCommand: vi.fn().mockImplementation(function (input) {
      return { input, commandName: 'DeleteObjectsCommand' };
    }),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
  };
});

describe('S3 Object Storage Provider Unit Tests', () => {
  let provider: S3ObjectStorageProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new S3ObjectStorageProvider();
  });

  it('getObject downloads buffer when body is present', async () => {
    const mockBytes = new Uint8Array([1, 2, 3, 4]);
    mockSend.mockResolvedValue({
      Body: {
        transformToByteArray: vi.fn().mockResolvedValue(mockBytes),
      },
    });

    const result = await provider.getObject({
      bucket: 'test-bucket',
      key: 'archive.tar.gz',
    });

    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'archive.tar.gz',
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ commandName: 'GetObjectCommand' }),
    );
    expect(result).toEqual(Buffer.from(mockBytes));
  });

  it('getObject throws error when response body is empty or undefined', async () => {
    mockSend.mockResolvedValue({ Body: null });

    await expect(
      provider.getObject({
        bucket: 'test-bucket',
        key: 'missing.bin',
      }),
    ).rejects.toThrow('S3 response body is empty');
  });

  it('getSignedDownloadUrl delegates to getSignedUrl with attachment disposition', async () => {
    const expectedSignedUrl = 'https://s3.example.com/test-bucket/file.pdf?presigned=1';
    mockGetSignedUrl.mockResolvedValue(expectedSignedUrl);

    const result = await provider.getSignedDownloadUrl({
      bucket: 'test-bucket',
      key: 'invoices/inv-001.pdf',
      expiresInSeconds: 1200,
      fileName: 'inv-001.pdf',
      contentType: 'application/pdf',
    });

    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'invoices/inv-001.pdf',
      ResponseContentDisposition: 'attachment; filename="inv-001.pdf"',
      ResponseContentType: 'application/pdf',
    });
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      mockS3ClientInstance,
      expect.objectContaining({ commandName: 'GetObjectCommand' }),
      { expiresIn: 1200 },
    );
    expect(result).toBe(expectedSignedUrl);
  });

  it('putObject sends PutObjectCommand with buffer payload and content type', async () => {
    mockSend.mockResolvedValue({});
    const fileBuffer = Buffer.from('package-data');

    await provider.putObject({
      bucket: 'test-bucket',
      key: 'packages/pkg.tar',
      body: fileBuffer,
      contentType: 'application/x-tar',
    });

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'packages/pkg.tar',
      Body: fileBuffer,
      ContentType: 'application/x-tar',
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ commandName: 'PutObjectCommand' }),
    );
  });

  it('clearBucket skips deletion when Contents is undefined', async () => {
    mockSend.mockResolvedValueOnce({});

    await provider.clearBucket({ bucket: 'test-bucket' });

    expect(ListObjectsV2Command).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
    });
    expect(DeleteObjectsCommand).not.toHaveBeenCalled();
  });

  it('clearBucket skips deletion when Contents is empty array', async () => {
    mockSend.mockResolvedValueOnce({ Contents: [] });

    await provider.clearBucket({ bucket: 'test-bucket' });

    expect(DeleteObjectsCommand).not.toHaveBeenCalled();
  });

  it('clearBucket filters invalid keys and calls DeleteObjectsCommand', async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [{ Key: 'first-file.txt' }, { Key: undefined }, { Key: 'second-file.txt' }],
    });
    mockSend.mockResolvedValueOnce({});

    await provider.clearBucket({ bucket: 'test-bucket' });

    expect(DeleteObjectsCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Delete: {
        Objects: [{ Key: 'first-file.txt' }, { Key: 'second-file.txt' }],
      },
    });
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('constructor initializes S3Client with custom configuration from environment', async () => {
    vi.resetModules();
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        S3_REGION: 'eu-west-1',
        S3_ENDPOINT: 'http://custom-s3:9000',
        S3_ACCESS_KEY_ID: 'custom-key',
        S3_SECRET_ACCESS_KEY: 'custom-secret',
      },
    }));

    const mockLocalSend = vi.fn();
    const mockLocalClient = vi.fn().mockImplementation(function () {
      return { send: mockLocalSend };
    });

    vi.doMock('@aws-sdk/client-s3', () => ({
      S3Client: mockLocalClient,
      GetObjectCommand: vi.fn(),
      PutObjectCommand: vi.fn(),
      ListObjectsV2Command: vi.fn(),
      DeleteObjectsCommand: vi.fn(),
    }));

    const { S3ObjectStorageProvider: IsolatedS3Provider } =
      await import('../../src/services/storage/s3.provider.js');
    new IsolatedS3Provider();

    expect(mockLocalClient).toHaveBeenCalledWith({
      region: 'eu-west-1',
      endpoint: 'http://custom-s3:9000',
      credentials: {
        accessKeyId: 'custom-key',
        secretAccessKey: 'custom-secret',
      },
      forcePathStyle: true,
    });
  });

  it('constructor falls back to default region and empty credentials when env values are empty', async () => {
    vi.resetModules();
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        S3_REGION: '',
        S3_ENDPOINT: undefined,
        S3_ACCESS_KEY_ID: '',
        S3_SECRET_ACCESS_KEY: '',
      },
    }));

    const mockLocalSend = vi.fn();
    const mockLocalClient = vi.fn().mockImplementation(function () {
      return { send: mockLocalSend };
    });

    vi.doMock('@aws-sdk/client-s3', () => ({
      S3Client: mockLocalClient,
      GetObjectCommand: vi.fn(),
      PutObjectCommand: vi.fn(),
      ListObjectsV2Command: vi.fn(),
      DeleteObjectsCommand: vi.fn(),
    }));

    const { S3ObjectStorageProvider: IsolatedS3Provider } =
      await import('../../src/services/storage/s3.provider.js');
    new IsolatedS3Provider();

    expect(mockLocalClient).toHaveBeenCalledWith({
      region: 'us-east-1',
      endpoint: undefined,
      credentials: {
        accessKeyId: '',
        secretAccessKey: '',
      },
      forcePathStyle: true,
    });
  });
});
