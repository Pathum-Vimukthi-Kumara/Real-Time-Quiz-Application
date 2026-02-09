'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
}

export default function PinInput({ 
  length = 6, 
  value, 
  onChange, 
  onComplete,
  autoFocus = false 
}: PinInputProps) {
  const [pins, setPins] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Initialize refs array
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  useEffect(() => {
    // Sync with parent value
    const digits = value.replace(/\D/g, '').split('');
    const newPins = Array(length).fill('');
    digits.slice(0, length).forEach((digit, i) => {
      newPins[i] = digit;
    });
    setPins(prev => {
      // Only update if value actually changed to avoid cascading renders
      const hasChanged = prev.some((p, i) => p !== newPins[i]);
      return hasChanged ? newPins : prev;
    });
  }, [value, length]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, digit: string) => {
    const newValue = digit.replace(/\D/g, '').slice(-1);
    const newPins = [...pins];
    newPins[index] = newValue;
    setPins(newPins);

    const pinString = newPins.join('');
    onChange(pinString);

    // Auto-focus next input
    if (newValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits are entered
    if (pinString.length === length && onComplete) {
      onComplete(pinString);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pins[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    const digits = pastedData.split('').slice(0, length);
    
    const newPins = [...pins];
    digits.forEach((digit, i) => {
      newPins[i] = digit;
    });
    setPins(newPins);

    const pinString = newPins.join('');
    onChange(pinString);

    // Focus last filled input
    const nextEmptyIndex = newPins.findIndex(p => !p);
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();

    if (pinString.length === length && onComplete) {
      onComplete(pinString);
    }
  };

  return (
    <div className="flex gap-3 justify-center" role="group" aria-label="Game PIN input">
      {pins.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-14 h-16 md:w-16 md:h-20 text-center text-3xl md:text-4xl font-bold bg-black/30 border-2 border-white/20 rounded-xl focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-400/20 transition-all"
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
