import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  userId: number;
  username: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtUser;
  }
);
