import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { RevenueService } from './revenue.service.js';
import { AuthGuard } from '../auth/auth.guard.js';

@Controller('api/revenue')
@UseGuards(AuthGuard)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  // ── GET /api/revenue/today ─── Doanh thu hôm nay
  @Get('today')
  getTodayRevenue() {
    return this.revenueService.getTodayRevenue();
  }

  // ── GET /api/revenue/shifts ─── Doanh thu theo từng ca làm
  @Get('shifts')
  getRevenueByShifts() {
    return this.revenueService.getRevenueByShifts();
  }

  // ── GET /api/revenue/monthly?year=2026&month=11 ─── Doanh thu tháng
  @Get('monthly')
  getMonthlyRevenue(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.revenueService.getMonthlyRevenue(year, month);
  }

  // ── GET /api/revenue/daily?year=2026&month=11 ─── Doanh thu từng ngày trong tháng
  @Get('daily')
  getDailyRevenue(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.revenueService.getDailyRevenue(year, month);
  }

  // ── GET /api/revenue/range?from=2026-11-01&to=2026-11-07 ─── Doanh thu theo khoảng ngày
  @Get('range')
  getRevenueByRange(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.revenueService.getRevenueByDateRange(
      new Date(from),
      new Date(to),
    );
  }
}
