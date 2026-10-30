import 'dotenv/config';
import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ViewsController } from './views.controller.js';
import { CategoriesModule } from './categories/categories.module.js';
import { CouponsModule } from './coupons/coupons.module.js';
import { AddressesModule } from './addresses/addresses.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { AuthModule } from './auth/auth.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ProductsModule } from './products/products.module.js';
import { UsersModule } from './users/users.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

const databaseUrl = process.env.DATABASE_URL;
const databaseType = process.env.DB_TYPE ?? (databaseUrl ? 'postgres' : 'mysql');
const synchronize = process.env.NODE_ENV !== 'production';

function getDatabaseOptions(): TypeOrmModuleOptions {
  if (databaseType === 'postgres') {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required when DB_TYPE is postgres.');
    }

    return {
      type: 'postgres',
      url: databaseUrl,
      ssl: true,
      autoLoadEntities: true,
      synchronize,
    };
  }

  if (databaseType === 'mysql') {
    return {
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'nestjs_db',
      autoLoadEntities: true,
      synchronize,
    };
  }

  throw new Error(`Unsupported DB_TYPE "${databaseType}". Use "mysql" or "postgres".`);
}

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseOptions()),
    CategoriesModule,
    CouponsModule,
    AuditLogsModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    ProductsModule,
    OrdersModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'lab3',
    }),
  ],
  controllers: [AppController, ViewsController],
  providers: [AppService],
})
export class AppModule {}
