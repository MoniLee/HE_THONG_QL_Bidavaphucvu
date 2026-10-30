import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Shift } from '../shifts/entities/shift.entity.js';

// Kiểu trả về tổng hợp doanh thu
export interface RevenueSummary {
  totalInvoices: number;      // số hóa đơn
  totalRevenue: number;        // tổng tiền thu
  tableRevenue: number;        // tiền từ bàn (giờ chơi)
  itemsRevenue: number;        // tiền từ món ăn/nước uống
  totalDiscount: number;       // tổng giảm giá
  byPaymentMethod: {
    CASH: number;
    TRANSFER: number;
    CARD: number;
  };
}

@Injectable()
export class RevenueService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,

    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
  ) {}

  // ─── Thống kê doanh thu theo khoảng ngày ──────────────────────────────────
  async getRevenueByDateRange(
    from: Date,
    to: Date,
  ): Promise<RevenueSummary> {
    // Đặt giờ kết thúc về 23:59:59 để bao gồm cả ngày cuối
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    const invoices = await this.invoiceRepo.find({
      where: { issuedAt: Between(from, toEnd) },
    });

    return this.summarize(invoices);
  }

  // ─── Thống kê doanh thu hôm nay ───────────────────────────────────────────
  async getTodayRevenue(): Promise<RevenueSummary> {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const invoices = await this.invoiceRepo.find({
      where: { issuedAt: Between(from, to) },
    });
    return this.summarize(invoices);
  }

  // ─── Thống kê doanh thu theo tháng (year/month) ───────────────────────────
  async getMonthlyRevenue(year: number, month: number): Promise<RevenueSummary> {
    // Ngày đầu tháng
    const from = new Date(year, month - 1, 1, 0, 0, 0);
    // Ngày cuối tháng
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const invoices = await this.invoiceRepo.find({
      where: { issuedAt: Between(from, to) },
    });
    return this.summarize(invoices);
  }

  // ─── Doanh thu theo từng ca làm ────────────────────────────────────────────
  async getRevenueByShifts(): Promise<
    { shiftId: number; shiftName: string; staffName: string; startTime: Date; endTime: Date | null; totalRevenue: number }[]
  > {
    const shifts = await this.shiftRepo.find({
      order: { startTime: 'DESC' },
    });

    return shifts.map((s) => ({
      shiftId: s.id,
      shiftName: s.name,
      staffName: s.staffName,
      startTime: s.startTime,
      endTime: s.endTime,
      totalRevenue: Number(s.totalRevenue),
    }));
  }

  // ─── Doanh thu từng ngày trong tháng ──────────────────────────────────────
  async getDailyRevenue(year: number, month: number): Promise<
    { date: string; totalRevenue: number; totalInvoices: number }[]
  > {
    const from = new Date(year, month - 1, 1, 0, 0, 0);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const invoices = await this.invoiceRepo.find({
      where: { issuedAt: Between(from, to) },
    });

    // Nhóm theo ngày
    const grouped: Record<string, { totalRevenue: number; totalInvoices: number }> = {};
    for (const inv of invoices) {
      const dateKey = inv.issuedAt.toISOString().split('T')[0]; // yyyy-mm-dd
      if (!grouped[dateKey]) {
        grouped[dateKey] = { totalRevenue: 0, totalInvoices: 0 };
      }
      grouped[dateKey].totalRevenue += Number(inv.totalAmount);
      grouped[dateKey].totalInvoices += 1;
    }

    // Trả về mảng sắp xếp theo ngày
    return Object.entries(grouped)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ─── Helper: tính tổng từ mảng hóa đơn ───────────────────────────────────
  private summarize(invoices: Invoice[]): RevenueSummary {
    const result: RevenueSummary = {
      totalInvoices: invoices.length,
      totalRevenue: 0,
      tableRevenue: 0,
      itemsRevenue: 0,
      totalDiscount: 0,
      byPaymentMethod: { CASH: 0, TRANSFER: 0, CARD: 0 },
    };

    for (const inv of invoices) {
      result.totalRevenue += Number(inv.totalAmount);
      result.tableRevenue += Number(inv.tableAmount);
      result.itemsRevenue += Number(inv.itemsAmount);
      result.totalDiscount += Number(inv.discount);
      result.byPaymentMethod[inv.paymentMethod] += Number(inv.totalAmount);
    }

    return result;
  }
}
