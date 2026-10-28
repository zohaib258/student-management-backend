
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userSession = request.session;

    if (
      !userSession ||
      !userSession.userId ||
      userSession.role !== 'admin'
    ) {
      throw new ForbiddenException({
        message: 'Admin access required.',
      });
    }

    return true;
  }
}
