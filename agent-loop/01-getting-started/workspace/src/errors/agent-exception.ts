// @anchor:agent-exception
import { AgentErrorCode } from './agent-error-code.js';

export interface AgentExceptionOptions {
  retryable?: boolean;
  provider?: string;
  statusCode?: number;
  cause?: unknown;
}

export class AgentException extends Error {
  readonly code: AgentErrorCode;
  readonly retryable: boolean;
  readonly provider?: string;
  readonly statusCode?: number;

  constructor(
    code: AgentErrorCode,
    message: string,
    options: AgentExceptionOptions = {}
  ) {
    super(requireNonBlank(message, 'message'), { cause: options.cause });
    this.name = 'AgentException';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.provider = normalize(options.provider);
    this.statusCode = normalizeStatusCode(options.statusCode);
  }

  static invalidArgument(message: string, options: AgentExceptionOptions = {}) {
    return new AgentException(AgentErrorCode.InvalidArgument, message, options);
  }

  static invalidState(message: string, options: AgentExceptionOptions = {}) {
    return new AgentException(AgentErrorCode.InvalidState, message, options);
  }

  static configError(message: string, options: AgentExceptionOptions = {}) {
    return new AgentException(AgentErrorCode.ConfigError, message, options);
  }

  static streamError(message: string, options: AgentExceptionOptions = {}) {
    return new AgentException(AgentErrorCode.StreamError, message, options);
  }

  static internalError(message: string, options: AgentExceptionOptions = {}) {
    return new AgentException(AgentErrorCode.InternalError, message, options);
  }
}

export function isAgentException(error: unknown): error is AgentException {
  return error instanceof AgentException;
}

function requireNonBlank(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} must not be empty`);
  }
  return normalized;
}

function normalize(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeStatusCode(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 100 || value > 599) {
    throw new Error('statusCode must be an integer between 100 and 599');
  }
  return value;
}
