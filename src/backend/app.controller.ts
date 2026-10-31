import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Render,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from './modules/auth/auth.guard.js';
import { BilliardTablesService } from './modules/billiard-tables/billiard-tables.service.js';
import { MenuItemsService } from './modules/menu-items/menu-items.service.js';
import { OrdersService } from './modules/orders/orders.service.js';
import { InvoicesService } from './modules/invoices/invoices.service.js';
import { ShiftsService } from './modules/shifts/shifts.service.js';
import { RevenueService } from './modules/revenue/revenue.service.js';

// ─── Controller chính — render giao diện EJS ───────────────────────────────
// Mỗi route GET render view EJS, mỗi route POST xử lý form rồi redirect.
// HTML form chỉ hỗ trợ GET/POST nên ta dùng POST cho tất cả mutation.

@Controller()
@UseGuards(AuthGuard)
export class AppController {
  constructor(
    private readonly tableService: BilliardTablesService,
    private readonly menuService: MenuItemsService,
    private readonly orderService: OrdersService,
    private readonly invoiceService: InvoicesService,
    private readonly shiftService: ShiftsService,
    private readonly revenueService: RevenueService,
  ) {}

  // ════════════════════════════════════════════════════════════════════════════
  // TRANG CHỦ / DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════

  // GET / → render trang chủ với thống kê nhanh
  @Get()
  @Render('index')
  async index(@Query('error') error?: string) {
    const [tables, openShift, todayRevenue, openOrders] = await Promise.all([
      this.tableService.findAll(),
      this.shiftService.findOpenShift(),
      this.revenueService.getTodayRevenue(),
      this.orderService.findOpenOrders(),
    ]);

    return {
      tables,
      openShift,
      openOrders,
      error,
      stats: {
        totalTables: tables.length,
        occupiedTables: tables.filter((t) => t.status === 'OCCUPIED').length,
        availableTables: tables.filter((t) => t.status === 'AVAILABLE').length,
        todayRevenue: todayRevenue.totalRevenue,
        todayInvoices: todayRevenue.totalInvoices,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // QUẢN LÝ BÀN BI-DA  (/tables)
  // ════════════════════════════════════════════════════════════════════════════

  // GET /tables → danh sách bàn
  @Get('tables')
  @Render('tables/list')
  async tableList(@Query('message') message?: string, @Query('error') error?: string) {
    const tables = await this.tableService.findAll();
    return { tables, message, error };
  }

  // GET /tables/new → form thêm bàn mới
  @Get('tables/new')
  @Render('tables/new')
  tableNew() {
    return {};
  }

  // POST /tables → xử lý tạo bàn mới
  @Post('tables')
  async tableCreate(@Body() body: any, @Res() res: Response) {
    try {
      await this.tableService.create({
        name: body.name,
        price: Number(body.price),
      });
      res.redirect('/tables?message=Thêm bàn thành công');
    } catch (err: any) {
      res.render('tables/new', { error: err.message, formData: body });
    }
  }

  // GET /tables/:id → chi tiết bàn và lịch sử order
  @Get('tables/:id')
  @Render('tables/detail')
  async tableDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query('message') message?: string,
    @Query('error') error?: string,
  ) {
    const [table, orders] = await Promise.all([
      this.tableService.findOne(id),
      this.orderService.findByTable(id),
    ]);
    return { table, orders, message, error };
  }

  // GET /tables/:id/edit → form sửa bàn
  @Get('tables/:id/edit')
  @Render('tables/edit')
  async tableEdit(@Param('id', ParseIntPipe) id: number) {
    const table = await this.tableService.findOne(id);
    return { table };
  }

  // POST /tables/:id/update → xử lý cập nhật bàn
  @Post('tables/:id/update')
  async tableUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      await this.tableService.update(id, {
        name: body.name,
        price: body.price !== undefined ? Number(body.price) : undefined,
      });
      res.redirect(`/tables/${id}?message=Cập nhật thành công`);
    } catch (err: any) {
      const table = await this.tableService.findOne(id);
      res.render('tables/edit', { table, error: err.message });
    }
  }

