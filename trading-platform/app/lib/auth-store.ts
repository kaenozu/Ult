import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  role: 'user' | 'admin';
}

// In-memory user store for demo purposes
// In a production app, this would be a database (PostgreSQL, MongoDB, etc.)
class AuthStore {
  private static instance: AuthStore;
  private users: Map<string, User> = new Map();

  private constructor() {
    // Add a default admin user for testing
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    this.users.set('admin@example.com', {
      id: 'user_admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      name: 'System Admin',
      createdAt: new Date().toISOString(),
      role: 'admin',
    });
  }

  public static getInstance(): AuthStore {
    if (!AuthStore.instance) {
      AuthStore.instance = new AuthStore();
    }
    return AuthStore.instance;
  }

  public getUser(email: string): User | undefined {
    return this.users.get(email.toLowerCase());
  }

  public getUserById(userId: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return user;
      }
    }
    return undefined;
  }

  public addUser(user: User): boolean {
    if (this.users.has(user.email.toLowerCase())) {
      return false;
    }
    this.users.set(user.email.toLowerCase(), user);
    return true;
  }

  public clear(): void {
    this.users.clear();
  }
}

export const authStore = AuthStore.getInstance();
