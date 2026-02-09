import { useState, useEffect } from 'react';

export function useCountdown(initialTime: number, onComplete?: () => void) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    setTimeLeft(initialTime);
    setIsRunning(initialTime > 0);
  }, [initialTime]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      if (timeLeft === 0 && onComplete) {
        onComplete();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (onComplete) onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft, onComplete]);

  const reset = (newTime?: number) => {
    setTimeLeft(newTime ?? initialTime);
    setIsRunning((newTime ?? initialTime) > 0);
  };

  const pause = () => setIsRunning(false);
  const resume = () => setIsRunning(true);

  return { timeLeft, isRunning, reset, pause, resume };
}