  // POST /tables/:id/status → đổi trạng thái thủ công
  @Post('tables/:id/status')
  async tableStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      await this.tableService.updateStatus(id, { status: body.status });
      res.redirect(`/tables/${id}?message=Đã cập nhật trạng thái`);
    } catch (err: any) {
      res.redirect(`/tables/${id}/edit?error=${encodeURIComponent(err.message)}`);
    }
  }

  // POST /tables/:id/delete → xóa bàn
  @Post('tables/:id/delete')
  async tableDelete(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      await this.tableService.remove(id);
      res.redirect('/tables?message=Đã xóa bàn');
    } catch (err: any) {
      res.redirect(`/tables?error=${encodeURIComponent(err.message)}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // THỰC ĐƠN  (/menu)
  // ════════════════════════════════════════════════════════════════════════════

  // GET /menu → danh sách món (tùy chọn lọc theo category)
  @Get('menu')
  @Render('menu/list')
  async menuList(
    @Query('category') category?: string,
    @Query('message') message?: string,
    @Query('error') error?: string,
  ) {
    const items = await this.menuService.findAll();
    // Lọc client-side đơn giản (đã có ít record)
    const filtered = category ? items.filter((i) => i.category === category) : items;
    return { items: filtered, currentCategory: category, message, error };
  }

  // GET /menu/new → form thêm món
  @Get('menu/new')
  @Render('menu/new')
  menuNew() {
    return {};
  }

  // POST /menu → tạo món mới
  @Post('menu')
  async menuCreate(@Body() body: any, @Res() res: Response) {
    try {
      await this.menuService.create({
        name: body.name,
        category: body.category,
        price: Number(body.price),
        description: body.description || undefined,
      });
      res.redirect('/menu?message=Thêm món thành công');
    } catch (err: any) {
      res.render('menu/new', { error: err.message, formData: body });
    }
  }

  // GET /menu/:id/edit → form sửa món
  @Get('menu/:id/edit')
  @Render('menu/edit')
  async menuEdit(@Param('id', ParseIntPipe) id: number) {
    const item = await this.menuService.findOne(id);
    return { item };
  }

  // POST /menu/:id/update → cập nhật món
  @Post('menu/:id/update')
  async menuUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      await this.menuService.update(id, {
        name: body.name,
        category: body.category,
        price: Number(body.price),
        description: body.description || undefined,
        isAvailable: body.isAvailable === 'true',
      });
      res.redirect('/menu?message=Cập nhật món thành công');
    } catch (err: any) {
      const item = await this.menuService.findOne(id);
      res.render('menu/edit', { item, error: err.message });
    }
  }

  // POST /menu/:id/delete → xóa món
  @Post('menu/:id/delete')
  async menuDelete(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      await this.menuService.remove(id);
      res.redirect('/menu?message=Đã xóa món');
    } catch (err: any) {
      res.redirect(`/menu?error=${encodeURIComponent(err.message)}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ORDER  (/orders)
  // ════════════════════════════════════════════════════════════════════════════

  // GET /orders → danh sách order (lọc theo status)
  @Get('orders')
  @Render('orders/list')
  async orderList(
    @Query('status') status?: string,
    @Query('message') message?: string,
    @Query('error') error?: string,
  ) {
    const all = await this.orderService.findAll();
    const orders = status ? all.filter((o) => o.status === status) : all;
    return { orders, message, error };
  }

  // GET /orders/table/:tableId → orders theo bàn
  @Get('orders/table/:tableId')
  @Render('orders/list')
  async orderByTable(@Param('tableId', ParseIntPipe) tableId: number) {
    const orders = await this.orderService.findByTable(tableId);
    return { orders };
  }

  // POST /orders → tạo order mới (bắt đầu phiên chơi)
  @Post('orders')
  async orderCreate(@Body() body: any, @Res() res: Response) {
    try {
      const order = await this.orderService.create({
        tableId: Number(body.tableId),
        note: body.note || undefined,
      });
      res.redirect(`/orders/${order.id}?message=Bắt đầu phiên chơi thành công`);
    } catch (err: any) {
      res.redirect(`/?error=${encodeURIComponent(err.message)}`);
    }
  }

  // GET /orders/:id → chi tiết order
  @Get('orders/:id')
  @Render('orders/detail')
  async orderDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query('message') message?: string,
    @Query('error') error?: string,
  ) {
    const order = await this.orderService.findOne(id);
    return { order, message, error };
  }

  // GET /orders/:id/add-items → form gọi món
  @Get('orders/:id/add-items')
  @Render('orders/add-items')
  async orderAddItemsForm(@Param('id', ParseIntPipe) id: number) {
    const [order, menuItems] = await Promise.all([
      this.orderService.findOne(id),
      this.menuService.findAll(true), // chỉ lấy món đang bán
    ]);
    return { order, menuItems };
  }

  // POST /orders/:id/add-items → xử lý gọi món
  // HTML form gửi items[0][menuItemId], items[1][menuItemId]... dưới dạng object
  @Post('orders/:id/add-items')
  async orderAddItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      // Chuyển object items thành mảng
      const rawItems = body.items as Record<string, { menuItemId: string; quantity: string; note?: string }>;
      const items = Object.values(rawItems)
        .filter((i) => i.menuItemId) // bỏ dòng chưa chọn món
        .map((i) => ({
          menuItemId: Number(i.menuItemId),
          quantity: Number(i.quantity) || 1,
          note: i.note || undefined,
        }));

      if (items.length === 0) {
        throw new Error('Chưa chọn món nào');
      }

      await this.orderService.addItems(id, { items });
      res.redirect(`/orders/${id}?message=Đã thêm món thành công`);
    } catch (err: any) {
      const [order, menuItems] = await Promise.all([
        this.orderService.findOne(id),
        this.menuService.findAll(true),
      ]);
      res.render('orders/add-items', { order, menuItems, error: err.message });
    }
  }

  // GET /orders/:id/preview-bill → xem hóa đơn tạm tính
  @Get('orders/:id/preview-bill')
  @Render('orders/preview-bill')
  async orderPreviewBill(@Param('id', ParseIntPipe) id: number) {
    const bill = await this.orderService.previewBill(id);
    return { bill };
  }

  // POST /orders/:id/close → kết thúc phiên chơi
  @Post('orders/:id/close')
  async orderClose(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      const order = await this.orderService.closeOrder(id);
      // Chuyển thẳng sang trang lập hóa đơn
      res.redirect(`/invoices/new?orderId=${order.id}`);
    } catch (err: any) {
      res.redirect(`/orders/${id}?error=${encodeURIComponent(err.message)}`);
    }
  }

  // POST /orders/:id/cancel → hủy order
  @Post('orders/:id/cancel')
  async orderCancel(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      await this.orderService.cancelOrder(id);
      res.redirect('/orders?message=Đã hủy order');
    } catch (err: any) {
      res.redirect(`/orders/${id}?error=${encodeURIComponent(err.message)}`);
    }
  }

  // POST /orders/:id/items/:itemId/delete → xóa dòng món
  @Post('orders/:id/items/:itemId/delete')
  async orderRemoveItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Res() res: Response,
  ) {
    try {
      await this.orderService.removeItem(id, itemId);
      res.redirect(`/orders/${id}?message=Đã xóa món`);
    } catch (err: any) {
      res.redirect(`/orders/${id}?error=${encodeURIComponent(err.message)}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HÓA ĐƠN  (/invoices)
  // ════════════════════════════════════════════════════════════════════════════

  // GET /invoices → danh sách hóa đơn
  @Get('invoices')
  @Render('invoices/list')
  async invoiceList(@Query('message') message?: string) {
    const invoices = await this.invoiceService.findAll();
    return { invoices, message };
  }

  // GET /invoices/new?orderId=X → form thanh toán
  @Get('invoices/new')
  async invoiceNew(
    @Query('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const order = await this.orderService.findOne(Number(orderId));
    if (order.invoice) {
      return res.redirect(`/invoices/${order.invoice.id}?message=Hóa đơn đã được tạo trước đó`);
    }

    const openShift = await this.shiftService.findOpenShift();
    return res.render('invoices/new', { order, openShift });
  }

  // POST /invoices → tạo hóa đơn
  @Post('invoices')
  async invoiceCreate(@Body() body: any, @Res() res: Response) {
    try {
      const invoice = await this.invoiceService.create({
        orderId: Number(body.orderId),
        paymentMethod: body.paymentMethod,
        discount: body.discount ? Number(body.discount) : 0,
        shiftId: body.shiftId ? Number(body.shiftId) : undefined,
        note: body.note || undefined,
      });
      res.redirect(`/invoices/${invoice.id}?message=Thanh toán thành công`);
    } catch (err: any) {
      const order = await this.orderService.findOne(Number(body.orderId));
      if (order.invoice) {
        return res.redirect(`/invoices/${order.invoice.id}?message=Hóa đơn đã được tạo trước đó`);
      }
      const openShift = await this.shiftService.findOpenShift();
      res.render('invoices/new', { order, openShift, error: err.message });
    }
  }

  // GET /invoices/:id → chi tiết hóa đơn
  @Get('invoices/:id')
  @Render('invoices/detail')
  async invoiceDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query('message') message?: string,
  ) {
    const invoice = await this.invoiceService.findOne(id);
    return { invoice, message };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CA LÀM  (/shifts)
  // ════════════════════════════════════════════════════════════════════════════

  // GET /shifts → danh sách ca làm
  @Get('shifts')
  @Render('shifts/list')
  async shiftList(@Query('message') message?: string, @Query('error') error?: string) {
    const [shifts, openShift] = await Promise.all([
      this.shiftService.findAll(),
      this.shiftService.findOpenShift(),
    ]);
    return { shifts, openShift, message, error };
  }

  // GET /shifts/new → form mở ca mới
  @Get('shifts/new')
  @Render('shifts/new')
  shiftNew() {
    return {};
  }

  // POST /shifts → mở ca mới
  @Post('shifts')
  async shiftCreate(@Body() body: any, @Res() res: Response) {
    try {
      const shift = await this.shiftService.create({
        name: body.name,
        staffName: body.staffName,
        note: body.note || undefined,
      });
      res.redirect(`/shifts?message=Đã mở ca: ${shift.name}`);
    } catch (err: any) {
      res.render('shifts/new', { error: err.message, formData: body });
    }
  }

  // GET /shifts/:id → chi tiết ca
  @Get('shifts/:id')
  @Render('shifts/detail')
  async shiftDetail(@Param('id', ParseIntPipe) id: number) {
    const [summary, invoices] = await Promise.all([
      this.shiftService.getShiftSummary(id),
      this.invoiceService.findByShift(id),
    ]);
    return { shift: summary.shift, summary, invoices };
  }

  // POST /shifts/:id/close → đóng ca
  @Post('shifts/:id/close')
  async shiftClose(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const shift = await this.shiftService.closeShift(id, { note: body.note });
      res.redirect(`/shifts?message=Đã đóng ca: ${shift.name}`);
    } catch (err: any) {
      res.redirect(`/shifts?error=${encodeURIComponent(err.message)}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DOANH THU  (/revenue)
  // ════════════════════════════════════════════════════════════════════════════

  // GET /revenue?year=2026&month=11 → báo cáo doanh thu
  @Get('revenue')
  @Render('revenue/index')
  async revenuePage(
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ) {
    const now = new Date();
    const currentYear = yearStr ? Number(yearStr) : now.getFullYear();
    const currentMonth = monthStr ? Number(monthStr) : now.getMonth() + 1;

    const [today, monthly, daily, shifts] = await Promise.all([
      this.revenueService.getTodayRevenue(),
      this.revenueService.getMonthlyRevenue(currentYear, currentMonth),
      this.revenueService.getDailyRevenue(currentYear, currentMonth),
      this.revenueService.getRevenueByShifts(),
    ]);

    return { today, monthly, daily, shifts, currentYear, currentMonth };
  }
}
