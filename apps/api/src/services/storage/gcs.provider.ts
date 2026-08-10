import { Storage } from '@google-cloud/storage';
import type {
  ObjectStorageProvider,
  GetObjectInput,
  GetSignedDownloadUrlInput,
  PutObjectInput,
} from './object-storage.types.js';

export class GcsObjectStorageProvider implements ObjectStorageProvider {
  private readonly storage: Storage;

  constructor() {
    this.storage = new Storage();
  }

  async getObject(input: GetObjectInput): Promise<Buffer> {
    const file = this.storage.bucket(input.bucket).file(input.key);
    const [contents] = await file.download();
    return contents;
  }

  async getSignedDownloadUrl(input: GetSignedDownloadUrlInput): Promise<string> {
    const file = this.storage.bucket(input.bucket).file(input.key);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + input.expiresInSeconds * 1000,
      promptSaveAs: input.fileName,
      responseType: input.contentType,
    });
    return url;
  }

  async putObject(input: PutObjectInput): Promise<void> {
    const file = this.storage.bucket(input.bucket).file(input.key);
    await file.save(input.body, {
      contentType: input.contentType,
    });
  }
}
