/**
 * @jest-environment node
 */
import { POST as registerHandler } from '../register/route';
import { POST as loginHandler } from '../login/route';

// Set env var before other code runs (though imports might have already read it)
process.env.JWT_SECRET = 'test-secret-must-be-at-least-32-chars-long';

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await registerHandler(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('test@example.com');
      expect(data.token).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await registerHandler(request);
      expect(response.status).toBe(400);
    });

    it('should reject short password', async () => {
      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User',
        }),
      });

      const response = await registerHandler(request);
      expect(response.status).toBe(400);
    });

    it('should reject duplicate email', async () => {
      // Register first user
      const request1 = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'First User',
        }),
      });
      await registerHandler(request1);

      // Try to register with same email
      const request2 = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'password456',
          name: 'Second User',
        }),
      });
      const response = await registerHandler(request2);
      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a test user
      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'password123',
          name: 'Login Test User',
        }),
      });
      await registerHandler(request);
    });

    it('should login with valid credentials', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('login@example.com');
      expect(data.token).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'wrongpassword',
        }),
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(401);
    });

    it('should reject invalid email format', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
        }),
      });

      const response = await loginHandler(request);
      expect(response.status).toBe(400);
    });
  });
});
