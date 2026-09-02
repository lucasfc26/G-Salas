import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { StorageService } from './storage/storage.service.js';

export interface ImageVariantSizes {
  thumbnail: number;
  medium: number;
  original: number;
}

const DEFAULT_SIZES: ImageVariantSizes = {
  thumbnail: 240,
  medium: 800,
  original: 1600,
};

const VARIANT_QUALITY: Record<keyof ImageVariantSizes, number> = {
  thumbnail: 60,
  medium: 70,
  original: 74,
};

/**
 * Resizes + compresses an uploaded image into thumbnail/medium/original
 * WebP variants instead of ever persisting the raw upload.
 */
@Injectable()
export class ImageProcessingService {
  constructor(private readonly storage: StorageService) {}

  async processAndStore(
    buffer: Buffer,
    folder: string,
    sizes: ImageVariantSizes = DEFAULT_SIZES,
  ): Promise<string> {
    const baseKey = `${folder}/${randomUUID()}`;
    const source = sharp(buffer, {
      failOn: 'none',
      sequentialRead: true,
      limitInputPixels: 48_000_000,
    }).rotate();

    for (const variant of Object.keys(sizes) as (keyof ImageVariantSizes)[]) {
      const output = await source
        .clone()
        .resize({
          width: sizes[variant],
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({
          quality: VARIANT_QUALITY[variant],
          effort: 4,
          smartSubsample: true,
        })
        .toBuffer();
      await this.storage.save(`${baseKey}/${variant}.webp`, output, 'image/webp');
    }

    return baseKey;
  }

  async deleteVariants(
    baseKey: string,
    sizes: ImageVariantSizes = DEFAULT_SIZES,
  ): Promise<void> {
    await Promise.all(
      Object.keys(sizes).map((variant) =>
        this.storage.delete(`${baseKey}/${variant}.webp`),
      ),
    );
  }
}
