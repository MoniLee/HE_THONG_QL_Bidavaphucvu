import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  app.setBaseViewsDir(join(process.cwd(), 'frontend'));
  app.setViewEngine('ejs');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'https://it24m.dak.edu.vn')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });
  const port = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
await bootstrap();
