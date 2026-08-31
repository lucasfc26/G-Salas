import { registerAs } from '@nestjs/config';

export interface StorageConfig {
  driver: 'local' | 's3';
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  publicUrl: string;
  localPath: string;
}

export default registerAs('storage', (): StorageConfig => ({
  driver: (process.env.STORAGE_DRIVER as 'local' | 's3') ?? 'local',
  endpoint: process.env.STORAGE_ENDPOINT ?? '',
  region: process.env.STORAGE_REGION ?? 'us-east-1',
  bucket: process.env.STORAGE_BUCKET ?? 'room-rental',
  accessKey: process.env.STORAGE_ACCESS_KEY ?? '',
  secretKey: process.env.STORAGE_SECRET_KEY ?? '',
  publicUrl: process.env.STORAGE_PUBLIC_URL ?? '',
  localPath: process.env.STORAGE_LOCAL_PATH ?? './storage',
}));
