import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { AppModule } from './backend/app.module.js';

// Lấy đường dẫn thư mục hiện tại (ESM không có __dirname)
const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function bootstrap() {
  // Dùng NestExpressApplication để truy cập API của Express (setViewEngine, useStaticAssets...)
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── Cấu hình EJS làm template engine ──────────────────────────────────────
  // Thư mục chứa các file .ejs (khi build sẽ copy vào dist/views)
  app.setBaseViewsDir(join(__dirname, 'views'));
  app.setViewEngine('ejs');

  // ── ValidationPipe toàn cục (cho API) ─────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🎱 Server đang chạy tại http://localhost:${port}`);
}
await bootstrap();
