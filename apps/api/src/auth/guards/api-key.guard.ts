import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { headers: Record<string, string> }>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('API key required');
    }

    const rawKey = authHeader.slice(7);
    const allKeys = await this.prisma.apiKey.findMany();

    for (const apiKey of allKeys) {
      const match = await bcrypt.compare(rawKey, apiKey.keyHash);
      if (match) {
        (request as any).apiKeyProjectId = apiKey.projectId;
        return true;
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }
}
