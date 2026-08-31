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
  thumbnail: 150,
  medium: 600,
  original: 1920,
};

/**
 * Resizes + compresses an uploaded image into thumbnail/medium/original
 * WebP variants (roadmap Fase 14) instead of ever serving the raw upload.
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

    await Promise.all(
      (Object.entries(sizes) as [keyof ImageVariantSizes, number][]).map(
        async ([variant, width]) => {
          const output = await sharp(buffer)
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: variant === 'thumbnail' ? 70 : 82 })
            .toBuffer();
          await this.storage.save(
            `${baseKey}/${variant}.webp`,
            output,
            'image/webp',
          );
        },
      ),
    );

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
