import { randomBytes, createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { AuthConfig } from '../config/auth.config.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { JwtAccessPayload } from './interfaces/jwt-payload.interface.js';
import { SIGNUP_PLAN_TERMS } from './signup-plans.js';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUserView {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

// Dummy hash so a login attempt for a non-existent email spends roughly the
// same time as one for a real user — avoids leaking account existence via
// response timing. Value is not a secret; it hashes an arbitrary constant.
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$Y2VkNzQ4YjY0YjQ1ZTQ1YjY0YjQ1ZTQ1YjY0YjQ1';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.authConfig = configService.getOrThrow<AuthConfig>('auth');
  }

  async login(
    email: string,
    password: string,
    meta: RequestMeta,
  ): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      await argon2.verify(DUMMY_HASH, password).catch(() => undefined);
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordValid = await argon2
      .verify(user.passwordHash, password)
      .catch(() => false);

    if (!passwordValid || user.status !== 'ACTIVE') {
      await this.registerFailedAttempt(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entity: 'User',
          entityId: user.id,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    ]);

    return this.issueTokenPair(user.id, user.email, user.role, meta);
  }

  async register(dto: RegisterDto, meta: RequestMeta): Promise<TokenPair> {
    if (dto.plan !== 'FREE' && !dto.paymentMethod) {
      throw new BadRequestException(
        'Informe a forma de pagamento para este plano.',
      );
    }

    const term = SIGNUP_PLAN_TERMS[dto.plan];
    const passwordHash = await argon2.hash(dto.password);
    const now = new Date();
    const billingExpiresAt = new Date(
      now.getTime() + term.days * 24 * 60 * 60 * 1000,
    );

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: dto.phone?.trim() || null,
          spaceName: dto.spaceName?.trim() || null,
          role: 'ADMIN',
          status: 'ACTIVE',
          passwordHash,
          billingPlan: dto.plan,
          billingExpiresAt,
          billingPaidAt: dto.plan === 'FREE' ? null : now,
          lastLoginAt: now,
        },
        select: { id: true, email: true, role: true },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'SIGNUP',
          entity: 'User',
          entityId: user.id,
          metadata: {
            plan: dto.plan,
            amount: term.amount,
            paymentMethod: dto.paymentMethod ?? 'none',
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });

      return this.issueTokenPair(user.id, user.email, user.role, meta);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Já existe uma conta com este e-mail.');
      }
      throw error;
    }
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, email: true, role: true, status: true } },
      },
    });

    if (!stored) {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }

    if (stored.revokedAt) {
      // Presenting an already-revoked token is a signal of theft/replay:
      // burn every active session for this user.
      await this.revokeAllUserTokens(stored.userId);
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }

    if (stored.expiresAt < new Date() || stored.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      meta,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
    });
    if (!stored) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: stored.userId,
          action: 'LOGOUT',
          entity: 'User',
          entityId: stored.userId,
        },
      }),
    ]);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Always behave the same way whether or not the e-mail exists.
    if (!user) {
      return;
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + this.authConfig.passwordResetExpiresInMinutes * 60_000,
    );

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // TODO(notifications/email): deliver rawToken via e-mail once a mail
    // provider is wired up. Logged for now so the flow is testable in dev.
    this.logger.log(`Password reset token for user ${user.id}: ${rawToken}`);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async getProfile(userId: string): Promise<AuthUserView> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });
    return user;
  }

  private async registerFailedAttempt(
    userId: string,
    currentAttempts: number,
  ): Promise<void> {
    const attempts = currentAttempts + 1;
    const shouldLock = attempts >= this.authConfig.maxFailedLoginAttempts;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock
            ? new Date(
                Date.now() + this.authConfig.lockoutDurationMinutes * 60_000,
              )
            : undefined,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'LOGIN_FAILED',
          entity: 'User',
          entityId: userId,
        },
      }),
    ]);
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    role: string,
    meta: RequestMeta,
  ): Promise<TokenPair> {
    const payload: JwtAccessPayload = {
      sub: userId,
      email,
      role: role as JwtAccessPayload['role'],
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.authConfig.accessSecret,
      expiresIn: Math.floor(this.authConfig.accessExpiresInMs / 1000),
    });

    const rawRefreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + this.authConfig.refreshExpiresInMs),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: Math.floor(this.authConfig.accessExpiresInMs / 1000),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
