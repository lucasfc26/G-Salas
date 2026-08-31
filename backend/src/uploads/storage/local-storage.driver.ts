import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import type { StorageDriver } from './storage-driver.interface.js';

/**
 * Local-disk driver for dev/self-hosted environments. Files are served
 * statically from `publicUrl` (wired up in main.ts). Swap for an S3-style
 * driver in production by implementing StorageDriver — see roadmap
 * Fase 13/Object Storage.
 */
export class LocalStorageDriver implements StorageDriver {
  constructor(
    private readonly rootDir: string,
    private readonly baseUrl: string,
  ) {}

  async save(key: string, buffer: Buffer, _contentType: string): Promise<void> {
    const filePath = this.resolveSafePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveSafePath(key);
    await rm(filePath, { force: true });
  }

  publicUrl(key: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/${key}`;
  }

  private resolveSafePath(key: string): string {
    const root = resolve(this.rootDir);
    const target = resolve(root, normalize(key));
    if (target !== root && !target.startsWith(root + sep)) {
      throw new Error(`Chave de storage inválida: "${key}".`);
    }
    return join(root, key);
  }
}
