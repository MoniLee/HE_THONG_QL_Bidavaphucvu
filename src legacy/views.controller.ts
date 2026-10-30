import { Controller, Get, Header, Render } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

@Controller()
export class ViewsController {
  @Get('api-guide')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async apiGuide() {
    return readFile(join(process.cwd(), 'API_GUIDE.txt'), 'utf8');
  }

  @Get('login')
  @Render('login')
  login() {
    return {};
  }

  @Get('dashboard')
  @Render('dashboard')
  dashboard() {
    return {};
  }
}
