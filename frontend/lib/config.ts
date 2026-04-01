export interface Config {
  apiUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

function getConfig(): Config {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

  return {
    apiUrl,
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
}

export const config = getConfig();
