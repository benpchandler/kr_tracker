export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
}

interface LogMetadata extends Record<string, unknown> {
  error?: unknown;
}

const MAX_BUFFER_SIZE = 200;

const consoleMethodMap: Record<LogLevel, keyof Console> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

const shouldLogToConsole = (level: LogLevel): boolean => {
  if (import.meta.env.MODE === 'test') {
    return false;
  }

  if (import.meta.env.DEV) {
    return true;
  }

  return level === 'warn' || level === 'error';
};

const ensureLogBuffer = (): LogEntry[] => {
  const target = globalThis as typeof globalThis & { __KR_TRACKER_LOGS__?: LogEntry[] };
  if (!target.__KR_TRACKER_LOGS__) {
    target.__KR_TRACKER_LOGS__ = [];
  }
  const buffer = target.__KR_TRACKER_LOGS__;
  if (buffer.length > MAX_BUFFER_SIZE) {
    target.__KR_TRACKER_LOGS__ = buffer.slice(-MAX_BUFFER_SIZE);
  }
  return target.__KR_TRACKER_LOGS__;
};

const normalizeError = (error: unknown): LogEntry['error'] => {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as Record<string, unknown>;
    const name = typeof candidate.name === 'string' ? candidate.name : undefined;
    const message = typeof candidate.message === 'string' ? candidate.message : JSON.stringify(candidate);
    const stack = typeof candidate.stack === 'string' ? candidate.stack : undefined;
    return { name, message, stack };
  }

  return { message: String(error) };
};

const summarizeMetadata = (metadata: LogMetadata | undefined): {
  metadata?: Record<string, unknown>;
  error?: LogEntry['error'];
} => {
  if (!metadata) {
    return {};
  }

  const { error, ...rest } = metadata;
  const normalizedError = normalizeError(error);
  const hasMetadata = Object.keys(rest).length > 0;

  return {
    metadata: hasMetadata ? rest : undefined,
    error: normalizedError,
  };
};

const emitToConsole = (level: LogLevel, message: string, entry: LogEntry) => {
  if (!shouldLogToConsole(level)) {
    return;
  }

  const consoleMethod = consoleMethodMap[level];
  const parts: unknown[] = [`[kr-tracker] ${message}`];

  if (entry.metadata) {
    parts.push(entry.metadata);
  }

  if (entry.error) {
    parts.push(entry.error);
  }

  try {
    console[consoleMethod](...parts);
  } catch {
    console.error('[kr-tracker] Failed to emit log entry');
  }
};

const appendToBuffer = (entry: LogEntry) => {
  const buffer = ensureLogBuffer();
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER_SIZE) {
    buffer.splice(0, buffer.length - MAX_BUFFER_SIZE);
  }
};

const log = (level: LogLevel, message: string, metadata?: LogMetadata) => {
  const { metadata: normalizedMetadata, error } = summarizeMetadata(metadata);
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    metadata: normalizedMetadata,
    error,
  };

  appendToBuffer(entry);
  emitToConsole(level, message, entry);
};

export const logger = {
  debug: (message: string, metadata?: LogMetadata) => log('debug', message, metadata),
  info: (message: string, metadata?: LogMetadata) => log('info', message, metadata),
  warn: (message: string, metadata?: LogMetadata) => log('warn', message, metadata),
  error: (message: string, metadata?: LogMetadata) => log('error', message, metadata),
};

export type { LogMetadata };
