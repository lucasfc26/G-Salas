import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './jobs/worker.module.js';

async function bootstrap() {
  const logger = new Logger('Worker');
  // No bufferLogs here: unlike main.ts, nothing ever calls app.useLogger()
  // to flush a buffered logger for an application context (no HTTP
  // lifecycle to trigger it), so buffering would silently swallow every
  // log line for the life of the process.
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  logger.log('Worker pronto — processando as filas "contracts" e "financial".');
}

await bootstrap();
