
describe('Environment Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw an error in production if JWT_SECRET is default', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'demo-secret-must-be-at-least-32-chars-long';

    expect(() => {
      jest.requireActual('../env');
    }).toThrow('Critical Security Error');
  });

  it('should NOT throw an error in production if JWT_SECRET is secure', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secure-secret-that-is-very-long-and-random-32-chars';

    expect(() => {
      jest.requireActual('../env');
    }).not.toThrow();
  });

  it('should NOT throw an error in development with default secret', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'demo-secret-must-be-at-least-32-chars-long';

    expect(() => {
      jest.requireActual('../env');
    }).not.toThrow();
  });
});
