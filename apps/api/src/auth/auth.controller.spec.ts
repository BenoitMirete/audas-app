import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  validateUser: jest.fn(),
  refreshTokens: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/register', () => {
    it('calls authService.register and returns tokens', async () => {
      const tokens = { access_token: 'at', refresh_token: 'rt', user: {} };
      mockAuthService.register.mockResolvedValue(tokens);

      const result = await controller.register({
        email: 'x@x.com',
        password: 'pass123',
        name: 'X',
      });

      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'x@x.com',
        password: 'pass123',
        name: 'X',
      });
      expect(result).toEqual(tokens);
    });
  });

  describe('POST /auth/login', () => {
    it('calls authService.login with validated user', async () => {
      const user = { id: '1', email: 'x@x.com', role: 'VIEWER' };
      const tokens = { access_token: 'at', refresh_token: 'rt', user };
      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login({ user } as any);
      expect(mockAuthService.login).toHaveBeenCalledWith(user);
      expect(result).toEqual(tokens);
    });
  });

  describe('POST /auth/refresh', () => {
    it('calls authService.refreshTokens', async () => {
      const tokens = { access_token: 'at2', refresh_token: 'rt2', user: {} };
      mockAuthService.refreshTokens.mockResolvedValue(tokens);

      const result = await controller.refresh({ refresh_token: 'rt' });
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('rt');
      expect(result).toEqual(tokens);
    });
  });
});
