export interface GetObjectInput {
  bucket: string;
  key: string;
}

export interface GetSignedDownloadUrlInput {
  bucket: string;
  key: string;
  expiresInSeconds: number;
  fileName: string;
  contentType: string;
}

export interface PutObjectInput {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
}

export interface ObjectStorageProvider {
  getObject(input: GetObjectInput): Promise<Buffer>;
  getSignedDownloadUrl(input: GetSignedDownloadUrlInput): Promise<string>;
  putObject(input: PutObjectInput): Promise<void>;
  clearBucket?(input: { bucket: string }): Promise<void>;
}
