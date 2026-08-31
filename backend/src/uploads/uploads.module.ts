import { Global, Module } from '@nestjs/common';
import { FileValidationService } from './file-validation.service.js';
import { ImageProcessingService } from './image-processing.service.js';
import { StorageService } from './storage/storage.service.js';

@Global()
@Module({
  providers: [StorageService, ImageProcessingService, FileValidationService],
  exports: [StorageService, ImageProcessingService, FileValidationService],
})
export class UploadsModule {}
