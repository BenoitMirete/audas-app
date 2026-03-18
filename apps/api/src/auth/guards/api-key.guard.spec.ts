import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  apiKey: {
    findMany: jest.fn(),
  },
};

function makeContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization: authHeader },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;

  beforeEach(() => {
    guard = new ApiKeyGuard(mockPrisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  it('throws when Authorization header is missing', async () => {
    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
  });

  it('throws when header is not Bearer format', async () => {
    await expect(guard.canActivate(makeContext('Basic abc'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns true when a valid API key is found', async () => {
    const rawKey = 'my-api-key';
    const hash = await bcrypt.hash(rawKey, 10);
    mockPrisma.apiKey.findMany.mockResolvedValue([{ keyHash: hash, projectId: 'p1' }]);

    const ctx = makeContext(`Bearer ${rawKey}`);
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('throws when no key hash matches', async () => {
    mockPrisma.apiKey.findMany.mockResolvedValue([{ keyHash: 'other-hash', projectId: 'p1' }]);
    await expect(guard.canActivate(makeContext('Bearer bad-key'))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
