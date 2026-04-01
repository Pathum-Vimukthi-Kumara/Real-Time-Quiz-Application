export function validateEnv() {
  const requiredEnvVars = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  };

  const missing: string[] = [];
  const warnings: string[] = [];

  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
      missing.push(key);
    } else if (value.includes('localhost') && typeof window !== 'undefined') {
      warnings.push(`${key} is using localhost`);
    }
  });

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
  }

  if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn('Environment warnings:', warnings.join(', '));
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
}

/** @deprecated Realtime uses `/api/quiz-realtime` (TCP bridge). */
export function getWebSocketUrl(): string {
  return '';
}
