import { Controller, Get, Query } from '@nestjs/common';
import { RevenueQueryDto } from './dto/revenue-query.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('statistics')
export class OrderStatisticsController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('revenue')
  getRevenue(@Query() query: RevenueQueryDto) {
    return this.ordersService.getRevenueStatistics(query.from, query.to);
  }
}
