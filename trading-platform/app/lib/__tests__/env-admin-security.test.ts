
describe('Admin Security Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Set a valid JWT_SECRET to bypass the existing check
    process.env.JWT_SECRET = 'secure-secret-that-is-very-long-and-random-32-chars';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw an error in production if ENABLE_DEFAULT_ADMIN is true and DEFAULT_ADMIN_PASSWORD is default (admin123)', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEFAULT_ADMIN = 'true';
    process.env.DEFAULT_ADMIN_PASSWORD = 'admin123'; // or undefined, as it defaults to 'admin123'

    expect(() => {
      jest.requireActual('../env');
    }).toThrow(/running in production with default admin credentials/);
  });

  it('should NOT throw an error in production if ENABLE_DEFAULT_ADMIN is true and DEFAULT_ADMIN_PASSWORD is secure', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEFAULT_ADMIN = 'true';
    process.env.DEFAULT_ADMIN_PASSWORD = 'very-secure-password-12345';

    expect(() => {
      jest.requireActual('../env');
    }).not.toThrow();
  });

  it('should NOT throw an error in production if ENABLE_DEFAULT_ADMIN is false (even with default password)', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEFAULT_ADMIN = 'false';
    process.env.DEFAULT_ADMIN_PASSWORD = 'admin123';

    expect(() => {
      jest.requireActual('../env');
    }).not.toThrow();
  });

  it('should NOT throw an error in development (even with default password and admin enabled)', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEFAULT_ADMIN = 'true';
    process.env.DEFAULT_ADMIN_PASSWORD = 'admin123';

    expect(() => {
      jest.requireActual('../env');
    }).not.toThrow();
  });
});
