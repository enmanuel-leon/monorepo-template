import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import type {
  ObjectStorageProvider,
  GetObjectInput,
  GetSignedDownloadUrlInput,
  PutObjectInput,
} from './object-storage.types.js';

export class LocalObjectStorageProvider implements ObjectStorageProvider {
  private readonly storageDir: string;

  constructor() {
    this.storageDir = path.resolve(process.cwd(), 'uploads');
  }

  async getObject(input: GetObjectInput): Promise<Buffer> {
    const filePath = path.join(this.storageDir, input.bucket, input.key);
    return fs.readFile(filePath);
  }

  async getSignedDownloadUrl(input: GetSignedDownloadUrlInput): Promise<string> {
    return `http://localhost:${env.PORT}/uploads/${input.key}`;
  }

  async putObject(input: PutObjectInput): Promise<void> {
    const dir = path.join(this.storageDir, input.bucket);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, input.key);
    await fs.writeFile(filePath, input.body);
  }
}
