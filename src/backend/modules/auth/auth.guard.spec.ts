import { AuthGuard } from './auth.guard.js';
import { User, UserRole } from './entities/user.entity.js';

describe('AuthGuard', () => {
  const jwtService = { verifyAsync: vi.fn() };
  const usersRepository = { findOneBy: vi.fn() };
  let authGuard: AuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    authGuard = new AuthGuard(jwtService as never, usersRepository as never);
  });

  function createContext(request: object, response: object) {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as never;
  }

  it('returns JSON 401 for unauthenticated API requests', async () => {
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await expect(
      authGuard.canActivate(
        createContext(
          { path: '/api/orders', originalUrl: '/api/orders', headers: {} },
          response,
        ),
      ),
    ).resolves.toBe(false);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  it('redirects unauthenticated browser requests to login', async () => {
    const response = { redirect: vi.fn() };

    await expect(
      authGuard.canActivate(
        createContext(
          { path: '/tables', originalUrl: '/tables?status=open', headers: {} },
          response,
        ),
      ),
    ).resolves.toBe(false);
    expect(response.redirect).toHaveBeenCalledWith(
      '/auth/login?returnTo=%2Ftables%3Fstatus%3Dopen',
    );
  });

  it('allows active staff and stores a safe user profile for templates', async () => {
    const staffUser = {
      id: 5,
      email: 'staff@example.com',
      fullName: 'Staff User',
      role: UserRole.STAFF,
      isActive: true,
    } satisfies Partial<User>;
    const request = {
      path: '/api/orders',
      originalUrl: '/api/orders',
      headers: { authorization: 'Bearer access-token' },
    };
    const response = { locals: {} as Record<string, unknown> };
    jwtService.verifyAsync.mockResolvedValue({ sub: staffUser.id });
    usersRepository.findOneBy.mockResolvedValue(staffUser);

    await expect(
      authGuard.canActivate(createContext(request, response)),
    ).resolves.toBe(true);
    expect(response.locals.currentUser).toEqual({
      id: 5,
      email: 'staff@example.com',
      fullName: 'Staff User',
      role: UserRole.STAFF,
    });
  });

  it('rejects customer accounts from management APIs', async () => {
    const customer = {
      id: 7,
      email: 'customer@example.com',
      fullName: 'Customer User',
      role: UserRole.CUSTOMER,
      isActive: true,
    } satisfies Partial<User>;
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    jwtService.verifyAsync.mockResolvedValue({ sub: customer.id });
    usersRepository.findOneBy.mockResolvedValue(customer);

    await expect(
      authGuard.canActivate(
        createContext(
          {
            path: '/api/revenue/today',
            originalUrl: '/api/revenue/today',
            headers: { authorization: 'Bearer access-token' },
          },
          response,
        ),
      ),
    ).resolves.toBe(false);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Không có quyền truy cập',
    });
  });
});
