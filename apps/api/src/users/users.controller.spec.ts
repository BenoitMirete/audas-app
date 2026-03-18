import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateRole: jest.fn(),
  remove: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /users returns all users', async () => {
    mockService.findAll.mockResolvedValue([{ id: '1' }]);
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
  });

  it('GET /users/:id returns one user', async () => {
    mockService.findOne.mockResolvedValue({ id: '1' });
    const result = await controller.findOne('1');
    expect(result).toEqual({ id: '1' });
  });

  it('PATCH /users/:id/role updates role', async () => {
    mockService.updateRole.mockResolvedValue({ id: '1', role: 'ADMIN' });
    const result = await controller.updateRole('1', { role: 'ADMIN' });
    expect(result.role).toBe('ADMIN');
  });

  it('DELETE /users/:id removes user', async () => {
    mockService.remove.mockResolvedValue(undefined);
    await expect(controller.remove('1')).resolves.toBeUndefined();
  });
});
