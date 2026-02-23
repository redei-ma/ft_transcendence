import type { Request } from 'express';
import type { JwtAccessPayloadDto } from './jwt-access-payload.dto';

export interface AuthenticatedRequest extends Request {
  user: JwtAccessPayloadDto;
}