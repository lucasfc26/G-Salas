import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '../generated/prisma/client.js';
import type { UserStatus } from '../generated/prisma/enums.js';
import {
  toImageVariantUrls,
  type ImageVariantUrls,
} from '../common/utils/image-variants.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FileValidationService } from '../uploads/file-validation.service.js';
import { ImageProcessingService } from '../uploads/image-processing.service.js';
import { StorageService } from '../uploads/storage/storage.service.js';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  UPLOAD_LIMITS,
} from '../common/constants/upload-limits.constants.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import type { UpdateMeDto } from './dto/update-me.dto.js';
import type { UpsertAddressDto } from './dto/upsert-address.dto.js';
import type { UpsertProfessionalProfileDto } from './dto/upsert-professional-profile.dto.js';

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  avatarUrl: true,
  createdAt: true,
  lastLoginAt: true,
  professionalProfile: {
    select: {
      profession: true,
      registrationNumber: true,
      specialties: true,
      serviceType: true,
      averagePatients: true,
      averageMonthlyHours: true,
      averageSessionDuration: true,
      bio: true,
      birthDate: true,
      address: {
        select: {
          zipCode: true,
          street: true,
          number: true,
          complement: true,
          neighborhood: true,
          city: true,
          state: true,
          country: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

type ProfileRow = Prisma.UserGetPayload<{ select: typeof PROFILE_SELECT }>;

export interface UserProfileView extends Omit<ProfileRow, 'avatarUrl'> {
  avatar: ImageVariantUrls | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imageProcessing: ImageProcessingService,
    private readonly fileValidation: FileValidationService,
  ) {}

  async getProfile(userId: string): Promise<UserProfileView> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
    return this.toProfileView(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<UserProfileView> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: PROFILE_SELECT,
    });
    await this.logUserUpdate(userId, userId);
    return this.toProfileView(user);
  }

  async upsertProfessionalProfile(
    userId: string,
    dto: UpsertProfessionalProfileDto,
  ): Promise<UserProfileView> {
    await this.prisma.professionalProfile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
    await this.logUserUpdate(userId, userId);
    return this.getProfile(userId);
  }

  async upsertAddress(
    userId: string,
    dto: UpsertAddressDto,
  ): Promise<UserProfileView> {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(
        'Cadastre os dados profissionais antes de informar o endereço.',
      );
    }

    if (profile.addressId) {
      await this.prisma.address.update({
        where: { id: profile.addressId },
        data: dto,
      });
    } else {
      const address = await this.prisma.address.create({ data: dto });
      await this.prisma.professionalProfile.update({
        where: { userId },
        data: { addressId: address.id },
      });
    }

    await this.logUserUpdate(userId, userId);
    return this.getProfile(userId);
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserProfileView> {
    await this.fileValidation.assertValid({
      buffer: file.buffer,
      maxBytes: UPLOAD_LIMITS.AVATAR_MAX_BYTES,
      allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    });

    const previous = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    const baseKey = await this.imageProcessing.processAndStore(
      file.buffer,
      `avatars/${userId}`,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: baseKey },
    });

    if (previous.avatarUrl) {
      await this.imageProcessing
        .deleteVariants(previous.avatarUrl)
        .catch(() => undefined);
    }

    return this.getProfile(userId);
  }

  async listUsers(query: ListUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          avatarUrl: true,
          createdAt: true,
          professionalProfile: {
            select: {
              profession: true,
              registrationNumber: true,
              specialties: true,
              serviceType: true,
              averageMonthlyHours: true,
              birthDate: true,
              address: { select: { city: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      data: users.map(({ avatarUrl, ...user }) => ({
        ...user,
        avatar: toImageVariantUrls(avatarUrl, (key) =>
          this.storage.publicUrl(key),
        ),
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getUserById(id: string): Promise<UserProfileView> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PROFILE_SELECT,
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return this.toProfileView(user);
  }

  async createUser(dto: CreateUserDto): Promise<UserProfileView> {
    const passwordHash = await argon2.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          role: dto.role,
          passwordHash,
        },
        select: PROFILE_SELECT,
      });
      return this.toProfileView(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Já existe um usuário com este e-mail.');
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: UserStatus,
    adminId: string,
  ): Promise<UserProfileView> {
    await this.prisma.user.findUniqueOrThrow({ where: { id } });

    const [, user] = await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: status !== 'ACTIVE' ? { revokedAt: new Date() } : {},
      }),
      this.prisma.user.update({
        where: { id },
        data: { status },
        select: PROFILE_SELECT,
      }),
      this.prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'USER_UPDATE',
          entity: 'User',
          entityId: id,
          metadata: { status },
        },
      }),
    ]);

    return this.toProfileView(user);
  }

  private async logUserUpdate(userId: string, actorId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_UPDATE',
        entity: 'User',
        entityId: userId,
      },
    });
  }

  private toProfileView(user: ProfileRow): UserProfileView {
    const { avatarUrl, ...rest } = user;
    return {
      ...rest,
      avatar: toImageVariantUrls(avatarUrl, (key) =>
        this.storage.publicUrl(key),
      ),
    };
  }
}
