import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface CustomRequest extends Request {
  id?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Cast to custom type
    const customReq = req as CustomRequest;

    // Generate or use existing request ID
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // Attach to request object
    customReq.id = requestId;

    // Add to response headers
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
