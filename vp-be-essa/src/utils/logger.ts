import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about these colors
winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

/**
 * JSON.stringify that never throws on circular graphs (e.g. AxiosError.request.agent).
 * Drops known noisy HTTP internals and truncates huge strings.
 */
const safeStringify = (value: unknown, space?: number): string => {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (key, val) => {
        if (
          key === 'socket' ||
          key === 'sockets' ||
          key === 'agent' ||
          key === '_httpMessage' ||
          key === 'req' ||
          key === 'res' ||
          key === 'request' ||
          key === 'config' ||
          key === 'parser'
        ) {
          return undefined;
        }
        if (typeof val === 'bigint') return val.toString();
        if (typeof val === 'function') {
          return `[Function ${val.name || 'anonymous'}]`;
        }
        if (val instanceof Error) {
          return {
            name: val.name,
            message: val.message,
            stack: val.stack,
          };
        }
        if (val && typeof val === 'object') {
          if (seen.has(val as object)) return '[Circular]';
          seen.add(val as object);
        }
        if (typeof val === 'string' && val.length > 4000) {
          return `${val.slice(0, 4000)}…[truncated ${val.length} chars]`;
        }
        return val;
      },
      space,
    );
  } catch (err) {
    return `[Unserializable meta: ${err instanceof Error ? err.message : String(err)}]`;
  }
};

const isEmptyPlainObject = (value: unknown): boolean => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  try {
    return Object.keys(value as object).length === 0;
  } catch {
    return false;
  }
};

/** Shared pre-pipeline: never use format.json() here — it crashes on circular meta. */
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
);

const safeJsonFormat = winston.format.printf((info) => {
  const { timestamp, level, message, ...meta } = info;
  const payload: Record<string, unknown> = {
    timestamp,
    level,
    message: typeof message === 'string' ? message : safeStringify(message),
  };
  for (const [key, value] of Object.entries(meta)) {
    if (
      value === undefined ||
      value === null ||
      String(key).startsWith('Symbol(') ||
      isEmptyPlainObject(value)
    ) {
      continue;
    }
    payload[key] = value;
  }
  return safeStringify(payload);
});

// Console format for development (colorized and pretty)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let msg = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      const filteredMeta = Object.fromEntries(
        Object.entries(meta).filter(
          ([key, value]) =>
            !String(key).startsWith('Symbol(') &&
            value !== undefined &&
            value !== null &&
            !isEmptyPlainObject(value),
        ),
      );

      if (Object.keys(filteredMeta).length > 0) {
        msg += ` ${safeStringify(filteredMeta, 2)}`;
      }
    }

    return msg;
  }),
);

// Define transports
const transports: winston.transport[] = [];

// Console transport - always enabled
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
  }),
);

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, '../../logs');

  const fileFormat = winston.format.combine(baseFormat, safeJsonFormat);

  // All logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'all.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  );

  // Error logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  // Do NOT use winston.format.json() at the root — it JSON.stringifies
  // splat/meta and throws on AxiosError circular refs, crashing the process.
  format: baseFormat,
  transports,
  exitOnError: false,
});

// Without this listener, a transport/format failure becomes uncaughtException
// and the process exits (seen when Graph/Axios errors are passed to logger.error).
logger.on("error", (err) => {
  try {
    // eslint-disable-next-line no-console
    console.error("[winston] transport/format error:", err?.message || err);
  } catch {
    // ignore
  }
});

/** Safe error meta for logger.error — never pass raw Axios/Graph Error objects as splat. */
export const errorMeta = (err: unknown): Record<string, string | undefined> => {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  try {
    return { message: String(err) };
  } catch {
    return { message: "Unknown error" };
  }
};

// Create a stream object for Morgan HTTP logger
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Export logger with typed methods
export default logger;

// Helper functions for common logging patterns
export const logError = (error: Error | string, context?: Record<string, any>) => {
  if (error instanceof Error) {
    logger.error(error?.message, {
      stack: error?.stack,
      ...context,
    });
  } else {
    logger.error(error, context);
  }
};

export const logRequest = (req: any, message: string) => {
  logger.http(message, {
    method: req?.method,
    url: req?.url,
    ip: req?.ip,
    user: req?.user?.id,
  });
};

export const logDatabaseError = (error: Error, query?: string) => {
  logger.error('Database Error', {
    message: error?.message,
    stack: error?.stack,
    query,
  });
};

export const logApiError = (error: any, endpoint: string, context?: Record<string, any>) => {
  logger.error(`API Error: ${endpoint}`, {
    message: error?.message || String(error),
    status: error?.response?.status,
    data:
      error?.response?.data && typeof error.response.data === 'object'
        ? error.response.data
        : error?.response?.data != null
          ? String(error.response.data).slice(0, 500)
          : null,
    stack: error?.stack,
    ...context,
  });
};
