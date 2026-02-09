import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

export function useKeyPress(targetKey: string, handler: KeyHandler) {
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        handler(event);
      }
    },
    [targetKey, handler]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
}

export function useKeyCombo(keys: string[], handler: KeyHandler) {
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      const isComboPressed = keys.every((key) => {
        if (key === 'ctrl') return event.ctrlKey;
        if (key === 'shift') return event.shiftKey;
        if (key === 'alt') return event.altKey;
        return event.key.toLowerCase() === key.toLowerCase();
      });

      if (isComboPressed) {
        event.preventDefault();
        handler(event);
      }
    },
    [keys, handler]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
}
