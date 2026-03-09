
import { /* CanActivate, ExecutionContext,  */Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
/* 
import { AuthGuard } from '@nestjs/passport';
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    // Grab the token from the cookie
    const token = request.cookies?.['auth_token'];

    if (!token) {
      // No token → block request with 401
      throw new UnauthorizedException('No auth token provided');
    }

    // If token exists, let Passport handle validation
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Passport calls this after validation
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user; // Attach user to req.user
  }
} */
