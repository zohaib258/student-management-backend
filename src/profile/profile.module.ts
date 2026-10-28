
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProfileController],
  providers: [ProfileService, SessionAuthGuard],
})
export class ProfileModule {}
