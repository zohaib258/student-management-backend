
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../common/admin-auth.guard';
import { AdminService } from './admin.service';

@Controller('api/admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('students')
  getStudents(@Query('search') search?: string) {
    return this.adminService.getStudents(search);
  }

  @Get('students/:id')
  getStudent(@Param('id') id: string) {
    return this.adminService.getStudent(id);
  }

  @Put('students/:id')
  updateStudent(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateStudent(id, body);
  }

  @Patch('students/:id/status')
  updateStudentStatus(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.adminService.updateStudentStatus(id, body?.status);
  }

  @Delete('students/:id')
  deleteStudent(@Param('id') id: string) {
    return this.adminService.deleteStudent(id);
  }
}
