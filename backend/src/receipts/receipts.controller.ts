import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UPLOAD_LIMITS } from '../common/constants/upload-limits.constants.js';
import { Role } from '../generated/prisma/enums.js';
import { RejectReceiptDto } from './dto/reject-receipt.dto.js';
import { ReceiptsService } from './receipts.service.js';

@Controller('payments/:paymentId/receipt')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  get(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receiptsService.get(paymentId, user.id, user.role === 'ADMIN');
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_LIMITS.RECEIPT_MAX_BYTES },
    }),
  )
  upload(
    @Param('paymentId') paymentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receiptsService.upload(paymentId, user.id, file);
  }

  @Roles(Role.ADMIN)
  @Patch('approve')
  approve(
    @Param('paymentId') paymentId: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.receiptsService.approve(paymentId, admin.id);
  }

  @Roles(Role.ADMIN)
  @Patch('reject')
  reject(
    @Param('paymentId') paymentId: string,
    @Body() dto: RejectReceiptDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.receiptsService.reject(paymentId, admin.id, dto.reason);
  }
}
