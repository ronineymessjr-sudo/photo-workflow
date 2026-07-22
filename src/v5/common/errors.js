export class AppError extends Error {
  constructor(code, message, details = {}, options = {}) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export function invariant(condition, code, message, details = {}) {
  if (!condition) throw new AppError(code, message, details);
}

export function asAppError(error, fallbackCode = 'UNEXPECTED_ERROR') {
  if (error instanceof AppError) return error;
  return new AppError(fallbackCode, error?.message || '发生未知错误', {}, { cause: error });
}
