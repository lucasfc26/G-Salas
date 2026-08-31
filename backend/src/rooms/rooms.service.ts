import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import {
  toImageVariantUrls,
  type ImageVariantUrls,
} from '../common/utils/image-variants.util.js';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  UPLOAD_LIMITS,
} from '../common/constants/upload-limits.constants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { FileValidationService } from '../uploads/file-validation.service.js';
import { ImageProcessingService } from '../uploads/image-processing.service.js';
import { StorageService } from '../uploads/storage/storage.service.js';
import type { CreateRoomDto } from './dto/create-room.dto.js';
import type { ListRoomsQueryDto } from './dto/list-rooms-query.dto.js';
import type { UpdateRoomDto } from './dto/update-room.dto.js';

const LIST_CACHE_PREFIX = 'rooms:list:';
const LIST_CACHE_TTL_SECONDS = 60;
const DETAIL_CACHE_TTL_SECONDS = 300;

function detailCacheKey(id: string): string {
  return `rooms:detail:${id}`;
}

const ROOM_SELECT = {
  id: true,
  name: true,
  description: true,
  type: true,
  capacity: true,
  amenities: true,
  status: true,
  hourlyPrice: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RoomSelect;

type RoomRow = Prisma.RoomGetPayload<{ select: typeof ROOM_SELECT }>;

export interface RoomView extends Omit<RoomRow, 'imageUrl'> {
  image: ImageVariantUrls | null;
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imageProcessing: ImageProcessingService,
    private readonly fileValidation: FileValidationService,
    private readonly cache: CacheService,
  ) {}

  async list(query: ListRoomsQueryDto) {
    const cacheKey = `${LIST_CACHE_PREFIX}${JSON.stringify(query)}`;
    return this.cache.wrap(cacheKey, LIST_CACHE_TTL_SECONDS, async () => {
      const where: Prisma.RoomWhereInput = {
        status: query.status,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { type: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [total, rooms] = await this.prisma.$transaction([
        this.prisma.room.count({ where }),
        this.prisma.room.findMany({
          where,
          select: ROOM_SELECT,
          orderBy: { name: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
      ]);

      return {
        data: rooms.map((room) => this.toView(room)),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    });
  }

  async getById(id: string): Promise<RoomView> {
    return this.cache.wrap(
      detailCacheKey(id),
      DETAIL_CACHE_TTL_SECONDS,
      async () => {
        const room = await this.prisma.room.findUnique({
          where: { id },
          select: ROOM_SELECT,
        });
        if (!room) {
          throw new NotFoundException('Sala não encontrada.');
        }
        return this.toView(room);
      },
    );
  }

  async create(dto: CreateRoomDto): Promise<RoomView> {
    const room = await this.prisma.room.create({
      data: { ...dto, amenities: dto.amenities ?? [] },
      select: ROOM_SELECT,
    });
    await this.cache.invalidateByPrefix(LIST_CACHE_PREFIX);
    return this.toView(room);
  }

  async update(id: string, dto: UpdateRoomDto): Promise<RoomView> {
    await this.getById(id);
    const room = await this.prisma.room.update({
      where: { id },
      data: dto,
      select: ROOM_SELECT,
    });
    await this.cache.invalidate(detailCacheKey(id));
    await this.cache.invalidateByPrefix(LIST_CACHE_PREFIX);
    return this.toView(room);
  }

  async uploadImage(id: string, file: Express.Multer.File): Promise<RoomView> {
    await this.fileValidation.assertValid({
      buffer: file.buffer,
      maxBytes: UPLOAD_LIMITS.AVATAR_MAX_BYTES,
      allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    });

    const previous = await this.prisma.room.findUniqueOrThrow({
      where: { id },
      select: { imageUrl: true },
    });

    const baseKey = await this.imageProcessing.processAndStore(
      file.buffer,
      `rooms/${id}`,
    );
    const room = await this.prisma.room.update({
      where: { id },
      data: { imageUrl: baseKey },
      select: ROOM_SELECT,
    });

    if (previous.imageUrl) {
      await this.imageProcessing
        .deleteVariants(previous.imageUrl)
        .catch(() => undefined);
    }

    await this.cache.invalidate(detailCacheKey(id));
    await this.cache.invalidateByPrefix(LIST_CACHE_PREFIX);
    return this.toView(room);
  }

  private toView(room: RoomRow): RoomView {
    const { imageUrl, ...rest } = room;
    return {
      ...rest,
      image: toImageVariantUrls(imageUrl, (key) => this.storage.publicUrl(key)),
    };
  }
}
