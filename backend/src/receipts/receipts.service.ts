import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  UPLOAD_LIMITS,
} from '../common/constants/upload-limits.constants.js';
import { PaymentAlreadyProcessedException } from '../common/exceptions/payment-already-processed.exception.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FileValidationService } from '../uploads/file-validation.service.js';
import { StorageService } from '../uploads/storage/storage.service.js';

const RETRYABLE_PAYMENT_STATUSES = ['PENDING', 'REJECTED'];

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly storage: StorageService,
    private readonly fileValidation: FileValidationService,
    private readonly notifications: NotificationsService,
  ) {}

  async upload(
    paymentId: string,
    requesterId: string,
    file: Express.Multer.File,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }
    if (payment.userId !== requesterId) {
      throw new ForbiddenException('Este pagamento não pertence a você.');
    }
    if (!RETRYABLE_PAYMENT_STATUSES.includes(payment.status)) {
      throw new BadRequestException(
        'Este pagamento não aceita envio de comprovante no momento.',
      );
    }

    const { mime, ext } = await this.fileValidation.assertValid({
      buffer: file.buffer,
      maxBytes: UPLOAD_LIMITS.RECEIPT_MAX_BYTES,
      allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
    });

    const key = `receipts/${paymentId}/${randomUUID()}.${ext}`;
    await this.storage.save(key, file.buffer, mime);

    const receipt = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.paymentReceipt.upsert({
        where: { paymentId },
        create: {
          paymentId,
          fileUrl: key,
          originalFileName: file.originalname,
          mimeType: mime,
          fileSize: file.size,
          status: 'PENDING_REVIEW',
        },
        update: {
          fileUrl: key,
          originalFileName: file.originalname,
          mimeType: mime,
          fileSize: file.size,
          status: 'PENDING_REVIEW',
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null,
        },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'UNDER_REVIEW' },
      });

      await tx.auditLog.create({
        data: {
          userId: requesterId,
          action: 'UPLOAD_RECEIPT',
          entity: 'PaymentReceipt',
          entityId: upserted.id,
        },
      });

      return upserted;
    });

    return this.toView(receipt);
  }

  /** Approving the receipt approves the payment (and pays the invoice) in
   * the same transaction — roadmap section 32. */
  async approve(paymentId: string, adminId: string) {
    const receipt = await this.mustFind(paymentId);
    if (receipt.status === 'APPROVED') {
      throw new PaymentAlreadyProcessedException(
        'Este comprovante já foi aprovado.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedReceipt = await tx.paymentReceipt.update({
        where: { paymentId },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
      });

      await this.paymentsService.approve(paymentId, adminId, tx);

      return updatedReceipt;
    });

    return this.toView(updated);
  }

  async reject(paymentId: string, adminId: string, reason: string) {
    const receipt = await this.mustFind(paymentId);
    if (receipt.status === 'APPROVED') {
      throw new PaymentAlreadyProcessedException(
        'Este comprovante já foi aprovado.',
      );
    }
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedReceipt = await tx.paymentReceipt.update({
        where: { paymentId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedBy: adminId,
          rejectionReason: reason,
        },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'PENDING' },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'REJECT_PAYMENT',
          entity: 'PaymentReceipt',
          entityId: updatedReceipt.id,
          metadata: { reason },
        },
      });

      await this.notifications.create(
        {
          userId: payment.userId,
          type: 'PAYMENT_REJECTED',
          title: 'Comprovante rejeitado',
          body: `Seu comprovante foi rejeitado: ${reason}. Envie um novo comprovante.`,
          metadata: { paymentId, reason },
        },
        tx,
      );

      return updatedReceipt;
    });

    return this.toView(updated);
  }

  async get(paymentId: string, requesterId: string, isAdmin: boolean) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }
    if (!isAdmin && payment.userId !== requesterId) {
      throw new ForbiddenException('Este pagamento não pertence a você.');
    }
    const receipt = await this.mustFind(paymentId);
    return this.toView(receipt);
  }

  private async mustFind(paymentId: string) {
    const receipt = await this.prisma.paymentReceipt.findUnique({
      where: { paymentId },
    });
    if (!receipt) {
      throw new NotFoundException('Comprovante não encontrado.');
    }
    return receipt;
  }

  private toView<T extends { fileUrl: string }>(receipt: T) {
    return { ...receipt, fileUrl: this.storage.publicUrl(receipt.fileUrl) };
  }
}
