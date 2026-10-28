import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // @Get('api/db-test')
  // async testDatabase() {
  //   await this.databaseService.query('SELECT 1 AS test');

  //   return {
  //     success: true,
  //     message: 'NestJS connected to MySQL successfully',
  //   };
  // }
}
