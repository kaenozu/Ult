
describe('Environment Admin Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw an error in production if ENABLE_DEFAULT_ADMIN is true and DEFAULT_ADMIN_PASSWORD is default', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEFAULT_ADMIN = 'true';
    process.env.DEFAULT_ADMIN_PASSWORD = 'admin123';
    process.env.JWT_SECRET = 'secure-secret-that-is-at-least-32-chars-long'; // To avoid JWT error

    expect(() => {
      jest.requireActual('../env');
    }).toThrow('CRITICAL SECURITY ERROR: You are running in production with ENABLE_DEFAULT_ADMIN=true but using the default password (admin123). Please set a strong DEFAULT_ADMIN_PASSWORD environment variable.');
  });

  it('should NOT throw an error in production if ENABLE_DEFAULT_ADMIN is false', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEFAULT_ADMIN = 'false';
    process.env.DEFAULT_ADMIN_PASSWORD = 'admin123';
    process.env.JWT_SECRET = 'secure-secret-that-is-at-least-32-chars-long';

    expect(() => {
      jest.requireActual('../env');
    }).not.toThrow();
  });

  it('should NOT throw an error in production if ENABLE_DEFAULT_ADMIN is true and password is secure', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEFAULT_ADMIN = 'true';
    process.env.DEFAULT_ADMIN_PASSWORD = 'secure-password-changed';
    process.env.JWT_SECRET = 'secure-secret-that-is-at-least-32-chars-long';

    expect(() => {
      jest.requireActual('../env');
    }).not.toThrow();
  });
});
