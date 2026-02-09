export function formatGamePin(pin: string): string {
  // Remove non-digits
  const digits = pin.replace(/\D/g, '');
  
  // Limit to 6 digits
  const limited = digits.slice(0, 6);
  
  // Format as XXX XXX
  if (limited.length > 3) {
    return `${limited.slice(0, 3)} ${limited.slice(3)}`;
  }
  
  return limited;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return remainingSeconds > 0 
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

export function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
