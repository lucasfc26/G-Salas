import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { ContractsService } from './contracts.service.js';
import { CreateContractDto } from './dto/create-contract.dto.js';
import { ListContractsQueryDto } from './dto/list-contracts-query.dto.js';
import { RenewContractDto } from './dto/renew-contract.dto.js';
import { UpdateContractDto } from './dto/update-contract.dto.js';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.contractsService.create(dto);
  }

  @Get()
  list(
    @Query() query: ListContractsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contractsService.list(query, user);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contractsService.getById(id, user);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.contractsService.update(id, dto, admin.id);
  }

  @Roles(Role.ADMIN)
  @Post(':id/renew')
  renew(
    @Param('id') id: string,
    @Body() dto: RenewContractDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.contractsService.renew(id, dto, admin.id);
  }

  @Roles(Role.ADMIN)
  @Post(':id/document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_LIMITS.CONTRACT_MAX_BYTES },
    }),
  )
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.contractsService.uploadDocument(id, file, admin.id);
  }
}
