type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const payload: LogPayload = {
      level,
      timestamp: new Date().toISOString(),
      message,
    };

    if (meta) {
      // Mask any potential sensitive tokens or passwords
      const safeMeta: Record<string, unknown> = { ...meta };
      for (const key of Object.keys(safeMeta)) {
        if (/password|token|secret|authorization/i.test(key)) {
          safeMeta[key] = '***MASKED***';
        }
      }
      payload.context = safeMeta;
    }

    return JSON.stringify(payload);
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      console.debug(this.formatLog('debug', message, meta));
    }
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'test') {
      console.info(this.formatLog('info', message, meta));
    }
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.formatLog('warn', message, meta));
  }

  public error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    const payload: LogPayload = {
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
    };

    if (error instanceof Error) {
      payload.error = {
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        code: (error as { code?: string }).code,
      };
    } else if (error) {
      payload.error = { message: String(error) };
    }

    if (meta) {
      const safeMeta: Record<string, unknown> = { ...meta };
      for (const key of Object.keys(safeMeta)) {
        if (/password|token|secret|authorization/i.test(key)) {
          safeMeta[key] = '***MASKED***';
        }
      }
      payload.context = safeMeta;
    }

    console.error(JSON.stringify(payload));
  }
}

export const logger = new Logger();
