import { z } from 'zod';
import { logger } from './logger';

// Environment variable schema definition
const envSchema = z.object({
  // API Keys and Endpoints
  REPLICATE_API_TOKEN: z.string().min(1),
  SERPER_API_KEY: z.string().min(1),
  SERPER_API_URL: z.string().url(),

  // Tool Configuration
  TOOL_REGISTRY_PATH: z.string().default('.code-ext/src/cache/registry.xml'),
  SYSTEM_PROMPT_PATH: z.string().default('.code-ext/src/cache/sysprompt.xml'),

  // Logging Configuration
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE: z.string().default('.code-cli/logs/app.log'),

  // Cache Configuration
  CACHE_DIR: z.string().default('.code-cli/cache'),
  CACHE_TTL: z.coerce.number().positive().default(3600),
});

// Environment configuration type
export type EnvConfig = z.infer<typeof envSchema>;

class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: EnvConfig;

  private constructor() {
    try {
      // Parse and validate environment variables
      this.config = envSchema.parse({
        REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
        SERPER_API_KEY: process.env.SERPER_API_KEY,
        SERPER_API_URL: process.env.SERPER_API_URL,
        TOOL_REGISTRY_PATH: process.env.TOOL_REGISTRY_PATH,
        SYSTEM_PROMPT_PATH: process.env.SYSTEM_PROMPT_PATH,
        LOG_LEVEL: process.env.LOG_LEVEL,
        LOG_FILE: process.env.LOG_FILE,
        CACHE_DIR: process.env.CACHE_DIR,
        CACHE_TTL: process.env.CACHE_TTL,
      });

      // Ensure required directories exist
      this.ensureDirectories();

      logger.info('Environment configuration loaded successfully');
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Environment validation failed:', {
          issues: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      } else {
        logger.error('Failed to load environment configuration:', error);
      }
      throw error;
    }
  }

  private ensureDirectories(): void {
    const fs = require('fs');
    const path = require('path');

    const directories = [
      path.dirname(this.config.LOG_FILE),
      this.config.CACHE_DIR,
      path.dirname(this.config.TOOL_REGISTRY_PATH),
      path.dirname(this.config.SYSTEM_PROMPT_PATH),
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    }
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  public get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  public getAll(): EnvConfig {
    return { ...this.config };
  }

  public validate(): boolean {
    try {
      envSchema.parse(this.config);
      return true;
    } catch (error) {
      return false;
    }
  }

  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  public isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}

// Export singleton instance
export const env = EnvironmentConfig.getInstance();

// Export utility functions
export const getEnvVar = <K extends keyof EnvConfig>(key: K): EnvConfig[K] => env.get(key);
export const validateEnv = (): boolean => env.validate();
export const isDev = (): boolean => env.isDevelopment();
export const isProd = (): boolean => env.isProduction();
export const isTest = (): boolean => env.isTest(); 