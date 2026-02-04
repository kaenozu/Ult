/**
 * Environment Variable Validation Utility
 * 
 * Provides type-safe access to environment variables with validation.
 * Ensures required variables are present in production environments.
 */

export interface EnvironmentConfig {
  // Required in production
  jwt: {
    secret: string;
    expiration: string;
  };
  database: {
    url: string;
  };
  
  // Optional with defaults
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enabled: boolean;
  };
  analytics: {
    enabled: boolean;
  };
  rateLimit: {
    max: number;
  };
  
  // Environment
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentValidationError';
  }
}

/**
 * Get environment variable with optional fallback
 */
function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new EnvironmentValidationError(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable
 */
function getOptionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/**
 * Get boolean environment variable
 */
function getBooleanEnv(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === 'true';
}

/**
 * Get number environment variable
 */
function getNumberEnv(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return fallback;
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new EnvironmentValidationError(`Invalid number for ${key}: ${value}`);
  }
  return num;
}

/**
 * Validate and load environment configuration
 */
export function validateEnvironment(): EnvironmentConfig {
  const nodeEnv = getOptionalEnv('NODE_ENV', 'development') as 'development' | 'test' | 'production';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';
  const isTest = nodeEnv === 'test';

  try {
    // JWT Configuration
    let jwtSecret: string;
    if (isProduction) {
      // In production, JWT_SECRET is required
      jwtSecret = getEnv('JWT_SECRET');
      if (jwtSecret === 'default-secret-change-in-production') {
        throw new EnvironmentValidationError(
          'JWT_SECRET must be changed from default value in production'
        );
      }
    } else {
      // In development/test, allow fallback
      jwtSecret = getOptionalEnv('JWT_SECRET', 'dev-secret-key-do-not-use-in-production');
    }

    const jwtExpiration = getOptionalEnv('JWT_EXPIRATION', '24h');

    // Database Configuration
    let databaseUrl: string;
    if (isProduction) {
      databaseUrl = getEnv('DATABASE_URL');
    } else {
      databaseUrl = getOptionalEnv('DATABASE_URL', '');
    }

    // Logging Configuration
    const logLevelRaw = getOptionalEnv('LOG_LEVEL', isDevelopment ? 'debug' : 'info');
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(logLevelRaw)) {
      throw new EnvironmentValidationError(
        `Invalid LOG_LEVEL: ${logLevelRaw}. Must be one of: ${validLogLevels.join(', ')}`
      );
    }
    const logLevel = logLevelRaw as 'debug' | 'info' | 'warn' | 'error';
    const loggingEnabled = getBooleanEnv('ENABLE_LOGGING', true);

    // Analytics Configuration
    const analyticsEnabled = getBooleanEnv('ENABLE_ANALYTICS', isProduction);

    // Rate Limiting Configuration
    const rateLimitMax = getNumberEnv('RATE_LIMIT_MAX', 100);

    return {
      jwt: {
        secret: jwtSecret,
        expiration: jwtExpiration,
      },
      database: {
        url: databaseUrl,
      },
      logging: {
        level: logLevel,
        enabled: loggingEnabled,
      },
      analytics: {
        enabled: analyticsEnabled,
      },
      rateLimit: {
        max: rateLimitMax,
      },
      nodeEnv,
      isProduction,
      isDevelopment,
      isTest,
    };
  } catch (error) {
    if (error instanceof EnvironmentValidationError) {
      console.error('❌ Environment Validation Failed:');
      console.error(`   ${error.message}`);
      console.error('\nPlease check your .env.local file and ensure all required variables are set.');
      console.error('See .env.example for reference.\n');
      throw error;
    }
    throw error;
  }
}

/**
 * Cached configuration instance
 * Validates once at startup
 */
let cachedConfig: EnvironmentConfig | null = null;

/**
 * Get validated environment configuration
 * Uses cached instance after first call
 */
export function getConfig(): EnvironmentConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnvironment();
  }
  return cachedConfig;
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

export { EnvironmentValidationError };
