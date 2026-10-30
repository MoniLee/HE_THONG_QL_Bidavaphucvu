import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { fileURLToPath } from 'url';
import { join } from 'path';

// ESM không có __dirname — dùng import.meta.url để lấy đường dẫn thư mục hiện tại
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ─── Cấu hình kết nối MySQL XAMPP ───────────────────────────────────────────
// Thay đổi host, port, username, password nếu XAMPP của bạn khác mặc định.
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASS ?? '',      // XAMPP mặc định không có password
  database: process.env.DB_NAME ?? 'quan_ly_bida',

  // Tự động tìm entity trong thư mục modules (dùng join thay vì string concat)
  entities: [join(__dirname, '..', 'modules', '**', '*.entity{.ts,.js}')],

  // synchronize: true → TypeORM tự tạo/cập nhật bảng theo entity (chỉ dùng khi dev)
  // Đặt false khi production và dùng migration thay thế
  synchronize: true,

  // Hiển thị câu SQL được thực thi (tiện debug, tắt khi production)
  logging: process.env.NODE_ENV !== 'production',

  charset: 'utf8mb4',
  timezone: '+07:00', // múi giờ Việt Nam
};
