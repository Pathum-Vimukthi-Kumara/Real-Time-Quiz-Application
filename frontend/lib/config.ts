export interface Config {
  apiUrl: string;
  wsUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

function getConfig(): Config {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081/ws/quiz';
  
  return {
    apiUrl,
    wsUrl,
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
}

export const config = getConfig();
