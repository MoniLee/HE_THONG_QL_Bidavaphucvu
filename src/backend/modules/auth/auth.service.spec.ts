import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { User, UserRole } from './entities/user.entity.js';

describe('AuthService', () => {
  let authService: AuthService;
  const savedUser = {
    id: 1,
    email: 'staff@example.com',
    fullName: 'Staff User',
    password: '',
    role: UserRole.STAFF,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies User;
  const usersRepository = {
    findOneBy: vi.fn(),
    create: vi.fn((user: Partial<User>) => user),
    save: vi.fn(async (user: Partial<User>) => ({ ...savedUser, ...user })),
    createQueryBuilder: vi.fn(),
  };
  const jwtService = {
    signAsync: vi.fn().mockResolvedValue('signed-access-token'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    authService = moduleRef.get(AuthService);
  });

  it('registers a STAFF account with a hashed password', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);

    const session = await authService.register({
      email: '  STAFF@EXAMPLE.COM ',
      fullName: '  Staff User ',
      password: 'strong-password',
    });

    const createdUser = usersRepository.create.mock.calls[0][0] as User;
    expect(createdUser.email).toBe('staff@example.com');
    expect(createdUser.role).toBe(UserRole.STAFF);
    expect(await bcrypt.compare('strong-password', createdUser.password)).toBe(true);
    expect(session).toEqual({
      accessToken: 'signed-access-token',
      user: {
        id: 1,
        email: 'staff@example.com',
        fullName: 'Staff User',
        role: UserRole.STAFF,
      },
    });
  });

  it('rejects duplicate email addresses', async () => {
    usersRepository.findOneBy.mockResolvedValue(savedUser);

    await expect(
      authService.register({
        email: 'staff@example.com',
        fullName: 'Staff User',
        password: 'strong-password',
      }),
    ).rejects.toThrow('Email đã được đăng ký');
    expect(usersRepository.save).not.toHaveBeenCalled();
  });

  it('increments failed login attempts for an incorrect password', async () => {
    const user = {
      ...savedUser,
      password: await bcrypt.hash('correct-password', 4),
      failedLoginAttempts: 0,
    };
    const queryBuilder = {
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(user),
    };
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(
      authService.login({
        email: user.email,
        password: 'incorrect-password',
      }),
    ).rejects.toThrow('Email hoặc mật khẩu không chính xác');
    expect(user.failedLoginAttempts).toBe(1);
    expect(usersRepository.save).toHaveBeenCalledWith(user);
  });
});
