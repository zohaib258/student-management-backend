
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userSession = request.session;

    if (!userSession || !userSession.userId) {
      throw new HttpException(
        { message: 'Please log in first.' },
        401,
      );
    }

    return true;
  }
}
