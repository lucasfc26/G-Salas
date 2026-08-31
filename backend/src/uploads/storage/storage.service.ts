import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageConfig } from '../../config/storage.config.js';
import { LocalStorageDriver } from './local-storage.driver.js';
import type { StorageDriver } from './storage-driver.interface.js';

@Injectable()
export class StorageService implements StorageDriver {
  private readonly driver: StorageDriver;

  constructor(configService: ConfigService) {
    const storageConfig = configService.getOrThrow<StorageConfig>('storage');
    this.driver = this.buildDriver(storageConfig);
  }

  save(key: string, buffer: Buffer, contentType: string): Promise<void> {
    return this.driver.save(key, buffer, contentType);
  }

  delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  publicUrl(key: string): string {
    return this.driver.publicUrl(key);
  }

  private buildDriver(config: StorageConfig): StorageDriver {
    if (config.driver === 'local') {
      return new LocalStorageDriver(config.localPath, config.publicUrl);
    }
    // S3-compatible driver (MinIO/S3/R2) is a deliberate follow-up once a
    // real bucket is provisioned — see roadmap Fase 13/Object Storage.
    throw new InternalServerErrorException(
      `Storage driver "${config.driver}" ainda não implementado.`,
    );
  }
}
