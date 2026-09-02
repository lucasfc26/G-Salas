import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UPLOAD_LIMITS } from '../common/constants/upload-limits.constants.js';
import { Role } from '../generated/prisma/enums.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';
import { RoomsService } from './rooms.service.js';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  list(@Query() query: ListRoomsQueryDto) {
    return this.roomsService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.roomsService.getById(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_LIMITS.AVATAR_MAX_BYTES },
    }),
  )
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.roomsService.uploadImage(id, file);
  }

  @Roles(Role.ADMIN)
  @Post(':id/photos')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_LIMITS.AVATAR_MAX_BYTES },
    }),
  )
  uploadPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.roomsService.addPhotos(id, files);
  }

  @Roles(Role.ADMIN)
  @Delete(':id/photos/:photoId')
  deletePhoto(@Param('id') id: string, @Param('photoId') photoId: string) {
    return this.roomsService.deletePhoto(id, photoId);
  }
}
