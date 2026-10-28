
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AdminAuthGuard } from '../common/admin-auth.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
