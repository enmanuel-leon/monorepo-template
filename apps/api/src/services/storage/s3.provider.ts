import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';
import type {
  ObjectStorageProvider,
  GetObjectInput,
  GetSignedDownloadUrlInput,
  PutObjectInput,
} from './object-storage.types.js';

export class S3ObjectStorageProvider implements ObjectStorageProvider {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: env.S3_REGION || 'us-east-1',
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: env.S3_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: true,
    });
  }

  async getObject(input: GetObjectInput): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
    });
    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error('S3 response body is empty');
    }
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async getSignedDownloadUrl(input: GetSignedDownloadUrlInput): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      ResponseContentDisposition: `attachment; filename="${input.fileName}"`,
      ResponseContentType: input.contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: input.expiresInSeconds });
  }

  async putObject(input: PutObjectInput): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    });
    await this.client.send(command);
  }

  async clearBucket(input: { bucket: string }): Promise<void> {
    const listCommand = new ListObjectsV2Command({ Bucket: input.bucket });
    const listOutput = await this.client.send(listCommand);
    const contents = listOutput.Contents;
    if (contents && contents.length > 0) {
      const keys = contents
        .filter((obj) => Boolean(obj.Key))
        .map((obj) => ({ Key: obj.Key as string }));
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: input.bucket,
        Delete: { Objects: keys },
      });
      await this.client.send(deleteCommand);
    }
  }
}
