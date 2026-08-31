import { Injectable } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { DomainException } from '../common/exceptions/domain.exception.js';
import { ErrorCode } from '../common/constants/error-codes.constants.js';

export interface ValidateFileOptions {
  buffer: Buffer;
  maxBytes: number;
  allowedMimeTypes: readonly string[];
}

@Injectable()
export class FileValidationService {
  /**
   * Never trusts the client-supplied filename/Content-Type: sniffs the real
   * type from the file's magic bytes (roadmap Fase 13 — upload seguro).
   */
  async assertValid({
    buffer,
    maxBytes,
    allowedMimeTypes,
  }: ValidateFileOptions): Promise<{ mime: string; ext: string }> {
    if (buffer.byteLength === 0) {
      throw new DomainException(ErrorCode.VALIDATION_ERROR, 'Arquivo vazio.');
    }

    if (buffer.byteLength > maxBytes) {
      throw new DomainException(
        ErrorCode.VALIDATION_ERROR,
        `Arquivo excede o tamanho máximo de ${Math.floor(maxBytes / 1024 / 1024)}MB.`,
      );
    }

    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !allowedMimeTypes.includes(detected.mime)) {
      throw new DomainException(
        ErrorCode.VALIDATION_ERROR,
        'Tipo de arquivo não permitido ou não corresponde ao conteúdo enviado.',
      );
    }

    return { mime: detected.mime, ext: detected.ext };
  }
}
