export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = '网络连接失败，请检查网络设置') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = '认证失败，请重新登录') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class CouponError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'CouponError';
  }
}

export class MembershipError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'MembershipError';
  }
}

export function handleAPIError(error: unknown): Error {
  if (error instanceof APIError) {
    return error;
  }

  if (error instanceof Error) {
    const message = String(error.message).toLowerCase();
    
    if (message.indexOf('network') !== -1 || message.indexOf('fetch') !== -1) {
      return new NetworkError();
    }
    
    if (message.indexOf('unauthorized') !== -1 || message.indexOf('401') !== -1) {
      return new AuthenticationError();
    }
    
    if (message.indexOf('卡券') !== -1 || message.indexOf('coupon') !== -1) {
      return new CouponError(error.message);
    }
    
    if (message.indexOf('会员') !== -1 || message.indexOf('membership') !== -1) {
      return new MembershipError(error.message);
    }
    
    return error;
  }

  return new Error('未知错误');
}

export function getErrorMessage(error: unknown): string {
  const handledError = handleAPIError(error);
  return handledError.message;
}

export function getErrorCode(error: unknown): string | undefined {
  const handledError = handleAPIError(error);
  
  if (handledError instanceof APIError) {
    return handledError.code;
  }
  
  if (handledError instanceof CouponError) {
    return handledError.code;
  }
  
  if (handledError instanceof MembershipError) {
    return handledError.code;
  }
  
  return undefined;
}

export function isNetworkError(error: unknown): boolean {
  return handleAPIError(error) instanceof NetworkError;
}

export function isAuthError(error: unknown): boolean {
  return handleAPIError(error) instanceof AuthenticationError;
}

export function isCouponError(error: unknown): boolean {
  return handleAPIError(error) instanceof CouponError;
}

export function isMembershipError(error: unknown): boolean {
  return handleAPIError(error) instanceof MembershipError;
}

export function shouldRetry(error: unknown): boolean {
  const handledError = handleAPIError(error);
  
  if (handledError instanceof NetworkError) {
    return true;
  }
  
  if (handledError instanceof APIError) {
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    const statusCode = handledError.statusCode || 0;
    return retryableCodes.indexOf(statusCode) !== -1;
  }
  
  return false;
}

export function getErrorSeverity(error: unknown): 'low' | 'medium' | 'high' {
  const handledError = handleAPIError(error);
  
  if (handledError instanceof NetworkError) {
    return 'medium';
  }
  
  if (handledError instanceof AuthenticationError) {
    return 'high';
  }
  
  if (handledError instanceof APIError) {
    if (handledError.statusCode && handledError.statusCode >= 500) {
      return 'medium';
    }
    if (handledError.statusCode && handledError.statusCode >= 400) {
      return 'low';
    }
  }
  
  return 'low';
}
